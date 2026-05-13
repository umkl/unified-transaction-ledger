import fs from 'fs/promises';
import { log } from '../lib/log';
import path from 'path';

import { fileExists } from '../lib/file-exists';
import { InstitutionId, TransactionType } from '../const/enums';
import { getConfigPath } from '../lib/config';
import { retrieveTradeRepublicTransactions } from '../core/retrieve-trade-republic-transactions';
import { fetchGoCardless } from '../core/retrieve-go-cardless-transactions';
import { listAccounts } from '../requests/list-accounts';
import { Requisitions } from './Requisitions';

export class Transactions {
    private transactions: Transaction[] = [];
    private constructor(transactions: Transaction[] = []) {
        log('Current Transactions: ', transactions.length.toFixed(0));
        this.transactions = transactions;
    }
    public static async init() {
        const readTransactions: Transaction[] = [];
        const configDir = path.dirname(getConfigPath());
        const filePath = path.join(configDir, 'transactions.json');
        const doesFileExist = await fileExists(filePath);

        if (!doesFileExist) return new Transactions();

        const rawTransactions = await fs.readFile(filePath, {
            encoding: 'utf-8',
        });

        let jsonTransactions: any[] = [];
        try {
            jsonTransactions = JSON.parse(rawTransactions);
        } catch (err) {
            console.error('Error parsing transactions JSON:', err);
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
        transactions: Transaction[] = this.transactions
    ): string[] {
        const columns = [
            'id',
            'amount',
            'type',
            'date',
            'description',
            'recipient',
            'institution',
        ];

        const escapeCSV = (value: unknown): string => {
            if (value === null || value === undefined) return '';
            const normalized =
                value instanceof Date
                    ? value.toISOString().split('T')[0]
                    : String(value);
            if (/[,"\n\r]/.test(normalized)) {
                return `"${normalized.replace(/"/g, '""')}"`;
            }
            return normalized;
        };

        const lines = [columns.join(',')];
        for (const tx of transactions) {
            const row = columns
                .map((key) => {
                    if (key === 'institution') {
                        return escapeCSV(
                            tx.institution?.name ??
                                (tx as Transaction & { institutionId?: string })
                                    .institutionId ??
                                ''
                        );
                    }

                    return escapeCSV(tx[key as keyof Transaction]);
                })
                .join(',');
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
            2
        );
        const configDir = path.dirname(getConfigPath());
        const filePath = path.join(configDir, 'transactions.json');
        await fs.mkdir(configDir, { recursive: true });
        await fs.writeFile(filePath, serialized);
        log(`Persisted Transactions: ${this.transactions.length}`);
    }

    public async pull(
        institution: InstitutionId,
        requisitionsDocument?: Requisitions
    ) {
        let transactions;
        switch (institution) {
            case InstitutionId.TRADE_REPUBLIC:
                transactions = await retrieveTradeRepublicTransactions();
                console.log(
                    'Fetched transactions from Trade Republic:',
                    transactions.length
                );
                break;
            case InstitutionId.RAIFFEISEN_AT_RZBAATWW:
            case InstitutionId.REVOLUT_REVOLT21:
            case InstitutionId.N26_NTSBDEB1:
                const reqId =
                    await requisitionsDocument?.getRequisitionId(institution);
                const accounts = await listAccounts(
                    process.env['GCL_ACCESS_TOKEN'],
                    reqId || ''
                );
                transactions = await fetchGoCardless(institution, accounts[0]);

            default:
                break;
        }

        if (!transactions) return;
        for (const transaction of transactions) {
            if (
                this.transactions.find((existingTransaction) => {
                    return existingTransaction.id === transaction.id;
                }) === undefined
            ) {
                this.addTransaction(transaction);
            }
        }
    }
}
