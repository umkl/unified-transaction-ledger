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
import { RequisitionsCacheDocument } from "./RequisitionFile";
import { TransactionsCacheDocuments } from "./transactionFile";
import retrieveTransactionsFromTradeRepublic from "./tradeRepublic";



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

  log("Setup complete.");

  rl.close();
}

export async function promptSecrets() {
  const secretId = await rl.question("Enter your Secret ID: ");
  const secretKey = await rl.question("Enter your Secret Key: ");

  process.env.SECRET_ID = secretId;
  process.env.SECRET_KEY = secretKey;
}

export async function requestNewTokenPair(
  secretId: string,
  secretKey: string
): Promise<void> {
  const content = await receiveRefreshToken(secretId, secretKey);
  process.env.ACCESS = content["access"] as string;
  process.env.REFRESH = content["refresh"] as string;
}

