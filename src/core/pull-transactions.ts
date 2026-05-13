import { checkbox, select } from '@inquirer/prompts';
import { rl } from '../lib/readline-interface';
import { Requisitions } from '../entities/Requisitions';
import { Transactions } from '../entities/Transactions';
import getSupportedInstitutions from '../const/supported';
import { listAccounts } from '../requests/list-accounts';
import { InstitutionId } from '../const/enums';

export default async function pullTransactions() {
    const transactionsCacheDocument = await Transactions.init();

    await pullTransactionsIntoCache(transactionsCacheDocument);
    await transactionsCacheDocument.writeToJsonFile();

    rl.close();
}

export async function pullTransactionsIntoCache(transactionsDoc: Transactions) {
    const requisitionsDocument = await Requisitions.create();

    const institutionsSupported = await getSupportedInstitutions();

    const institutionsChecked = await checkbox({
        message: 'Select your institutions:',
        choices: institutionsSupported.map((inst) => ({
            name: inst.name,
            value: inst.id,
            checked: false,
        })),
        required: true,
    });

    for (const institutionValue of institutionsChecked) {
        await transactionsDoc.pull(
            institutionValue as InstitutionId,
            requisitionsDocument
        );
    }

    requisitionsDocument.persist();
}
