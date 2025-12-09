import { confirm } from "@inquirer/prompts";
import refreshTokenRequest from "./requests/token-refresh";
import { log } from "console";

export async function refreshToken(token: string): Promise<string> {
  const response = await refreshTokenRequest(token);
  return response["access"];
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
