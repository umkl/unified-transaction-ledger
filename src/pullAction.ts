import { select } from "@inquirer/prompts";
import { rl } from "./infra";
import { pullTransactionsIntoCache } from "./transactions";

export default async function pullAction() {
  const answer = await select({
    message: "What data do you want to retrieve:",
    choices: [{ name: "Transactions", value: "transactions" }],
  });

  switch (answer) {
    case "transactions":
      await pullTransactionsIntoCache();
  }

  rl.close();
}
