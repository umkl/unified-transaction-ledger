import { https } from "follow-redirects";
import { log } from "../utils";

const options = {
  method: "POST",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/token/new/",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  maxRedirects: 20,
};

export default async function fetchNewTokenPair(
  secretId: string,
  secretKey: string,
): Promise<Record<string, unknown>> {
  return await new Promise((resolve, reject) => {
    var postData = JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey,
    });

    const req = https.request(options, function (res) {
      let chunks: any = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        try {
          const bodyData = Buffer.concat(chunks).toString("utf-8");
          const json = JSON.parse(bodyData);
          if (json["status_code"] >= 400) {
            reject(new Error(`Error response: ${bodyData}`));
          }
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.on("error", (err) => {
      reject(err);
    });
    req.write(postData);
    req.end();
  });
}
