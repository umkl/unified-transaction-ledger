import { confirm } from "@inquirer/prompts";
import refreshTokenRequest from "./requests/token-refresh";

export async function refreshToken(token: string): Promise<string> {
  const response = await refreshTokenRequest(token);
  return response["access"];
}
