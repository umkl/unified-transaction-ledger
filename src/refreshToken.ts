import refreshTokenRequest from "./requests/token-refresh";
import { log } from "console";

export async function refreshToken(token: string): Promise<string>  {
  try {
    const response = await refreshTokenRequest(token);
    log("Successfully refreshed token!");
    return response["access"];
  }catch(e){
    log("Failed to refresh token:", e);
    throw e;
  }

}
