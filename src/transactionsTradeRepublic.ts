import WebSocket from "ws";
import { cleanJson } from "./lib/clean-json";

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
          console.log(JSON.stringify(parsed, null, 2));
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
          locale: "de",
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
          console.log("page:", pageCount);
          console.log("loading page");
          const payload: any = {
            type: "timelineTransactions",
            token,
          };
          if (afterCursor) {
            payload.after = afterCursor;
          }

          messageId++;
          ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
          const subResponse: any = await waitForMessage();
          ws.send(`unsub ${messageId}`);
          await waitForMessage();

          const cleaned = cleanJson(subResponse);
          const jsonData = JSON.parse(cleaned);
          console.log(jsonData);

          // if (!jsonData.items || jsonData.items.length === 0) {
          //   console.log("✅ Alle Transaktionen geladen");
          //   break;
          // }

          // console.log(
          //   `📊 ${jsonData.items.length} Transaktionen auf dieser Seite gefunden`,
          // );

          // for (const tx of jsonData.items) {
          //   const txId = tx.id;
          //   // Überspringe stornierte Transaktionen
          //   if (tx?.status && tx.status.includes("CANCELED")) {
          //     console.log(`⏭️  Überspringe stornierte Transaktion: ${txId}`);
          //     continue;
          //   }
          //   if (txId) {
          //     console.log(`🔍 Lade Details für Transaktion: ${txId}`);
          //     const [details, newMsgId] = await fetchTransactionDetails(
          //       ws,
          //       txId,
          //       token,
          //       messageId,
          //     );
          //     messageId = newMsgId;
          //     Object.assign(tx, details);
          //   }
          //   allData.push(tx);
          // }

          afterCursor = jsonData.cursors?.after;
          if (!afterCursor) {
            break;
          }
          console.log(
            `➡️  Nächste Seite wird geladen (Cursor: ${afterCursor.substring(0, 20)}...)`,
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
    if (!ws.onerror) return;
    ws.addEventListener("error", (err) => {
      console.error("WebSocket Fehler:", err);
      reject(err);
    });
  });
}

// // TRANSAKTIONSDETAILS ABRUFEN
// async function fetchTransactionDetails(ws, transactionId, token, messageId) {
//   messageId++;
//   const payload = {
//     type: "timelineDetailV2",
//     id: transactionId,
//     token,
//   };

//   // Hilfsfunktion: Auf eine einzelne WebSocket-Nachricht warten
//   const waitForMessage = () =>
//     new Promise((resolve) =>
//       ws.once("message", (data) => {
//         const msg = data.toString();
//         console.log(`  📩 Detail-Nachricht erhalten (${msg.length} Zeichen)`);
//         resolve(msg);
//       }),
//     );

//   // Bereinigt fehlerhafte JSON-Antworten
//   const cleanJson = (msg) => {
//     const start = msg.indexOf("{");
//     const end = msg.lastIndexOf("}");
//     if (start !== -1 && end !== -1) {
//       return msg.slice(start, end + 1);
//     }
//     return "{}";
//   };

//   ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
//   const subResponse = await waitForMessage();
//   ws.send(`unsub ${messageId}`);
//   await waitForMessage(); // Abmeldungsbestätigung

//   const cleaned = cleanJson(subResponse);
//   const jsonData = JSON.parse(cleaned);

//   const transactionData = {};
//   for (const section of jsonData.sections || []) {
//     if (section.title === "Transaktion") {
//       for (const item of section.data || []) {
//         const key = item.title;
//         const value = item.detail?.text;
//         if (key && value) transactionData[key] = value;
//       }
//     }

//     if (section?.action?.type === "instrumentDetail") {
//       // ISIN abrufen
//       transactionData.ISIN = section.action.payload;
//     }
//   }

//   return [transactionData, messageId];
// }
