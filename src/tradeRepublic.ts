import { confirm, input } from "@inquirer/prompts";
import { log } from "console";
import fs from "fs";
import { trAuthRequest } from "./requests/trade-republic/authRequest";
import { trVerifyCodeRequest } from "./requests/trade-republic/verifyCodeRequest";
import { getEnvContent } from "./lib/env-content";
import { writeFile } from "fs/promises";
import { cleanJson } from "./lib/clean-json";
import WebSocket from "ws";
export default async function retrieveTransactionsFromTradeRepublic() {
  let phone = process.env.TR_PHONE;

  const envFileContent = await getEnvContent();

  if (!phone) {
    phone = await input({
      message: "Enter your phone number:",
      validate: (input) => {
        return true;
      },
    });

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_PHONE=${phone}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
  }

  let pin = process.env.TR_PIN;

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

    const envFileContent = await getEnvContent();

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_PIN=${pin}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
    log("Updated/Created .env file with new credentials.");
  }

  let jwt = process.env.TR_JWT;

  console.log("JWT");
  console.log(jwt);

  const fetchNewJWT = await confirm({
    message: "Do you want to fetch a new JWT?",
  });

  if (!jwt || fetchNewJWT) {
    jwt = await authenticate(pin, phone);

    const envFileContent = await getEnvContent();

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_JWT=${jwt}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
  }

  try {
    const transactions = await fetchAllTransactions(jwt);

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() +
          `/cache/response-tr-${new Date().toISOString().split("T")[0]}.json`,
        JSON.stringify(transactions, null, 2),
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });

    return transactions;
  } catch (e) {
    throw e;
  }
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

export async function fetchTransactionDetails(
  ws: WebSocket,
  transactionId: string,
  token: string,
  messageId: number,
) {
  messageId++;
  const payload = {
    type: "timelineDetailV2",
    id: transactionId,
    token,
  };

  const waitForMessage = () =>
    new Promise((resolve) =>
      ws.once("message", (data) => {
        const msg = data.toString();
        console.log(`  📩 Detail-Nachricht erhalten (${msg.length} Zeichen)`);
        resolve(msg);
      }),
    );

  ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
  const subResponse: any = await waitForMessage();
  ws.send(`unsub ${messageId}`);
  await waitForMessage();

  const cleaned = cleanJson(subResponse);
  const jsonData = JSON.parse(cleaned);

  const transactionData: any = {};
  for (const section of jsonData.sections || []) {
    console.log("DETAIL DATA");
    console.log(JSON.stringify(section));
    if (section.title === "Transaktion") {
      for (const item of section.data || []) {
        const key = item.title;
        const value = item.detail?.text;
        if (key && value) transactionData[key] = value;
      }
    }

    if (section?.action?.type === "instrumentDetail") {
      transactionData.ISIN = section.action.payload as string;
    }
  }

  return [transactionData, messageId];
}

// TRANSAKTIONEN ABRUFEN
export async function fetchAllTransactions(token: string) {
  const ws = new WebSocket("wss://api.traderepublic.com");

  const allData: any = [];
  let messageId = 0;
  let afterCursor: any = null;

  const waitForMessage = () =>
    new Promise((resolve) =>
      ws.once("message", (data) => {
        const msg = data.toString();
        try {
          const cleanedMsg = cleanJson(msg);
          const parsed = JSON.parse(cleanedMsg);
          console.log("parsed");
        } catch (e) {
          console.log("raw:");
          console.log(msg);
        }
        resolve(msg);
      }),
    );

  return new Promise((resolve, reject) => {
    if (!ws) return;

    ws.addEventListener("open", async (event) => {
      try {
        const localeConfig = {
          locale: "en",
          platformId: "webtrading",
          platformVersion: "safari - 18.3.0",
          clientId: "app.traderepublic.com",
          clientVersion: "3.151.3",
        };

        ws.send(`connect 31 ${JSON.stringify(localeConfig)}`);
        await waitForMessage();

        let pageCount = 0;
        while (true) {
          pageCount++;
          const payload: any = {
            type: "timelineTransactions",
            token,
          };
          if (afterCursor) {
            payload.after = afterCursor;
          }
          messageId++;
          ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
          console.log("loading data");
          const subResponse: any = await waitForMessage();
          ws.send(`unsub ${messageId}`);
          await waitForMessage();
          const cleaned = cleanJson(subResponse);
          const jsonData = JSON.parse(cleaned);

          console.log(jsonData.errors);

          if (jsonData?.errors?.length > 0) {
            reject(new Error(JSON.stringify(jsonData.errors)));
          }

          console.log(
            JSON.stringify(
              jsonData,
              (key, value) => {
                // If the value is an object and not the root, label it instead of expanding
                return typeof value === "object" && value !== null && key !== ""
                  ? "[Object]"
                  : value;
              },
              2,
            ),
          );

          if (!jsonData.items || jsonData.items.length === 0) {
            console.log("✅ Alle Transaktionen geladen");
            break;
          }
          console.log(`${jsonData.items.length} transactions loaded`);
          for (const tx of jsonData.items) {
            const txId = tx.id;
            // Überspringe stornierte Transaktionen
            if (tx?.status && tx.status.includes("CANCELED")) {
              console.log(`skip cancelled transaction: ${txId}`);
              continue;
            }
            if (txId) {
              // console.log(`🔍 Lade Details für Transaktion: ${txId}`);
              const [details, newMsgId] = await fetchTransactionDetails(
                ws,
                txId,
                token,
                messageId,
              );
              messageId = newMsgId;
              Object.assign(tx, details);
            }
            allData.push(tx);
          }

          afterCursor = jsonData.cursors?.after;
          if (!afterCursor) {
            break;
          }
          console.log(
            `next page about to be loaded (Cursor: ${afterCursor.substring(0, 20)}...)`,
          );
        }

        console.log("loaded all data");
        ws.close();

        resolve(allData);
      } catch (err) {
        console.error("websocket err");
        ws.close();
        reject(err);
      }
    });
    ws.addEventListener("error", (err) => {
      console.error("WebSocket Fehler:", err);
      reject(err);
    });
  });
}
