import https from "node:https";

const options: any = {
  method: "POST",
  hostname: "bankaccountdata.gocardless.com",
  path: "/api/v2/requisitions/",
  port: 443,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
};

export async function createRequisition(
  accessToken: string,
  instiutionId: string
): Promise<object> {
  const bodyData = JSON.stringify({
    institution_id: instiutionId,
    redirect: "http://localhost:3000/callback",
  });

  return await new Promise((resolve, reject) => {
    options.headers.Authorization = `Bearer ${accessToken}`;
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
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.write(bodyData);
    req.end();
  });
}
