import fs from "fs/promises";
import { listTransactionsRequest } from "./requests/account-transactions";
import { log } from "./utils";
import { confirm } from "@inquirer/prompts";
import path from "path";

import { fileExists } from "./lib/file-exists";
import { toSnakeCase } from "./lib/snake-case";
import retrieveTransactionsFromTradeRepublic from "./tradeRepublic";
import getSupportedInstitutions from "./supported";
import { TransactionType } from "./const/enums";
import { getConfigPath } from "./lib/env";

export class Transactions {
    private transactions: Transaction[] = [];
    private constructor(transactions: Transaction[] = []) {
        console.log("Initial Transactions: ", transactions.length);
        this.transactions = transactions;
    }
    public static async createUsingPotentiallyExisitingTransactions() {
        // reads from the json file
        const readTransactions: Transaction[] = [];
        const configDir = path.dirname(getConfigPath());
        const filePath = path.join(configDir, "transactions.json");
        const doesFileExist = await fileExists(filePath);

        if (!doesFileExist) return new Transactions();

        const rawTransactions = await fs.readFile(filePath, {
            encoding: "utf-8",
        });

        let jsonTransactions: any[] = [];
        try {
            jsonTransactions = JSON.parse(rawTransactions);
        } catch (err) {
            console.error("Error parsing transactions JSON:", err);
        }

        console.log(jsonTransactions[0]);

        for (const trans of jsonTransactions) {
            readTransactions.push({
                id: trans.id,
                amount: trans.amount,
                date: trans.date ? new Date(trans.date) : undefined,
                description: trans.description,
                recipient: trans.recipient,
                type: trans.type,
                institutionId: trans.institutionId,
            } as any);
        }
        console.log(`Loaded transactions: ${jsonTransactions.length}`);

        return new Transactions(readTransactions);
    }

    public addTransaction(transaction: Transaction) {
        this.transactions.push(transaction);
    }

    public getTransactions(year?: number, month?: number): Transaction[] {
        return this.transactions.filter((t) => {
            const tDate = new Date(t.date);
            const matchesYear =
                year === undefined || tDate.getFullYear() === year;
            const matchesMonth =
                month === undefined || tDate.getMonth() + 1 === month;
            return matchesYear && matchesMonth;
        });
    }

    public toCSVLines(
        transactions: Transaction[] = this.transactions,
    ): string[] {
        const columns: (keyof Transaction)[] = [
            "id",
            "amount",
            "type",
            "date",
            "description",
            "recipient",
            "institutionId",
        ];

        const escapeCSV = (value: unknown): string => {
            if (value === null || value === undefined) return "";
            const normalized =
                value instanceof Date
                    ? value.toISOString().split("T")[0]
                    : String(value);
            if (/[,"\n\r]/.test(normalized)) {
                return `"${normalized.replace(/"/g, '""')}"`;
            }
            return normalized;
        };

        const lines = [columns.join(",")];
        for (const tx of transactions) {
            const row = columns.map((key) => escapeCSV(tx[key])).join(",");
            lines.push(row);
        }

        return lines;
    }

    public async writeToJsonFile() {
        const serialized = JSON.stringify(
            this.transactions.map((tx) => {
                return {
                    ...tx,
                    institution: undefined,
                };
            }),
            null,
            2,
        );
        const configDir = path.dirname(getConfigPath());
        const filePath = path.join(configDir, "transactions.json");
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(filePath, serialized);
        log(`Persisted Transactions: ${this.transactions.length}`);
    }

    public async fetchTransactionsForInstitution(
        institutionId: string,
        accountId: string,
    ): Promise<void> {
        const cacheDir = path.dirname(getConfigPath());
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
                institutionId: institutionId,
            } as any;
        });

        for (const tx of transactionsMapped as any[]) {
            this.addTransaction(tx);
        }
    }

    public async fetchTransactionsRaiffeisen(
        institutionId: string = "RAIFFEISEN_AT_RZBAATWW",
        accountId: string,
    ): Promise<void> {
        const supported = await getSupportedInstitutions();
        const institution = supported.find((x) => x.id === institutionId);
        if (!institution) {
            throw new Error("Institution wasn't found");
        }

        const cacheDir = path.dirname(getConfigPath());
        const prefix = `response-${institutionId}`;

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

            const fetchRegardless = await confirm({
                message:
                    "There is a cached response - do you want to create a new fetch (only 4 per day)?",
            });
            if (fetchRegardless) {
                throw new Error("Fetching regardless of cache");
            }

            console.log(cachePath);
            data = JSON.parse(await fs.readFile(cachePath, "utf8"));
        } catch (err: Error | any) {
            log("Proceeding to fetch from API...");
            // For debugging purposes only:
            // const result = await fs.readFile(
            //   process.cwd() +
            //     `/cache/response-1b686203-f5b6-4198-b983-0b7e9bbd4085-RAIFFEISEN_AT_RZBAATWW-2026-02-09.json`,
            //   { encoding: "utf-8" },
            // );

            // data = JSON.parse(result);

            data = await listTransactionsRequest(
                process.env["GCL_ACCESS_TOKEN"],
                accountId,
                institutionId,
            );
        }
        // pending would also be available, but for this scenario only booked ones are being used

        const transactions = data.transactions.booked;

        const transactionsMapped: Transaction[] = transactions?.map(
            (tx: any): Transaction => {
                const amount = +tx.transactionAmount.amount;
                const isNegative = amount < 0;

                return {
                    id: tx.transactionId,
                    amount: tx.transactionAmount.amount,
                    date: new Date(tx.bookingDate),
                    description: tx.title,
                    type: isNegative
                        ? TransactionType.LIABILITY
                        : TransactionType.RECEIVABLE,
                    recipient: tx.title,
                    institution: institution,
                    institutionId: institution.id,
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

    async fetchTransactionsRevolut(
        institutionId: string = "REVOLUT_REVOLT21",
        accountId: string,
    ) {
        const supported = await getSupportedInstitutions();
        const institution = supported.find((x) => x.id === institutionId);
        if (!institution) {
            throw new Error("Institution wasn't found");
        }

        const cacheDir = path.dirname(getConfigPath());
        const prefix = `response-${institutionId}`;

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

            const fetchRegardless = await confirm({
                message:
                    "There is a cached response - do you want to create a new fetch (only 4 per day)?",
            });
            if (fetchRegardless) {
                throw new Error("Fetching regardless of cache");
            }

            console.log(cachePath);
            data = JSON.parse(await fs.readFile(cachePath, "utf8"));
        } catch (err: Error | any) {
            log("Proceeding to fetch from API...");
            // For debugging purposes only:
            // const result = await fs.readFile(
            //   process.cwd() +
            //     `/cache/response-1b686203-f5b6-4198-b983-0b7e9bbd4085-RAIFFEISEN_AT_RZBAATWW-2026-02-09.json`,
            //   { encoding: "utf-8" },
            // );

            // data = JSON.parse(result);

            data = await listTransactionsRequest(
                process.env["GCL_ACCESS_TOKEN"],
                accountId,
                institutionId,
            );
        }
        // pending would also be available, but for this scenario only booked ones are being used

        const transactions = data.transactions.booked;

        const transactionsMapped: Transaction[] = transactions?.map(
            (tx: any): Transaction => {
                const amount = +tx.transactionAmount.amount;
                const isNegative = amount < 0;

                return {
                    id: tx.transactionId,
                    amount: tx.transactionAmount.amount,
                    date: new Date(tx.bookingDateTime),
                    description: tx.creditorName,
                    type: isNegative
                        ? TransactionType.LIABILITY
                        : TransactionType.RECEIVABLE,
                    recipient: tx.title,
                    institution: institution,
                    institutionId: institution.id,
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

    public async fetchTransactionsFromTradeRepublic(
        institutionId: string = "TRADE_REPUBLIC",
    ) {
        const supported = await getSupportedInstitutions();
        const institution = supported.find((x) => x.id === institutionId);
        if (!institution) {
            throw new Error("Institution wasn't found");
        }

        const cacheDir = path.dirname(getConfigPath());

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

        const transactionsMapped: Transaction[] = transactions?.map(
            (tx: any): Transaction => {
                const amount = +tx.amount.value;
                const isNegative = amount < 0;

                return {
                    id: tx.id,
                    amount: tx.amount.value,
                    type: isNegative
                        ? TransactionType.LIABILITY
                        : TransactionType.RECEIVABLE,
                    date: tx.timestamp,
                    description: tx.title,
                    recipient: tx.title,
                    institution: institution,
                    institutionId: institutionId,
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
