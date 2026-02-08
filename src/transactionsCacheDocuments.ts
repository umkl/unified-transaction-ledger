import fs from "fs/promises";
import { listTransactionsRequest } from "./requests/account-transactions";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";
import path from "path";
import retrieveTransactionsFromTradeRepublic from "./tradeRepublic";
import { fileExists } from "./lib/file-exists";
import { toSnakeCase } from "./lib/snake-case";

export class TransactionsCacheDocuments {
  private transactions: Transaction[] = [];

  private constructor(transactions: Transaction[] = []) {
    this.transactions = transactions.map((t: any) => ({
      id: t.id,
      amount: t.amount,
      date: new Date(t.date),
      description: t.description,
      recipient: t.recipient,
    }));
  }

  public static async create(institutionIds?: string[]) {
    console.log("institution ids:");
    console.log(institutionIds);

    const bankIds = institutionIds ?? ["cash"];
    const readTransactions: any[] = [];
    for (const bankId of bankIds) {
      const filePath = process.cwd() + `/cache/transactions-${bankId}.json`;

      const doesFileExist = await fileExists(filePath);
      console.log("filename:");
      console.log(filePath);
      console.log("file doesn't exist");
      if (!doesFileExist) continue;
      const rawTransactions = await fs.readFile(filePath, {
        encoding: "utf-8",
      });
      console.log(`Loaded transactions from ${filePath}`);
      const jsonTransactions: any[] = JSON.parse(rawTransactions);
      jsonTransactions.map((x) => readTransactions.push(x));
    }
    return new TransactionsCacheDocuments(readTransactions);
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  getTransactions(year?: number, month?: number): Transaction[] {
    console.log(this.transactions.length);
    return this.transactions.filter((t) => {
      const tDate = new Date(t.date);
      const matchesYear = year === undefined || tDate.getFullYear() === year;
      const matchesMonth =
        month === undefined || tDate.getMonth() + 1 === month;
      return matchesYear && matchesMonth;
    });
  }

  async persist() {
    const grouped = this.transactions.reduce(
      (acc, transaction) => {
        const institution = toSnakeCase(transaction.institution || "cash");
        if (!acc[institution]) {
          acc[institution] = [];
        }
        // delete transaction.institution;
        acc[institution].push(transaction);
        return acc;
      },
      {} as Record<string, Transaction[]>,
    );

    for (const [key, value] of Object.entries(grouped)) {
      const serialized = JSON.stringify(value, null, 2);
      const filePath = process.cwd() + `/cache/transactions-${key}.json`;
      await fs.writeFile(filePath, serialized);
      log(`Transactions for ${key} persisted to ${filePath}`);
    }
  }

  async fetchTransactionsForInstitution(
    institutionId: string,
    accountId: string,
  ): Promise<void> {
    const cacheDir = path.join(process.cwd(), "cache");
    const prefix = `response-${accountId}-${institutionId}-`;

    let data: any;
    try {
      const files = await fs.readdir(cacheDir);
      const matchingFiles = files.filter(
        (f) => f.startsWith(prefix) && f.endsWith(".json"),
      );
      if (matchingFiles.length === 0) {
        throw new Error("No cached response files found");
      }
      matchingFiles.sort((a, b) => {
        const dateA = a.slice(prefix.length, prefix.length + 10);
        const dateB = b.slice(prefix.length, prefix.length + 10);
        return dateA.localeCompare(dateB);
      });

      const latestFile = matchingFiles[matchingFiles.length - 1];
      const cachePath = path.join(cacheDir, latestFile);

      data = await fs.readFile(cachePath, "utf8");

      const fetchRegardless = await confirm({
        message:
          "There is a cached response - do you want to create a new fetch (only 4 per day)?",
      });
      if (fetchRegardless) {
        throw new Error("Fetching regardless of cache");
      }
    } catch (err: Error | any) {
      log("Proceeding to fetch from API...");
      data = await listTransactionsRequest(
        process.env.ACCESS,
        accountId,
        institutionId,
      );
    }
    // For debugging purposes only:
    // const data = await fs.readFile(
    //   process.cwd() + `/cache/response-${institutionId}.json`,
    //   { encoding: "utf-8" }
    // );
    const transactions = data;
    const booked = transactions.transactions.booked;
    const transactionsMapped = booked.map((tx: any): Transaction => {
      return {
        id: tx.transactionId,
        amount: tx.transactionAmount.amount,
        date: tx.bookingDate,
        description: tx.creditorName,
        recipient: tx.creditorName,
        institution: institutionId,
      };
    });

    for (const tx of transactionsMapped as any[]) {
      this.addTransaction(tx);
    }
  }

  async fetchTransactionsFromTradeRepublic() {
    const cacheDir = path.join(process.cwd(), "cache");
    const prefix = `response-tr-`;

    let transactions: any;
    const files = await fs.readdir(cacheDir);
    const matchingFiles = files.filter(
      (f) => f.startsWith(prefix) && f.endsWith(".json"),
    );
    console.log("matching files");
    console.log(matchingFiles);
    if (matchingFiles.length !== 0) {
      matchingFiles.sort((a, b) => {
        const dateA = a.slice(prefix.length, prefix.length + 10);
        const dateB = b.slice(prefix.length, prefix.length + 10);
        return dateA.localeCompare(dateB);
      });
      const latestFile = matchingFiles[matchingFiles.length - 1];
      const cachePath = path.join(cacheDir, latestFile);
      const data = await fs.readFile(cachePath, "utf8");

      const fetchRegardless = await confirm({
        message:
          "There is a cached response - do you want to create a new fetch?",
      });

      if (fetchRegardless) {
        transactions = await retrieveTransactionsFromTradeRepublic();
      } else {
        transactions = JSON.parse(data);
      }
    } else {
      transactions = await retrieveTransactionsFromTradeRepublic();
    }

    const transactionsMapped = transactions?.map((tx: any): Transaction => {
      return {
        id: tx.id,
        amount: tx.amount.value,
        date: tx.timestamp,
        description: tx.title,
        recipient: tx.title,
        institution: "Trade Republic",
      };
    });

    console.log("transactionsMapped");
    console.log(transactionsMapped);

    for (const tx of transactionsMapped as any[]) {
      this.addTransaction(tx);
    }
  }
}
