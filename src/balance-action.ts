import { checkbox } from "@inquirer/prompts";
import { brokerizePortfolioRequest } from "./requests/brokerize/portfolioRequest";
import getSupportedInstitutions from "./supported";
import { fetchAccountInformation } from "./tradeRepublic";
import { readConfig } from "./lib/env";
import {
    BalanceSnapshots,
    BankBalance,
    computeTotalBalance,
    toDateKey,
} from "./Balance";
import { log } from "./utils";
import { Requisitions } from "./Requisitions";
import { listAccounts } from "./requests/list-accounts";
import { listBalancesRequest } from "./requests/account-balances";

const DEFAULT_CURRENCY = "EUR";

const parseAmount = (value: unknown): number | undefined => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value.replace(",", "."));
        if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
};

const extractAmount = (source: unknown, keys: string[]) => {
    if (!source || typeof source !== "object") return undefined;
    if (Array.isArray(source)) {
        const first = source[0] as Record<string, unknown> | undefined;
        if (!first) return undefined;
        return (
            parseAmount(first.amount) ??
            parseAmount(first.value) ??
            parseAmount(first.balance) ??
            parseAmount(first.cash)
        );
    }
    const record = source as Record<string, unknown>;
    for (const key of keys) {
        const value = record[key];
        const direct = parseAmount(value);
        if (direct !== undefined) return direct;
        if (value && typeof value === "object") {
            const nestedRecord = value as Record<string, unknown>;
            const nested =
                parseAmount(nestedRecord.amount) ??
                parseAmount(nestedRecord.value) ??
                parseAmount(nestedRecord.balance) ??
                parseAmount(nestedRecord.cash);
            if (nested !== undefined) return nested;
        }
    }
    return undefined;
};

const demoBalance = (bankId: string): BankBalance => ({
    bankId,
    balance: 0,
    currency: DEFAULT_CURRENCY,
});

const pickGocardlessBalance = (balances: any[]) => {
    if (!Array.isArray(balances) || balances.length === 0) return undefined;
    return (
        balances.find((entry) => entry.balanceType === "interimAvailable") ??
        balances[0]
    );
};

export default async function balanceAction() {
    const institutions = await getSupportedInstitutions();

    const results = institutions.map((inst) => ({
        name: inst.name,
        value: inst.id,
        checked: false,
    }));

    const checkedInstitutions = await checkbox({
        message: "Select your institutions:",
        choices: results,
        required: true,
    });

    const config = await readConfig();
    const requisitionsDocument = await Requisitions.create();
    const balances: BankBalance[] = [];

    for (const insti of checkedInstitutions) {
        if (insti === "TRADE_REPUBLIC") {
            const res = (await fetchAccountInformation()) as any;
            const cashValue = extractAmount(res?.cash, [
                "availableCash",
                "cashBalance",
                "balance",
                "available",
                "cash",
                "amount",
                "value",
            ]);
            const portfolioValue = parseAmount(res?.portfolio?.value);

            if (cashValue === undefined) {
                log(
                    "Trade Republic cash balance not found; using 0 demo value",
                );
            }
            if (portfolioValue === undefined) {
                log(
                    "Trade Republic portfolio value not found; using 0 demo value",
                );
            }

            balances.push({
                bankId: "TRADE_REPUBLIC_CASH",
                balance: cashValue ?? 0,
                currency: DEFAULT_CURRENCY,
            });
            balances.push({
                bankId: "TRADE_REPUBLIC_PORTFOLIO",
                balance: portfolioValue ?? 0,
                currency: DEFAULT_CURRENCY,
            });
        }

        if (insti === "FLATEX") {
            const portfolioId = config.BRZ_PORTFOLIO_ID;
            const accessToken = config.BRZ_ACCESS_TOKEN;
            const clientId = config.BRZ_CLIENT_ID;
            if (!portfolioId || !accessToken || !clientId) {
                log("Missing Flatex Brokerize config; using demo values");
                balances.push(demoBalance("FLATEX_CASH"));
                balances.push(demoBalance("FLATEX_PORTFOLIO"));
                continue;
            }

            const response = await brokerizePortfolioRequest(
                portfolioId,
                accessToken,
                clientId,
            );

            const quotes = (response as any)?.quotes;
            const cashValue =
                extractAmount(quotes, ["cashAccountBalance"]) ??
                extractAmount(quotes, ["availableCash"]) ??
                extractAmount(response, [
                    "cash",
                    "cashBalance",
                    "availableCash",
                    "balance",
                    "amount",
                    "value",
                ]);
            const portfolioValue =
                extractAmount(quotes, ["positionValue"]) ??
                extractAmount(quotes, ["totalValue"]) ??
                extractAmount(response, [
                    "portfolio",
                    "portfolioValue",
                    "totalValue",
                    "value",
                ]);

            if (cashValue === undefined) {
                log("Flatex cash balance not found; using 0 demo value");
            }
            if (portfolioValue === undefined) {
                log("Flatex portfolio value not found; using 0 demo value");
            }

            balances.push({
                bankId: "FLATEX_CASH",
                balance: cashValue ?? 0,
                currency: DEFAULT_CURRENCY,
            });
            balances.push({
                bankId: "FLATEX_PORTFOLIO",
                balance: portfolioValue ?? 0,
                currency: DEFAULT_CURRENCY,
            });
        }

        if (
            insti === "RAIFFEISEN_AT_RZBAATWW" ||
            insti === "REVOLUT_REVOLT21" ||
            insti === "N26_NTSBDEB1"
        ) {
            const bankId =
                insti === "RAIFFEISEN_AT_RZBAATWW"
                    ? "RAIFFEISEN_CASH"
                    : insti === "REVOLUT_REVOLT21"
                      ? "REVOLUT_CASH"
                      : "N26_CASH";
            try {
                const accessToken = process.env["GCL_ACCESS_TOKEN"];
                if (!accessToken) {
                    log("Missing GCL_ACCESS_TOKEN; using demo values");
                    balances.push(demoBalance(bankId));
                    continue;
                }
                const reqId =
                    await requisitionsDocument.getRequisitionId(insti);
                const accounts = await listAccounts(accessToken, reqId);
                const accountId = accounts?.[0];
                if (!accountId) {
                    log(`No accounts found for ${insti}; using demo values`);
                    balances.push(demoBalance(bankId));
                    continue;
                }
                const response = await listBalancesRequest(
                    accessToken,
                    accountId,
                    insti,
                );
                if (insti === "N26_NTSBDEB1") {
                    console.log(
                        "N26 balance response:",
                        JSON.stringify(response, null, 2),
                    );
                }
                const picked = pickGocardlessBalance(response?.balances ?? []);
                const amount = parseAmount(picked?.balanceAmount?.amount) as
                    | number
                    | undefined;
                const currency =
                    picked?.balanceAmount?.currency ?? DEFAULT_CURRENCY;
                if (amount === undefined) {
                    log(`Missing ${insti} balance amount; using demo values`);
                    balances.push(demoBalance(bankId));
                    continue;
                }
                balances.push({
                    bankId,
                    balance: amount,
                    currency,
                });
            } catch (err) {
                console.log(err);
                log(`Failed fetching ${insti} balance; using demo values`);
                balances.push(demoBalance(bankId));
            }
        }
    }

    const snapshotDate = toDateKey();
    const snapshot = {
        date: snapshotDate,
        balances,
        totalBalance: computeTotalBalance(balances),
    };

    const snapshots = await BalanceSnapshots.create();
    snapshots.upsertSnapshot(snapshot);
    await snapshots.persist();

    log(`Balance snapshot saved for ${snapshotDate}`);
}
