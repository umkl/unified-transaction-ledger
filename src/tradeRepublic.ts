import { confirm, input } from "@inquirer/prompts";
import fs from "fs";
import { trAuthRequest } from "./requests/trade-republic/authRequest";
import { trVerifyCodeRequest } from "./requests/trade-republic/verifyCodeRequest";
import { writeFile } from "fs/promises";
import { getConfigPath, readConfig, writeConfig } from "./lib/env";
import path from "path";
import type { TradeRepublicApi as TradeRepublicApiType } from "trapi";

type TrapiModule = typeof import("trapi");
const TRAPI_TIMEOUT_MS = 15_000;

async function loadTrapi(): Promise<TrapiModule> {
    return await import("trapi");
}

async function subscribeOnceJson<T>(
    api: TradeRepublicApiType,
    message: Record<string, unknown>,
    timeoutMs: number = TRAPI_TIMEOUT_MS,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let done = false;

        const tryExtractJson = (raw: string): string | null => {
            const firstBrace = raw.indexOf("{");
            const firstBracket = raw.indexOf("[");
            let start = -1;
            let end = -1;

            if (
                firstBracket !== -1 &&
                (firstBrace === -1 || firstBracket < firstBrace)
            ) {
                start = firstBracket;
                end = raw.lastIndexOf("]");
            } else if (firstBrace !== -1) {
                start = firstBrace;
                end = raw.lastIndexOf("}");
            }

            if (start !== -1 && end !== -1 && end > start) {
                return raw.slice(start, end + 1);
            }
            return null;
        };

        const finish = (err?: Error, value?: T) => {
            if (done) return;
            done = true;
            if (timeout) {
                clearTimeout(timeout);
            }
            if (subId !== -1) {
                api.unsubscribe(subId);
            }
            if (err) {
                reject(err);
            } else if (value !== undefined) {
                resolve(value);
            }
        };

        const subId = api.subscribe(message as any, (data) => {
            if (done) return;
            if (!data) {
                return;
            }
            const jsonPayload = tryExtractJson(data);
            if (!jsonPayload) {
                return;
            }
            try {
                const parsed = JSON.parse(jsonPayload) as T;
                finish(undefined, parsed);
            } catch {
                return;
            }
        });

        timeout = setTimeout(() => {
            finish(new Error(`Timed out waiting for TR API response`));
        }, timeoutMs);
    });
}

function extractTransactionDetails(payload: any): Record<string, string> {
    const transactionData: Record<string, string> = {};
    for (const section of payload?.sections || []) {
        if (section?.title === "Transaktion") {
            for (const item of section.data || []) {
                const key = item.title;
                const value = item.detail?.text;
                if (key && value) transactionData[key] = value;
            }
        }

        if (section?.action?.type === "instrumentDetail") {
            if (typeof section.action.payload === "string") {
                transactionData.ISIN = section.action.payload;
            }
        }
    }
    return transactionData;
}

async function fetchAllTransactionsViaTrapi(
    api: TradeRepublicApiType,
    createMessage: TrapiModule["createMessage"],
) {
    const allData: any[] = [];
    let afterCursor: string | undefined;

    while (true) {
        const timelineMessage = afterCursor
            ? createMessage(
                  "timelineTransactions",
                  { after: afterCursor } as any,
              )
            : createMessage("timelineTransactions");

        const timelineData = await subscribeOnceJson<any>(
            api,
            timelineMessage as any,
        );

        if (timelineData?.errors?.length > 0) {
            throw new Error(JSON.stringify(timelineData.errors));
        }

        const items = Array.isArray(timelineData?.items)
            ? timelineData.items
            : [];

        if (items.length === 0) {
            break;
        }

        for (const tx of items) {
            const txId = tx?.id;
            if (typeof tx?.status === "string" && tx.status.includes("CANCELED")) {
                continue;
            }
            if (txId) {
                const details = await subscribeOnceJson<any>(
                    api,
                    createMessage("timelineDetailV2", { id: txId } as any) as any,
                );
                Object.assign(tx, extractTransactionDetails(details));
            }
            allData.push(tx);
        }

        afterCursor = timelineData?.cursors?.after;
        if (!afterCursor) {
            break;
        }
    }

    return allData;
}

export default async function retrieveTransactionsFromTradeRepublic() {
    const config = await readConfig();
    let phone = process.env.TR_PHONE ?? config.TR_PHONE;

    if (!phone) {
        phone = await input({
            message: "Enter your phone number:",
            validate: () => true,
        });

        config.TR_PHONE = phone;
        process.env.TR_PHONE = phone;
        await writeConfig(config);
    }

    let pin = process.env.TR_PIN ?? config.TR_PIN;

    if (!pin) {
        pin = await input({
            message: "Enter your PIN (4 digits):",
            validate: (input) => {
                if (input.length !== 4) {
                    return "Please provide a PIN with a length of 4 digits";
                }
                return true;
            },
        });

        config.TR_PIN = pin;
        process.env.TR_PIN = pin;
        await writeConfig(config);
    }

    const { TradeRepublicApi, createMessage } = await loadTrapi();
    const configDir = path.dirname(getConfigPath());
    const cookiePath = path.join(configDir, "trapi-cookies.json");

    const api = new TradeRepublicApi(phone, pin, cookiePath);
    const loggedIn = await api.login(async () => {
        return await input({
            message: "Enter device PIN sent to your phone:",
        });
    });

    if (!loggedIn) {
        throw new Error("Trade Republic login failed");
    }

    const transactions = await fetchAllTransactionsViaTrapi(api, createMessage);

    const today = new Date().toISOString().split("T")[0];
    const responsePath = path.join(configDir, `response-tr-${today}.json`);
    const dedicatedPath = path.join(
        process.cwd(),
        "cache",
        "trade-republic-transactions.json",
    );

    await fs.promises.mkdir(path.dirname(responsePath), { recursive: true });
    await fs.promises.mkdir(path.dirname(dedicatedPath), { recursive: true });

    await writeFile(responsePath, JSON.stringify(transactions, null, 2));
    await writeFile(dedicatedPath, JSON.stringify(transactions, null, 2));

    return transactions;
}

async function authenticate(pin: string, phone: string): Promise<string> {
    const result = await trAuthRequest(pin, phone);

    console.log(result);

    const processId = result.processId;
    const countdown = result.countdownInSeconds;
    if (!processId) {
        console.error("Error - Invalid PIN or phone number");
        process.exit(1);
    }

    const code = await input({
        message: `Enter Pin (${countdown}s):`,
    });

    const sessionCookie = await trVerifyCodeRequest(code, processId);
    const sessionToken = sessionCookie.split(";")[0].split("=")[1];
    return sessionToken;
}


export async function fetchAccountInformation(): Promise<any> {
    const config = await readConfig();
    let phone = process.env.TR_PHONE ?? config.TR_PHONE;

    if (!phone) {
        phone = await input({
            message: "Enter your phone number:",
            validate: (input) => {
                return true;
            },
        });

        config.TR_PHONE = phone;
        process.env.TR_PHONE = phone;
        await writeConfig(config);
    }

    let pin = process.env.TR_PIN ?? config.TR_PIN;

    if (!pin) {
        pin = await input({
            message: "Enter your PIN (4 digits):",
            validate: (input) => {
                if (input.length !== 4) {
                    return "Please provide a PIN with a length of 4 digits";
                }
                return true;
            },
        });

        config.TR_PIN = pin;
        process.env.TR_PIN = pin;
        await writeConfig(config);
        console.log(`Updated config at ${getConfigPath()}`);
    }

    const { TradeRepublicApi, createMessage } = await loadTrapi();
    const configDir = path.dirname(getConfigPath());
    const cookiePath = path.join(configDir, "trapi-cookies.json");

    const api = new TradeRepublicApi(phone, pin, cookiePath);
    const loggedIn = await api.login(async () => {
        return await input({
            message: "Enter device PIN sent to your phone:",
        });
    });

    if (!loggedIn) {
        throw new Error("Trade Republic login failed");
    }

    const accountPairs = await subscribeOnceJson<any>(
        api,
        createMessage("accountPairs") as any,
    );
    const secAccNo = accountPairs?.accounts?.[0]?.securitiesAccountNumber;
    if (!secAccNo) {
        throw new Error(
            "Missing securitiesAccountNumber in accountPairs response",
        );
    }

    const cash = await subscribeOnceJson<any>(
        api,
        createMessage("cash") as any,
    );

    const portfolioResponse = await subscribeOnceJson<any>(
        api,
        createMessage("compactPortfolioByType", { secAccNo } as any) as any,
    );

    const positions =
        portfolioResponse?.categories?.flatMap(
            (category: any) => category.positions || [],
        ) || [];

    const tickerResults: Record<string, unknown> = {};
    let portfolioValue = 0;
    for (const position of positions) {
        const isin = position?.isin;
        if (!isin) continue;
        const tickerId = `${isin}.LSX`;
        const tickerResponse = await subscribeOnceJson<any>(
            api,
            createMessage("ticker", { id: tickerId } as any) as any,
        );
        tickerResults[isin] = tickerResponse;
        const prePrice = Number(tickerResponse?.pre?.price ?? 0);
        const size = Number(position?.netSize ?? 0);
        if (!Number.isNaN(prePrice) && !Number.isNaN(size)) {
            portfolioValue += prePrice * size;
        }
    }

    return {
        cash,
        portfolio: {
            positions,
            tickers: tickerResults,
            value: portfolioValue,
        },
    };
}
