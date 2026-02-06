import { checkbox } from "@inquirer/prompts";
import { promptCountry } from "./country";
import getSupportedInstitutions from "./supported";
import { RequisitionsCacheDocument } from "./RequisitionFile";
import { TransactionsCacheDocuments } from "./transactionsCacheDocuments";
import { log } from "./utils";
import retrieveTransactionsFromTradeRepublic from "./tradeRepublic";
import { listAccounts } from "./requests/list-accounts";

export async function pullTransactionsIntoCache() {
  const countryCode = await promptCountry();

  const institutions = await getSupportedInstitutions(countryCode);
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

  const allRequisitions = await RequisitionsCacheDocument.create();
  const transactions = await TransactionsCacheDocuments.create();

  for (const insti of checkedInstitutions) {
    if (insti === "TRADE_REPUBLIC") {
      console.log("fetching data from trade republic");
      await transactions.fetchTransactionsFromTradeRepublic();
    } else {
      const accounts = await listAccounts(
        process.env.ACCESS,
        await allRequisitions.getRequisitionId(insti),
      );
      console.log(
        `Found ${accounts.length} accounts for institution ${insti}.`,
      );
      await transactions.fetchTransactionsForInstitution(insti, accounts[0]);
    }
  }

  log("All done!");

  await allRequisitions.persist();
  await transactions.persist();
}
