const fs = require("fs");
const readline = require("readline");
const https = require("https");
const { parse } = require("ini");
const WebSocket = require("ws");
const { createObjectCsvWriter } = require("csv-writer");

// === KONFIGURATION ===
const CONFIG_FILE = "config.ini";
let config = {};

if (!fs.existsSync(CONFIG_FILE)) {
  console.error("❌ config.ini Datei nicht gefunden.");
  process.exit(1);
}
const configRaw = fs.readFileSync(CONFIG_FILE, "utf-8");
config = parse(configRaw);

const phoneNumber = config.secret.phone_number;
const pin = config.secret.pin;

// POST REQUEST
function post(url, data, headers = {}) {
  const urlObj = new URL(url);
  const options = {
    method: "POST",
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(JSON.stringify(data)),
      ...headers,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({ res, body: JSON.parse(body || "{}") });
      });
    });
    req.on("error", reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// AUTHENTIFIZIERUNG
async function authenticate() {
  console.log("🔐 Verbindung zur TradeRepublic API...");
  const { res, body } = await post(
    "https://api.traderepublic.com/api/v1/auth/web/login",
    { phoneNumber, pin }
  );

  const processId = body.processId;
  const countdown = body.countdownInSeconds;
  if (!processId) {
    console.error("❌ Initialisierung fehlgeschlagen. Ungültige Nummer oder PIN?");
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) => new Promise((resolve) => rl.question(question, resolve));
  let code = await ask(`❓ Geben Sie den erhaltenen 2FA-Code ein (${countdown}s) oder tippen Sie 'SMS': `);
  if (code.toUpperCase() === "SMS") {
    await post(`https://api.traderepublic.com/api/v1/auth/web/login/${processId}/resend`, {});
    code = await ask("❓ Geben Sie den per SMS erhaltenen 2FA-Code ein: ");
  }
  rl.close();

  const verifyUrl = `https://api.traderepublic.com/api/v1/auth/web/login/${processId}/${code}`;
  const { res: verifyRes } = await post(verifyUrl, {});
  if (verifyRes.statusCode !== 200) {
    console.error("❌ Geräteüberprüfung fehlgeschlagen.");
    process.exit(1);
  }

  const setCookie = verifyRes.headers["set-cookie"] || [];
  const sessionCookie = setCookie.find((c) => c.startsWith("tr_session="));
  if (!sessionCookie) {
    console.error("❌ Sitzungs-Cookie nicht gefunden.");
    process.exit(1);
  }

  const sessionToken = sessionCookie.split(";")[0].split("=")[1];
  console.log("✅ Erfolgreich authentifiziert!");
  return sessionToken;
}

// TRANSAKTIONEN ABRUFEN
async function fetchAllTransactions(token) {
  const ws = new WebSocket("wss://api.traderepublic.com");

  const allData = [];
  let messageId = 0;
  let afterCursor = null;

// Hilfsfunktion: Auf eine einzelne WebSocket-Nachricht warten
  const waitForMessage = () =>
    new Promise((resolve) => ws.once("message", (data) => {
      const msg = data.toString();
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📩 WebSocket Nachricht erhalten (${msg.length} Zeichen)`);
      console.log(`${'='.repeat(80)}`);
      
      // Try to parse and pretty-print JSON
      try {
        const cleanedMsg = cleanJson(msg);
        const parsed = JSON.parse(cleanedMsg);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        // If not valid JSON, show raw message
        console.log(msg);
      }
      
      console.log(`${'='.repeat(80)}\n`);
      resolve(msg);
    }));

  // Bereinigt fehlerhafte JSON-Antworten
  const cleanJson = (msg) => {
    const start = msg.indexOf("{");
    const end = msg.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return msg.slice(start, end + 1);
    }
    return "{}";
  };

  return new Promise((resolve, reject) => {
    ws.on("open", async () => {
      try {
        const localeConfig = {
          locale: "de",
          platformId: "webtrading",
          platformVersion: "safari - 18.3.0",
          clientId: "app.traderepublic.com",
          clientVersion: "3.151.3",
        };

        console.log("🔌 WebSocket Verbindung wird aufgebaut...");
        ws.send(`connect 31 ${JSON.stringify(localeConfig)}`);
        await waitForMessage(); // Verbindungsbestätigung

        console.log("✅ WebSocket verbunden");

        let pageCount = 0;
        while (true) {
          pageCount++;
          console.log(`📄 Lade Transaktionsseite ${pageCount}...`);

          const payload = {
            type: "timelineTransactions",
            token,
          };
          if (afterCursor) {
            payload.after = afterCursor;
          }

          messageId++;
          ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
          const subResponse = await waitForMessage();

          ws.send(`unsub ${messageId}`);
          await waitForMessage(); // Abmeldungsbestätigung

          const cleaned = cleanJson(subResponse);
          const jsonData = JSON.parse(cleaned);

          if (!jsonData.items || jsonData.items.length === 0) {
            console.log("✅ Alle Transaktionen geladen");
            break;
          }

          console.log(`📊 ${jsonData.items.length} Transaktionen auf dieser Seite gefunden`);

          for (const tx of jsonData.items) {
            const txId = tx.id;
            // Überspringe stornierte Transaktionen
            if (tx?.status && tx.status.includes('CANCELED')) {
              console.log(`⏭️  Überspringe stornierte Transaktion: ${txId}`);
              continue;
            }
            if (txId) {
              console.log(`🔍 Lade Details für Transaktion: ${txId}`);
              const [details, newMsgId] = await fetchTransactionDetails(ws, txId, token, messageId);
              messageId = newMsgId;
              Object.assign(tx, details);
            }
            allData.push(tx);
          }

          afterCursor = jsonData.cursors?.after;
          if (!afterCursor) {
            break;
          }
          console.log(`➡️  Nächste Seite wird geladen (Cursor: ${afterCursor.substring(0, 20)}...)`);
        }

        console.log(`✅ Insgesamt ${allData.length} Transaktionen geladen`);
        ws.close();
        resolve(allData);
      } catch (err) {
        console.error("❌ Fehler beim Abrufen der Transaktionen:", err);
        ws.close();
        reject(err);
      }
    });

    ws.on("error", (err) => {
      console.error("❌ WebSocket Fehler:", err);
      reject(err);
    });
  });
}

// TRANSAKTIONSDETAILS ABRUFEN
async function fetchTransactionDetails(ws, transactionId, token, messageId) {
  messageId++;
  const payload = {
    type: "timelineDetailV2",
    id: transactionId,
    token,
  };

  // Hilfsfunktion: Auf eine einzelne WebSocket-Nachricht warten
  const waitForMessage = () =>
    new Promise((resolve) => ws.once("message", (data) => {
      const msg = data.toString();
      console.log(`  📩 Detail-Nachricht erhalten (${msg.length} Zeichen)`);
      resolve(msg);
    }));

  // Bereinigt fehlerhafte JSON-Antworten
  const cleanJson = (msg) => {
    const start = msg.indexOf("{");
    const end = msg.lastIndexOf("}");
    if (start !== -1 && end !== -1) {
      return msg.slice(start, end + 1);
    }
    return "{}";
  };

  ws.send(`sub ${messageId} ${JSON.stringify(payload)}`);
  const subResponse = await waitForMessage();
  ws.send(`unsub ${messageId}`);
  await waitForMessage(); // Abmeldungsbestätigung

  const cleaned = cleanJson(subResponse);
  const jsonData = JSON.parse(cleaned);

  const transactionData = {};
  for (const section of jsonData.sections || []) {
    if (section.title === "Transaktion") {
      for (const item of section.data || []) {
        const key = item.title;
        const value = item.detail?.text;
        if (key && value) transactionData[key] = value;
      }
    }

    if (section?.action?.type === "instrumentDetail") {
      // ISIN abrufen
      transactionData.ISIN = section.action.payload;
    }
  }

  return [transactionData, messageId];
}

// FORMATIERUNG & EXPORT
function parseTransactionDetails(tx) {
  const row = {};

  row.Datum = new Date(tx.timestamp).toISOString().split('T')[0];
  row.Typ = getTypeFromEvent(tx.eventType, tx.subtitle);
  row.Titel = tx.title || "";
  row.ISIN = tx.ISIN || "";
  row.Notiz = tx.subtitle || "";
  row.Menge = parseAmount(tx.Anteile || tx.Aktien || tx.Titres || tx.Actions || "0");
  row.Gesamt = tx.amount?.value || 0;
  row.Währung = tx.amount?.currency || "EUR";
  row.Gebühren = parseAmount(tx.Gebühren || tx.Frais || "0");
  row.Steuern = parseAmount(tx.Steuern || tx.Impôts || "0");

  return row;
}

function getTypeFromEvent(eventType, subtitle) {
  // Sichere Prüfung mit Default-Werten
  const safeEventType = eventType || "";
  const lower = (subtitle || "").toLowerCase();

  if (safeEventType.includes("SAVINGS_PLAN") || 
      safeEventType.includes("trading_savingsplan_executed") || 
      lower.includes("kauf") || 
      lower.includes("achat")) {
    return "Kauf";
  }
  if (lower.includes("verkauf") || lower.includes("vente")) {
    return "Verkauf";
  }
  if (lower.includes("ausschüttung") || 
      lower.includes("dividende") || 
      lower.includes("distribution") || 
      safeEventType === "CREDIT") {
    return "Dividenden";
  }
  if (safeEventType.includes("INTEREST")) {
    return "Zinsen";
  }
  if (safeEventType.includes("PAYMENT_INBOUND") || 
      safeEventType.includes("INCOMING_TRANSFER_DELEGATION")) {
    return "Einzahlung";
  }
  if (safeEventType.includes("PAYMENT_OUTBOUND") || 
      safeEventType.includes("OUTGOING_TRANSFER_DELEGATION")) {
    return "Auszahlung";
  }

  console.log(`⚠️  Unbekannter Transaktionstyp: ${safeEventType}, Untertitel: ${subtitle}`);
  return "Sonstige";
}

function parseAmount(text) {
  if (!text || text === 'Kostenlos' || text === 'Gratuit') {
    return 0;
  }
  const cleaned = text
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

async function exportToPortfolioPerformance(transactions) {
  const csvWriter = createObjectCsvWriter({
    path: `./portfolio_performance_export.csv`,
    header: [
      { id: "Datum", title: "Datum" },
      { id: "Typ", title: "Typ" },
      { id: "Titel", title: "Wertpapiername" },
      { id: "ISIN", title: "ISIN" },
      { id: "Notiz", title: "Notiz" },
      { id: "Menge", title: "Anteile" },
      { id: "Währung", title: "Transaktionswährung" },
      { id: "Gebühren", title: "Gebühren" },
      { id: "Steuern", title: "Steuern" },
      { id: "Gesamt", title: "Wert" },
    ],
    fieldDelimiter: ";",
    encoding: "utf8",
  });

  await csvWriter.writeRecords(transactions);
  console.log("✅ Portfolio Performance Export erstellt!");
}

// HAUPTPROGRAMM
(async () => {
  try {
    console.log("🚀 TradeRepublic Export-Tool gestartet\n");
    
    const token = await authenticate();
    console.log("\n📥 Starte Transaktionsabruf...\n");
    
    const data = await fetchAllTransactions(token);
    console.log(`\n📊 ${data.length} Transaktionen abgerufen\n`);
    
    const formatted = [];
    let skipped = 0;
    
    for (const tx of data) {
      if (!tx.amount || tx.amount.value === 0) {
        skipped++;
        continue;
      }
      const row = parseTransactionDetails(tx);
      formatted.push(row);
    }
    
    console.log(`✅ ${formatted.length} Transaktionen formatiert (${skipped} übersprungen)\n`);
    
    await exportToPortfolioPerformance(formatted);
    console.log("\n🎉 Export erfolgreich abgeschlossen!");
    
  } catch (error) {
    console.error("\n❌ Fehler beim Export:", error);
    process.exit(1);
  }
})();