import https from "https";
import { log } from "../utils";

const options: any = {
  method: "GET",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/institutions",
  port: 443,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export async function getInstitutions(accessToken: string, country: string) {
  return await new Promise((resolve, reject) => {
    options.headers.Authorization = `Bearer ${accessToken}`;
    options.path = `/api/v2/institutions/?country=${country}`;
    const req = https.request(options, function (res) {
      const chunks: any = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        try {
          const bodyData = Buffer.concat(chunks).toString("utf-8");
          const json = JSON.parse(bodyData);
          log("Received token response:", json["status_code"]);
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
    req.end();
  });
}
