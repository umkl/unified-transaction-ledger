import WebSocket from "ws";
import { cleanJson } from "./lib/clean-json";

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
