import { confirm, input } from "@inquirer/prompts";
import { log } from "console";
import fs from "fs";
import { trAuthRequest } from "./requests/trade-republic/authRequest";
import { trVerifyCodeRequest } from "./requests/trade-republic/verifyCodeRequest";
import { fetchAllTransactions } from "./transactionsTradeRepublic";
import { getEnvContent } from "./lib/env-content";
import { writeFile } from "fs/promises";

export default async function retrieveTransactionsFromTradeRepublic() {
  let phone = process.env.TR_PHONE;

  const envFileContent = await getEnvContent();

  if (!phone) {
    phone = await input({
      message: "Enter your phone number:",
      validate: (input) => {
        return true;
      },
    });

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_PHONE=${phone}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
  }

  let pin = process.env.TR_PIN;

  if (!pin) {
    pin = await input({
      message: "Enter your PIN (4 digits):",
      validate: (input) => {
        if (input.length !== 4) {
          return "Please provide a PIN with a length of 4 digits";
        }
        return true;
      },
    });

    const envFileContent = await getEnvContent();

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_PIN=${pin}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
    log("Updated/Created .env file with new credentials.");
  }

  let jwt = process.env.TR_JWT;

  console.log("JWT");
  console.log(jwt);

  const fetchNewJWT = await confirm({
    message: "Do you want to fetch a new JWT?",
  });

  if (!jwt || fetchNewJWT) {
    jwt = await authenticate(pin, phone);

    const envFileContent = await getEnvContent();

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() + "/.env",
        `${envFileContent}\nTR_JWT=${jwt}`,
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });
  }

  try {
    const transactions = await fetchAllTransactions(jwt);

    await new Promise<void>((resolve, reject) => {
      fs.writeFile(
        process.cwd() +
          `/cache/response-tr-${new Date().toISOString().split("T")[0]}.json`,
        JSON.stringify(transactions, null, 2),
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        },
      );
    });

    return transactions;
  } catch (e) {
    throw e;
  }
}

async function authenticate(pin: string, phone: string): Promise<string> {
  const result = await trAuthRequest(pin, phone);

  console.log(result);

  const processId = result.processId;
  const countdown = result.countdownInSeconds;
  if (!processId) {
    console.error("Error - Invalid PIN or phone number");
    process.exit(1);
  }

  const code = await input({
    message: `Enter Pin (${countdown}s):`,
  });

  const sessionCookie = await trVerifyCodeRequest(code, processId);
  const sessionToken = sessionCookie.split(";")[0].split("=")[1];
  return sessionToken;
}
