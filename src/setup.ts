import { Command } from "commander";
import { rl } from "./infra";
import receiveRefreshToken from "./requests/token-new";
import fs from "fs";
import { log } from "./utils";
import { promptCountry } from "./country";
import { refreshToken } from "./refreshToken";
import { checkbox, confirm } from "@inquirer/prompts";
import { getInstitutions } from "./requests/institutions";
import getSupportedInstitutions from "./supported";
import { createRequisition } from "./requests/requisition";
import open from "open";
import { http } from "follow-redirects";
import { listAccounts } from "./requests/list-accounts";
import { listTransactionsRequest as listTransactionsRequest } from "./requests/account-transactions";
import { RequisitionFile } from "./RequisitionFile";
import { TransactionFile } from "./transactionFile";
import getTradeRepublicTransactions from "./trade_republic";

export async function promptSecrets() {
  const secretId = await rl.question("Enter your Secret ID: ");
  const secretKey = await rl.question("Enter your Secret Key: ");

  process.env.SECRET_ID = secretId;
  process.env.SECRET_KEY = secretKey;
}

/**
 *
 * @param secretId
 * @param secretKey
 * @returns {Promise<string>} Returns a concatenation of secretId and secretKey
 */
export async function requestNewTokenPair(
  secretId: string,
  secretKey: string
): Promise<void> {
  const content = await receiveRefreshToken(secretId, secretKey);
  process.env.ACCESS = content["access"] as string;
  process.env.REFRESH = content["refresh"] as string;
}

export async function setupAction(this: Command): Promise<void> {
  const doesEnvExist = await new Promise<boolean>((resolve) => {
    fs.access(process.cwd() + "/.env", fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });

  if (doesEnvExist) {
    const envFile = await new Promise<string>((resolve, reject) => {
      fs.readFile(
        process.cwd() + "/.env",
        { encoding: "utf-8" },
        (err, data: string) => {
          if (err) reject(err);
          resolve(data);
        }
      );
    });
    for (const line of envFile.split("\n")) {
      const [key, value] = line.split("=");
      process.env[key] = value;
    }
  }
  const previousEnv = { ...process.env };

  if (!process.env.SECRET_ID || !process.env.SECRET_KEY) {
    await promptSecrets();
  }

  if (!process.env.ACCESS || !process.env.REFRESH) {
    await requestNewTokenPair(process.env.SECRET_ID, process.env.SECRET_KEY);
  }

  const hasChanged =
    previousEnv.SECRET_ID !== process.env.SECRET_ID ||
    previousEnv.SECRET_KEY !== process.env.SECRET_KEY ||
    previousEnv.ACCESS !== process.env.ACCESS ||
    previousEnv.REFRESH !== process.env.REFRESH;

  if (hasChanged) {
    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `SECRET_ID=${process.env.SECRET_ID}\nSECRET_KEY=${process.env.SECRET_KEY}\nACCESS=${process.env.ACCESS}\nREFRESH=${process.env.REFRESH}\n`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        }
      );
    });
    log("Updated/Created .env file with new credentials.");
  }

  // GET INSTITUTION
  const country = await promptCountry();
  const result = await getSupportedInstitutions(country);
  const results = (result as any[]).map((inst) => ({
    name: inst.name,
    value: inst.id,
    checked: false,
  }));
  const checkedInstitutions = await checkbox({
    message: "Select your institutions:",
    choices: results,
    required: true,
  });

  // REQUISITION FLOW
  const requisitionFile = await RequisitionFile.create();
  const transactionFile = await TransactionFile.create();

  for (const insti of checkedInstitutions) {
    if (insti === "TRADE_REPUBLIC") {
      log("Skipping Trade Republic as it is not supported yet.");
      const transactions = await getTradeRepublicTransactions();
      continue;
    }

    const accounts = await listAccounts(
      process.env.ACCESS,
      await requisitionFile.getRequisitionId(insti)
    );

    transactionFile.fetchTransactionsForInstitution(insti, accounts[0]);
  }
  await requisitionFile.persist();
  await transactionFile.persist();

  log("Setup complete.");

  rl.close();
}

async function refreshTokenAction(): Promise<void> {
  const isNewRequestTokenDemanded = await confirm({
    message: "Do you want to refresh your access token now?",
    default: false,
  });

  if (isNewRequestTokenDemanded) {
    log("Requesting new token pair...");
    const accessToken = await refreshToken(process.env.REFRESH);
    process.env.ACCESS = accessToken;
  }
}
