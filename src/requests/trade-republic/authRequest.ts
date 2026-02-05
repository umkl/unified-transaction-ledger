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
    "Content-Type": "application/json",
    "Content-Length": 0,
  },
  maxRedirects: 20,
};

export async function trAuthRequest(pin: string, phone: string): Promise<any> {
  return await new Promise(async (resolve, reject) => {
    let body = {
      phoneNumber: phone,
      pin: pin,
    };

    console.log("body");
    console.log(body);

    options.headers["Content-Length"] = Buffer.byteLength(JSON.stringify(body));

    const req = https.request(options, function (res) {
      console.log("got data");
      const chunks: any = [];

      console.log(chunks);

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", function () {
        try {
          const bodyData = Buffer.concat(chunks).toString("utf-8");

          console.log("fetch result:");
          console.log(bodyData);

          const json = JSON.parse(bodyData);

          if (json["status_code"] >= 400) {
            reject(new Error("AUTHENTICATION ISSUE"));
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
    req.write(JSON.stringify(body));
    req.end();
  });
}
