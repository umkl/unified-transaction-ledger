import { https } from "follow-redirects";
import fs from "node:fs";

const options = {
  method: "GET",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/accounts/1b686203-f5b6-4198-b983-0b7e9bbd4085/transactions/?date_from=2025-09-05&date_to=2025-12-04",
  headers: {
    Accept: "application/json",
    Authorization: "",
  },
  maxRedirects: 20,
};

export async function listTransactionsRequest(
  accessToken: string,
  accountId: string
): Promise<any[]> {
  return await new Promise((resolve, reject) => {
    options.headers.Authorization = `Bearer ${accessToken}`;
    options.path = `/api/v2/accounts/${accountId}/transactions/?date_from=2025-09-05&date_to=2025-12-04`;

    const req = https.request(options, function (res) {
      const chunks: any = [];

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
          new Promise<void>((writeResolve) => {
            try {
              fs.writeFile(
                `${process.cwd()}/cache/response-${accountId}.json`,
                JSON.stringify(json, null, 2),
                () => {
                  writeResolve();
                }
              );
            } catch (err) {
              throw err;
            }
          }).then(() => {
            resolve(json);
          });
        } catch (err) {
          reject(err);
        }
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.end();
  });
}
