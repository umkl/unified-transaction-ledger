import { Command } from "commander";
import { rl } from "./infra";
import fetchNewTokenPair from "./requests/gcl-new-token-pair";
import fs from "fs";
import { log } from "./utils";
import { setupEnv } from "./lib/setup-env";
import { confirm } from "@inquirer/prompts";
import fetchNewAccessToken from "./requests/gcl-new-access-token";

export async function setupAction(): Promise<void> {
  log("Reading current .env");
  await setupEnv();

  const secretId = await getOrPromptEnvVar("SECRET_ID");
  const secretKey = await getOrPromptEnvVar("SECRET_KEY");
  const accessToken = getOrFetchNewToken(secretId, secretKey);

  log("Setup complete.");
  rl.close();
}

// import refreshTokenRequest from "./requests/token-refresh";

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
  if (!refreshToken) {
    const content = await fetchNewTokenPair(secretId, secretKey);
    process.env["GCL_ACCESS_TOKEN"] = content["access"] as string;
    process.env["GCL_REFRESH_TOKEN"] = content["refresh"] as string;
    return content["access"] as string;
  }

  const result = await fetchNewAccessToken(refreshToken);

  return result;
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
