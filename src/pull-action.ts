import { checkbox, select } from "@inquirer/prompts";
import { rl } from "./infra";
import { RequisitionsCacheDocument } from "./RequisitionDocument";
import { TransactionsCacheDocuments } from "./TransactionDocument";
import getSupportedInstitutions from "./supported";
import { listAccounts } from "./requests/list-accounts";

export default async function pullAction() {
  const transactionsCacheDocument = await TransactionsCacheDocuments.create();

  await pullTransactionsIntoCache(transactionsCacheDocument);

  await transactionsCacheDocument.persist();

  rl.close();
}

export async function pullTransactionsIntoCache(
  transactionsCacheDocument: TransactionsCacheDocuments,
) {
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

  const requisitionsDocument = await RequisitionsCacheDocument.create();

  for (const insti of checkedInstitutions) {
    if (insti === "TRADE_REPUBLIC") {
      console.log("fetching data from trade republic");
      await transactionsCacheDocument.fetchTransactionsFromTradeRepublic();
    } else {
      const accounts = await listAccounts(
        process.env.ACCESS,
        await requisitionsDocument.getRequisitionId(insti),
      );
      console.log(
        `Found ${accounts.length} accounts for institution ${insti}.`,
      );
      if (accounts.length < 1) {
        throw new Error(
          "No accounts found for this institution, please reauthenticate",
        );
      }
      await transactionsCacheDocument.fetchTransactionsForInstitution(
        insti,
        accounts[0],
      );
    }
  }

  (await requisitionsDocument).persist();
}
