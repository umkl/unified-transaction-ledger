import { log } from "console";
import { TransactionsCacheDocuments } from "./transactionsCacheDocuments";
import { Command } from "commander";
import { rl } from "./infra";
const fs = require("fs").promises;
const path = require("path");

export default async function spreadsheetAction() {
  const transactionFile = await TransactionsCacheDocuments.create([
    "RAIFFEISEN_AT_RZBAATWW",
  ]);

  log("Create Spreadsheet with the Data");

  const transactions = transactionFile.getTransactions();

  const headers = Object.keys(transactions[0] || {}).join(",");
  const rows = transactions.map((t) => Object.values(t).join(","));
  const csv = [headers, ...rows].join("\n");

  const outputPath = path.join(process.cwd(), "all-transactions.csv");
  await fs.writeFile(outputPath, csv, "utf-8");
  log(`Transactions written to ${outputPath}`);
  rl.close();
}
