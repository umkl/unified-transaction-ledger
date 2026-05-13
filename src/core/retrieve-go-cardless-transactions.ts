import path from 'path';
import getSupportedInstitutions, { supported } from '../const/supported';
import { getConfigPath } from '../lib/config';
import fs from 'fs/promises';
import { confirm } from '@inquirer/prompts';
import { log } from '../lib/log';
import { InstitutionId, TransactionType } from '../const/enums';
import { listTransactionsRequest } from '../requests/account-transactions';

export async function fetchGoCardless(
    institutionId: InstitutionId,
    accountId: string
): Promise<Transaction[]> {
    const institution = supported[institutionId];
    const cacheDir = path.dirname(getConfigPath());
    const prefix = `response-${institutionId}`;

    let data: any;

    try {
        const files = await fs.readdir(cacheDir);
        const matchingFiles = files.filter(
            (f) => f.startsWith(prefix) && f.endsWith('.json')
        );
        if (matchingFiles.length === 0) {
            throw new Error('No cached response files found');
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
                'There is a cached response - do you want to create a new fetch (only 4 per day)?',
        });
        if (fetchRegardless) {
            throw new Error('Fetching regardless of cache');
        }

        console.log(cachePath);
        data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
    } catch (err: Error | any) {
        log('Proceeding to fetch from API...');
        // For debugging purposes only:
        // const result = await fs.readFile(
        //   process.cwd() +
        //     `/cache/response-1b686203-f5b6-4198-b983-0b7e9bbd4085-RAIFFEISEN_AT_RZBAATWW-2026-02-09.json`,
        //   { encoding: "utf-8" },
        // );

        // data = JSON.parse(result);

        data = await listTransactionsRequest(
            process.env['GCL_ACCESS_TOKEN'],
            accountId,
            institutionId
        );
    }

    // pending would also be available, but for this scenario only booked ones are being used

    const transactions = data.transactions.booked;

    const transactionsMapped: Transaction[] = transactions?.map(
        (tx: any): Transaction => {
            const amount = +tx.transactionAmount.amount;
            const isNegative = amount < 0;
            const description =
                tx.creditorName ??
                tx.debtorName ??
                tx.remittanceInformationUnstructured ??
                tx.additionalInformation ??
                tx.title ??
                tx.transactionId;

            return {
                id: tx.transactionId,
                amount: tx.transactionAmount.amount,
                date: new Date(tx.bookingDate),
                description: tx.title ?? description,
                type: isNegative
                    ? TransactionType.LIABILITY
                    : TransactionType.RECEIVABLE,
                recipient: tx.title,
                institution: institution,
            };
        }
    );

    return transactionsMapped;
}

// public async fetchTransactionsForInstitution(
//     institutionId: string,
//     accountId: string
// ): Promise<void> {
//     const cacheDir = path.dirname(getConfigPath());
//     const prefix = `response-${accountId}-${institutionId}-`;

//     let data: any;
//     try {
//         const files = await fs.readdir(cacheDir);
//         const matchingFiles = files.filter(
//             (f) => f.startsWith(prefix) && f.endsWith('.json')
//         );
//         if (matchingFiles.length === 0) {
//             throw new Error('No cached response files found');
//         }
//         matchingFiles.sort((a, b) => {
//             const dateA = a.slice(prefix.length, prefix.length + 10);
//             const dateB = b.slice(prefix.length, prefix.length + 10);
//             return dateA.localeCompare(dateB);
//         });

//         const latestFile = matchingFiles[matchingFiles.length - 1];
//         const cachePath = path.join(cacheDir, latestFile);

//         data = await fs.readFile(cachePath, 'utf8');

//         const fetchRegardless = await confirm({
//             message:
//                 'There is a cached response - do you want to create a new fetch (only 4 per day)?',
//         });
//         if (fetchRegardless) {
//             throw new Error('Fetching regardless of cache');
//         }
//     } catch (err: Error | any) {
//         log('Proceeding to fetch from API...');
//         data = await listTransactionsRequest(
//             process.env['GCL_ACCESS_TOKEN'],
//             accountId,
//             institutionId
//         );
//     }
//     // For debugging purposes only:
//     // const data = await fs.readFile(
//     //   process.cwd() + `/cache/response-${institutionId}.json`,
//     //   { encoding: "utf-8" }
//     // );
//     const transactions = data;
//     const booked = transactions.transactions.booked;
//     const transactionsMapped = booked.map((tx: any): Transaction => {
//         return {
//             id: tx.transactionId,
//             amount: tx.transactionAmount.amount,
//             date: tx.bookingDate,
//             description: tx.creditorName,
//             recipient: tx.creditorName,
//             institutionId: institutionId,
//         } as any;
//     });

//     for (const tx of transactionsMapped as any[]) {
//         this.addTransaction(tx);
//     }
// }

// async function fetchTransactionsRevolut(
//     institutionId: string = 'REVOLUT_REVOLT21',
//     accountId: string
// ) {
//     const supported = await getSupportedInstitutions();
//     const institution = supported.find((x) => x.id === institutionId);
//     if (!institution) {
//         throw new Error("Institution wasn't found");
//     }

//     const cacheDir = path.dirname(getConfigPath());
//     const prefix = `response-${institutionId}`;

//     let data: any;
//     try {
//         const files = await fs.readdir(cacheDir);
//         const matchingFiles = files.filter(
//             (f) => f.startsWith(prefix) && f.endsWith('.json')
//         );
//         if (matchingFiles.length === 0) {
//             throw new Error('No cached response files found');
//         }
//         matchingFiles.sort((a, b) => {
//             const dateA = a.slice(prefix.length, prefix.length + 10);
//             const dateB = b.slice(prefix.length, prefix.length + 10);
//             return dateA.localeCompare(dateB);
//         });

//         const latestFile = matchingFiles[matchingFiles.length - 1];
//         const cachePath = path.join(cacheDir, latestFile);

//         const fetchRegardless = await confirm({
//             message:
//                 'There is a cached response - do you want to create a new fetch (only 4 per day)?',
//         });
//         if (fetchRegardless) {
//             throw new Error('Fetching regardless of cache');
//         }

//         console.log(cachePath);
//         data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
//     } catch (err: Error | any) {
//         log('Proceeding to fetch from API...');
//         // For debugging purposes only:
//         // const result = await fs.readFile(
//         //   process.cwd() +
//         //     `/cache/response-1b686203-f5b6-4198-b983-0b7e9bbd4085-RAIFFEISEN_AT_RZBAATWW-2026-02-09.json`,
//         //   { encoding: "utf-8" },
//         // );
//         // data = JSON.parse(result);

//         data = await listTransactionsRequest(
//             process.env['GCL_ACCESS_TOKEN'],
//             accountId,
//             institutionId
//         );
//     }
//     // pending would also be available, but for this scenario only booked ones are being used

//     const transactions = data.transactions.booked;

//     const transactionsMapped: Transaction[] = transactions?.map(
//         (tx: any): Transaction => {
//             const amount = +tx.transactionAmount.amount;
//             const isNegative = amount < 0;

//             return {
//                 id: tx.transactionId,
//                 amount: tx.transactionAmount.amount,
//                 date: new Date(tx.bookingDateTime),
//                 description: tx.creditorName,
//                 type: isNegative
//                     ? TransactionType.LIABILITY
//                     : TransactionType.RECEIVABLE,
//                 recipient: tx.title,
//                 institution: institution,
//             };
//         }
//     );

//     for (const newTransaction of transactionsMapped) {
//         const existingTransactionWithSameId = this.transactions.find(
//             (existingTransaction) => {
//                 return existingTransaction.id === newTransaction.id;
//             }
//         );
//         if (existingTransactionWithSameId === undefined) {
//             this.addTransaction(newTransaction);
//         }
//     }
// }

// async fetchTransactionsN26(
//     institutionId: string = 'N26_NTSBDEB1',
//     accountId: string
// ) {
//     const supported = await getSupportedInstitutions();
//     const institution = supported.find((x) => x.id === institutionId);
//     if (!institution) {
//         throw new Error("Institution wasn't found");
//     }

//     const cacheDir = path.dirname(getConfigPath());
//     const prefix = `response-${institutionId}`;

//     let data: any;
//     try {
//         const files = await fs.readdir(cacheDir);
//         const matchingFiles = files.filter(
//             (f) => f.startsWith(prefix) && f.endsWith('.json')
//         );
//         if (matchingFiles.length === 0) {
//             throw new Error('No cached response files found');
//         }
//         matchingFiles.sort((a, b) => {
//             const dateA = a.slice(prefix.length, prefix.length + 10);
//             const dateB = b.slice(prefix.length, prefix.length + 10);
//             return dateA.localeCompare(dateB);
//         });

//         const latestFile = matchingFiles[matchingFiles.length - 1];
//         const cachePath = path.join(cacheDir, latestFile);

//         const fetchRegardless = await confirm({
//             message:
//                 'There is a cached response - do you want to create a new fetch (only 4 per day)?',
//         });
//         if (fetchRegardless) {
//             throw new Error('Fetching regardless of cache');
//         }

//         console.log(cachePath);
//         data = JSON.parse(await fs.readFile(cachePath, 'utf8'));
//     } catch (err: Error | any) {
//         log('Proceeding to fetch from API...');
//         data = await listTransactionsRequest(
//             process.env['GCL_ACCESS_TOKEN'],
//             accountId,
//             institutionId
//         );
//     }

//     const transactions = data.transactions.booked;

//     const transactionsMapped: Transaction[] = transactions?.map(
//         (tx: any): Transaction => {
//             const amount = +tx.transactionAmount.amount;
//             const isNegative = amount < 0;
//             const description =
//                 tx.creditorName ??
//                 tx.debtorName ??
//                 tx.remittanceInformationUnstructured ??
//                 tx.additionalInformation ??
//                 tx.title ??
//                 tx.transactionId;

//             return {
//                 id: tx.transactionId,
//                 amount: tx.transactionAmount.amount,
//                 date: new Date(tx.bookingDateTime ?? tx.bookingDate),
//                 description,
//                 type: isNegative
//                     ? TransactionType.LIABILITY
//                     : TransactionType.RECEIVABLE,
//                 recipient: tx.creditorName ?? tx.debtorName ?? description,
//                 institution: institution,
//             };
//         }
//     );

//     for (const newTransaction of transactionsMapped) {
//         const existingTransactionWithSameId = this.transactions.find(
//             (existingTransaction) => {
//                 return existingTransaction.id === newTransaction.id;
//             }
//         );
//         if (existingTransactionWithSameId === undefined) {
//             this.addTransaction(newTransaction);
//         }
//     }
// }
