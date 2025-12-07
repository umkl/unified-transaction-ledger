import { https } from "follow-redirects";
import { log } from "../utils";

const options = {
  method: "GET",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/requisitions/f3b3720e-5010-4de3-84db-f5ce56259263/",
  headers: {
    Accept: "application/json",
    Authorization: "",
    Cookie:
      "__cf_bm=CQKPprvPX_goL48ZRwK1MQ7x9W7nfUyBw3pJPwV6tBI-1765028055-1.0.1.1-XMfhsdFqu6CH3n60cy7fgYyv5B2_KGj2_TeEHHgI6YSmdhPOJHa5OTnfmOBwrvzZBRAPuipolRLkrUnrs1zH2HLrRVR9XTjFfH37uzPxdZk",
  },
  maxRedirects: 20,
};

export async function listAccounts(
  accessToken: string,
  reqId: string
): Promise<string[]> {
  return await new Promise((resolve, reject) => {
    options.headers.Authorization = `Bearer ${accessToken}`;
    options.path = `/api/v2/requisitions/${reqId}`;

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
          resolve(json["accounts"] as string[]);
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
