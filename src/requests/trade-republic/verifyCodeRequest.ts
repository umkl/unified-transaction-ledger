import { https } from "follow-redirects";
import { log } from "node:console";
import fs from "node:fs";

const options = {
  method: "POST",
  hostname: "api.traderepublic.com",
  path: "/api/v1/auth/web/login",
  headers: {
    Accept: "application/json",
    Authorization: "",
  },
  maxRedirects: 20,
};

export async function trVerifyCodeRequest(
  code: string,
  processId: string,
): Promise<any> {
  return await new Promise(async (resolve, reject) => {
    console.log(processId);
    console.log(code);
    options.path = `/api/v1/auth/web/login/${processId}/${code}`;

    const req = https.request(options, function (res) {
      const chunks: any = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const bodyData = Buffer.concat(chunks).toString("utf-8").trim();

        // 1. Log exactly what we got (for debugging)
        console.log("Raw body received:", `"${bodyData}"`);

        // 2. Handle empty response body
        if (!bodyData) {
          console.log("Received empty body, checking headers for cookies...");
        } else {
          try {
            const json = JSON.parse(bodyData);
            console.log("Parsed JSON:", json);
          } catch (err) {
            console.error("Failed to parse JSON. Body was:", bodyData);
            // Don't reject yet, you might still have the cookie in the headers!
          }
        }

        // 3. Proceed to check headers regardless of the body
        const setCookie = res.headers["set-cookie"] || [];
        const sessionCookie = setCookie.find((c) =>
          c.startsWith("tr_session="),
        );

        if (sessionCookie) {
          resolve(sessionCookie);
        } else {
          reject(new Error("No tr_session found and no valid JSON body."));
        }
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.on("error", reject);
    req.write(JSON.stringify({}));
    req.end();
  });
}
