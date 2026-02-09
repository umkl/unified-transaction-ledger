import { select } from "@inquirer/prompts";
import { rl } from "./infra";
import { pullTransactionsIntoCache } from "./transactions";
import { RequisitionsCacheDocument } from "./RequisitionFile";
import { TransactionsCacheDocuments } from "./transactionsCacheDocuments";
import getSupportedInstitutions from "./supported";

export default async function pullAction() {
  const transactionsCacheDocument = await TransactionsCacheDocuments.create();

  await pullTransactionsIntoCache(transactionsCacheDocument);

  await transactionsCacheDocument.persist();

  rl.close();
}
