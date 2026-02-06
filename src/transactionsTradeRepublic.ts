import WebSocket from "ws";
import { cleanJson } from "./lib/clean-json";
import { fetchTransactionDetails } from "./transactionDetailsTradeRepublic";
import { writeFile } from "fs/promises";

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
              // const [details, newMsgId] = await fetchTransactionDetails(
              //   ws,
              //   txId,
              //   token,
              //   messageId,
              // );
              // messageId = newMsgId;
              // Object.assign(tx, details);
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
