import { log } from "console";
import { TransactionsCacheDocuments } from "./TransactionDocument";
import { Command } from "commander";
import { rl } from "./infra";
import { input } from "@inquirer/prompts";
const fs = require("fs").promises;
const path = require("path");
import supported from "./const/supported.json";

export default async function spreadsheetAction() {
  const transactionFile = await TransactionsCacheDocuments.create();

  log("Create Spreadsheet with the Data");
  const yearInput = await input({
    message:
      "Enter the year for the transactions to include (leave blank for all years):",
    validate: (input) => {
      if (!input.trim()) return true;
      const year = parseInt(input, 10);
      if (isNaN(year) || year < 1900 || year > 2100) {
        return "Please enter a valid year between 1900 and 2100, or leave blank.";
      }
      return true;
    },
  });
  const monthInput = await input({
    message:
      "Enter the month (1-12) for the transactions to include (leave blank for all months):",
    validate: (input) => {
      if (!input.trim()) return true;
      const month = parseInt(input, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        return "Please enter a valid month between 1 and 12, or leave blank.";
      }
      return true;
    },
  });

  const year = yearInput.trim() ? parseInt(yearInput, 10) : undefined;
  const month = monthInput.trim() ? parseInt(monthInput, 10) : undefined;

  const transactions = transactionFile.getTransactions(year, month);

  const headers = Object.keys(transactions[0] || {}).join(",");
  const rows = transactions.map((t) => Object.values(t).join(","));
  const csv = [headers, ...rows].join("\n");

  const outputPath = path.join(process.cwd(), "all-transactions.csv");
  await fs.writeFile(outputPath, csv, "utf-8");
  log(`Transactions written to ${outputPath}`);
  rl.close();
}
