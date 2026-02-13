import { checkbox, select } from "@inquirer/prompts";
import { rl } from "./infra";
import { Requisitions } from "./Requisitions";
import { Transactions } from "./Transactions";
import getSupportedInstitutions from "./supported";
import { listAccounts } from "./requests/list-accounts";

export default async function pullAction() {
    const transactionsCacheDocument =
        await Transactions.createUsingPotentiallyExisitingTransactions();

    await pullTransactionsIntoCache(transactionsCacheDocument);

    await transactionsCacheDocument.writeToJsonFile();

    rl.close();
}

export async function pullTransactionsIntoCache(transactionsDoc: Transactions) {
    // const countryCode = await promptCountry();

    const institutions = await getSupportedInstitutions();

    const results = institutions.map((inst) => ({
        name: inst.name,
        value: inst.id,
        checked: false,
    }));

    const checkedInstitutions = await checkbox({
        message: "Select your institutions:",
        choices: results,
        required: true,
    });

    const requisitionsDocument = await Requisitions.create();

    for (const insti of checkedInstitutions) {
        if (insti === "TRADE_REPUBLIC") {
            console.log("fetching data from trade republic");
            await transactionsDoc.fetchTransactionsFromTradeRepublic();
        } else if (insti === "RAIFFEISEN_AT_RZBAATWW") {
            const reqId = await requisitionsDocument.getRequisitionId(insti);
            const accounts = await listAccounts(
                process.env["GCL_ACCESS_TOKEN"],
                reqId,
            );
            await transactionsDoc.fetchTransactionsRaiffeisen(
                insti,
                accounts[0],
            );
        } else if (insti === "REVOLUT_REVOLT21") {
            const reqId = await requisitionsDocument.getRequisitionId(insti);
            const accounts = await listAccounts(
                process.env["GCL_ACCESS_TOKEN"],
                reqId,
            );
            await transactionsDoc.fetchTransactionsRevolut(insti, accounts[0]);
        } else {
            console.error("Institution not supported yet: " + insti);
        }
    }

    (await requisitionsDocument).persist();
}
