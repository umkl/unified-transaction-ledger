import fs from "fs/promises";
import { listTransactionsRequest } from "./requests/account-transactions";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";

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
    const bankIds = institutionIds ?? ["cash"];
    const readTransactions: any[] = [];
    for (const bankId of bankIds) {
      const filePath = process.cwd() + `/cache/transactions-${bankId}.json`;
      const rawTransactions = await fs.readFile(filePath, {
        encoding: "utf-8",
      });
      const jsonTransactions: any[] = JSON.parse(rawTransactions);
      jsonTransactions.map((x) => readTransactions.push(x));
    }
    return new TransactionsCacheDocuments(readTransactions);
  }

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  getTransactions(): Transaction[] {
    return this.transactions;
  }

  async persist() {
    const grouped = this.transactions.reduce((acc, transaction) => {
      const institution = transaction.institution || "cash";
      if (!acc[institution]) {
        acc[institution] = [];
      }
      delete transaction.institution;
      acc[institution].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    for (const [key, value] of Object.entries(grouped)) {
      const serialized = JSON.stringify(value, null, 2);
      const filePath = process.cwd() + `/cache/transactions-${key}.json`;
      await fs.writeFile(filePath, serialized);
      log(`Transactions for ${key} persisted to ${filePath}`);
    }
  }

  async fetchTransactionsForInstitution(
    institutionId: string,
    accountId: string
  ): Promise<void> {
    const cachePath = `${process.cwd()}/cache/response-${accountId}-${institutionId}.json`;

    let data: any;
    try {
      data = await fs.readFile(cachePath, { encoding: "utf8" });
      const fetchRegardless = await confirm({
        message: "Cache data loaded, do you want to fetch regardless?",
      });
      if (fetchRegardless) {
        throw new Error("Fetching regardless of cache");
      }
    } catch (err: Error | any) {
      log("Proceeding to fetch from API:", err);
      data = await listTransactionsRequest(process.env.ACCESS, accountId);
    }

    // For debugging purposes only:
    // const data = await fs.readFile(
    //   process.cwd() + `/cache/response-${institutionId}.json`,
    //   { encoding: "utf-8" }
    // );
    const transactions = JSON.parse(data);
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
}
