import { existsSync } from "node:fs";
import { TradeRepublicApi, createMessage } from "trapi";

const phoneNumber = process.env.TR_PHONE_NUMBER;
const pin = process.env.TR_PIN;

if (!phoneNumber || !pin) {
    throw new Error(
        "Missing TR_PHONE_NUMBER or TR_PIN. Set both env vars before running.",
    );
}

const chromeCandidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
];

if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
    const chromePath = chromeCandidates.find((p) => existsSync(p));
    if (chromePath) {
        process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
        console.log("Using system Chrome:", chromePath);
    }
}

async function main() {
    const api = new TradeRepublicApi(phoneNumber, pin);
    await api.login();

    const balanceMessage = createMessage("cash");
    api.subscribeOnce(balanceMessage, (data) => {
        if (!data) {
            return;
        }

        let payload: unknown;
        if (typeof data === "string") {
            try {
                payload = JSON.parse(data);
            } catch (err) {
                console.error("RAW_BALANCE_DATA", data);
                console.error("BALANCE_JSON_PARSE_ERROR", err);
                return;
            }
        } else {
            payload = data;
        }

        const amount =
            (payload as any)?.availableCash?.value ??
            (payload as any)?.availableCash?.amount ??
            (payload as any)?.cash?.availableCash?.value ??
            (payload as any)?.cash?.availableCash ??
            (payload as any)?.availableCash;

        console.log("RAW_BALANCE_PAYLOAD", payload);
        console.log("AVAILABLE_CASH", amount ?? "n/a");
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
