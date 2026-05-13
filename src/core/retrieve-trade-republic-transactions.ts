import path from 'path';
import { getConfigPath } from '../lib/config';
import fs from 'fs/promises';
import { confirm } from '@inquirer/prompts';
import retrieveTransactionsFromTradeRepublic from '../repo/trade-republic';
import { InstitutionId, TransactionType } from '../const/enums';
import { supported } from '../const/supported';

// gets the transactions from the trade republic api and maps them to the internal schema
export async function retrieveTradeRepublicTransactions() {
    const institution = supported[InstitutionId.TRADE_REPUBLIC];
    const cacheDir = path.dirname(getConfigPath());

    const prefix = `response-tr-`;

    let transactions: any;

    const files = await fs.readdir(cacheDir);

    const matchingFiles = files.filter(
        (f) => f.startsWith(prefix) && f.endsWith('.json')
    );

    if (matchingFiles.length !== 0) {
        matchingFiles.sort((a, b) => {
            const dateA = a.slice(prefix.length, prefix.length + 10);
            const dateB = b.slice(prefix.length, prefix.length + 10);
            return dateA.localeCompare(dateB);
        });
        const latestFile = matchingFiles[matchingFiles.length - 1];
        const cachePath = path.join(cacheDir, latestFile);
        const data = await fs.readFile(cachePath, 'utf8');

        const isRetrievalDemandedRegardless = await confirm({
            message:
                'There is a cached response - do you want to create a new fetch?',
        });

        if (isRetrievalDemandedRegardless) {
            transactions = await retrieveTransactionsFromTradeRepublic();
        } else {
            transactions = JSON.parse(data);
        }
    } else {
        transactions = await retrieveTransactionsFromTradeRepublic();
    }

    const transactionsMapped: Transaction[] = transactions?.map(
        (t: any): Transaction => {
            const amount = +t.amount.value;
            const isNegative = amount < 0;

            return {
                id: t.id,
                amount: t.amount.value,
                type: isNegative
                    ? TransactionType.LIABILITY
                    : TransactionType.RECEIVABLE,
                date: t.timestamp,
                description: t.title,
                recipient: t.title,
                institution,
            };
        }
    );

    return transactionsMapped;
}
