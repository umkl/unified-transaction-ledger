import { Command } from "commander";
import { rl } from "./infra";
import fetchNewTokenPair from "./requests/gcl-new-token-pair";
import fs from "fs";
import { log } from "./utils";
import { loadEnv, persistEnv } from "./lib/env";
import { confirm } from "@inquirer/prompts";
import fetchNewAccessToken from "./requests/gcl-new-access-token";

export async function setupAction(): Promise<void> {
  log("Reading current .env");
  await loadEnv();

  const secretId = await getOrPromptEnvVar("GCL_SECRET_ID");
  const secretKey = await getOrPromptEnvVar("GCL_SECRET_KEY");
  const accessToken = await getOrFetchNewToken(secretId, secretKey);
  log(accessToken);

  log(process.env["GCL_ACCESS_TOKEN"]!);
  log(process.env["GCL_REFRESH_TOKEN"]!);

  persistEnv([
    "GCL_SECRET_ID",
    "GCL_SECRET_KEY",
    "GCL_ACCESS_TOKEN",
    "GCL_REFRESH_TOKEN",
  ]);
  log("Setup complete.");
  rl.close();
}

export async function getOrFetchNewToken(
  secretId: string,
  secretKey: string,
): Promise<string> {
  const accessToken = await getOrPromptEnvVar("GCL_ACCESS_TOKEN", false);
  const isFetchNewAccessToken = await confirm({
    message: `Do you want to refresh your token?`,
    default: false,
  });

  if (!isFetchNewAccessToken) {
    return accessToken;
  }

  const refreshToken = await getOrPromptEnvVar("GCL_REFRESH_TOKEN", false);
  if (refreshToken) {
    try {
      const result = await fetchNewAccessToken(refreshToken);
      return result;
    } catch (e) {
      log("Couldn't refresh using refresh token.");
      log("Falling back to fetching new token pair.");
    }
  }

  const content = await fetchNewTokenPair(secretId, secretKey);
  process.env["GCL_ACCESS_TOKEN"] = content["access"] as string;
  process.env["GCL_REFRESH_TOKEN"] = content["refresh"] as string;
  return content["access"] as string;
}

async function getOrPromptEnvVar(
  envPropName: string,
  isPromptNewDesired = true,
): Promise<string> {
  const envVar = process.env[envPropName];
  log(
    envVar ? `Found ${envPropName}: ${envVar}` : `${envPropName} wasn't found.`,
  );
  if (!envVar && isPromptNewDesired) {
    return await rl.question(`Enter your ${envPropName}: `);
  }
  return envVar as string;
}
