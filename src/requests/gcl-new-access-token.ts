import { https } from "follow-redirects";
import { log } from "../utils";

var options = {
  method: "POST",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/token/refresh/",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  maxRedirects: 20,
};

export default function fetchNewAccessToken(
  refreshToken: string,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      refresh: refreshToken,
    });

    const req = https.request(options, function (res) {
      let chunks: Array<Buffer> = [];

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
