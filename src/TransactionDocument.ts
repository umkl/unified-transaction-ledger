import fs from "fs/promises";
import { listTransactionsRequest } from "./requests/account-transactions";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";
import path from "path";

import { fileExists } from "./lib/file-exists";
import { toSnakeCase } from "./lib/snake-case";
import retrieveTransactionsFromTradeRepublic from "./traderepublic";
import getSupportedInstitutions from "./supported";

export class TransactionsCacheDocuments {
  private transactions: Transaction[] = [];

  private constructor(transactions: Transaction[] = []) {
    console.log("Initial Transactions: ", transactions.length);
    this.transactions = transactions;
  }

  public static async create() {
    // reads from the json file
    const readTransactions: Transaction[] = [];
    const filePath = process.cwd() + `/cache/transactions.json`;
    const doesFileExist = await fileExists(filePath);

    if (!doesFileExist) return new TransactionsCacheDocuments();

    const rawTransactions = await fs.readFile(filePath, {
      encoding: "utf-8",
    });

    const jsonTransactions: any[] = JSON.parse(rawTransactions);

    for (const trans of jsonTransactions) {
      readTransactions.push({
        id: trans.id,
        amount: trans.amount,
        date: new Date(trans.date),
        description: trans.description,
        recipient: trans.recipient,
        institution: trans.institution,
      });
    }
    console.log(`Loaded transactions: ${jsonTransactions.length}`);

    return new TransactionsCacheDocuments(readTransactions);
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  getTransactions(year?: number, month?: number): Transaction[] {
    console.log(this.transactions);
    return this.transactions.filter((t) => {
      const tDate = new Date(t.date);
      const matchesYear = year === undefined || tDate.getFullYear() === year;
      const matchesMonth =
        month === undefined || tDate.getMonth() + 1 === month;
      return matchesYear && matchesMonth;
    });
  }

  async persist() {
    const serialized = JSON.stringify(this.transactions, null, 2);
    const filePath = process.cwd() + `/cache/transactions.json`;
    await fs.writeFile(filePath, serialized);
    log(`Persisted Transactions: ${this.transactions.length}`);
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
        process.env["GCL_ACCESS_TOKEN"],
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

  async fetchTransactionsRaiffeisen(
    institutionId: string = "RAIFFEISEN_AT_RZBAATWW",
    accountId: string,
  ): Promise<void> {
    console.log("RAIBA");
    const cacheDir = path.join(process.cwd(), "cache");
    const prefix = `response-${institutionId}-${new Date().toISOString().split("T")[0]}`;

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
      // For debugging purposes only:
      const result = await fs.readFile(
        process.cwd() +
          `/cache/response-1b686203-f5b6-4198-b983-0b7e9bbd4085-RAIFFEISEN_AT_RZBAATWW-2026-02-09.json`,
        { encoding: "utf-8" },
      );

      // data = JSON.parse(result);

      data = await listTransactionsRequest(
        process.env["GCL_ACCESS_TOKEN"],
        accountId,
        institutionId,
      );
    }
    // pending would also be available, but for this scenario only booked ones are being used
    const transactions = data.transactions.booked;
    const supported = await getSupportedInstitutions();
    const transactionsMapped: Transaction[] = transactions?.map(
      (tx: any): Transaction => {
        return {
          id: tx.transactionId,
          amount: tx.transactionAmount.amount,
          date: tx.timestamp,
          description: tx.title,
          recipient: tx.title,
          institution: supported.find((x) => x.id === institutionId)?.name,
        };
      },
    );

    for (const newTransaction of transactionsMapped) {
      const existingTransactionWithSameId = this.transactions.find(
        (existingTransaction) => {
          return existingTransaction.id === newTransaction.id;
        },
      );
      if (existingTransactionWithSameId === undefined) {
        this.addTransaction(newTransaction);
      }
    }
  }

  async fetchTransactionsFromTradeRepublic(
    institutionId: string = "TRADE_REPUBLIC",
  ) {
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

    const supported = await getSupportedInstitutions();

    const transactionsMapped: Transaction[] = transactions?.map(
      (tx: any): Transaction => {
        return {
          id: tx.id,
          amount: tx.amount.value,
          date: tx.timestamp,
          description: tx.title,
          recipient: tx.title,
          institution: supported.find((x) => x.id === institutionId)?.name,
        };
      },
    );

    for (const newTransaction of transactionsMapped) {
      const existingTransactionWithSameId = this.transactions.find(
        (existingTransaction) => {
          return existingTransaction.id === newTransaction.id;
        },
      );
      if (existingTransactionWithSameId === undefined) {
        this.addTransaction(newTransaction);
      }
    }
  }
}
