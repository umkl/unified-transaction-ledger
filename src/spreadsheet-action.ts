import { log } from "console";
import { Transactions } from "./Transactions";
import { rl } from "./infra";
import { input } from "@inquirer/prompts";
const fs = require("fs").promises;
const path = require("path");

export default async function spreadsheetAction() {
    const transactionFile =
        await Transactions.createUsingPotentiallyExisitingTransactions();

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

    const csv = transactionFile.toCSVLines(transactions).join("\n");

    const csvWithBOM = "\ufeff" + csv;

    const outputPath = path.join(process.cwd(), "transactions.csv");
    await fs.writeFile(outputPath, csvWithBOM, "utf-8");
    log(`Transactions written to ${outputPath}`);
    rl.close();
}
