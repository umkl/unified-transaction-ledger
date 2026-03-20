import { https } from "follow-redirects";

const options = {
  method: "GET",
  hostname: "api.brokerize.com",
  path: "/portfolios/W5fLksneuT3aO9YW/quotes",
  headers: {
    Accept: "application/json",
    Origin: "https://stock3.com",
    "x-brkrz-client-id": "",
    Authorization: "",
  },
  maxRedirects: 20,
};

export async function brokerizePortfolioRequest(
  portfolioId: string,
  accessToken: string,
  clientId: string,
  origin = "https://stock3.com",
): Promise<any> {
  return await new Promise(async (resolve, reject) => {
    options.headers.Authorization = `Bearer ${accessToken}`;
    options.headers["x-brkrz-client-id"] = clientId;
    options.headers.Origin = origin;
    options.path = `/portfolios/${portfolioId}/quotes`;

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

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.on("error", reject);
    req.end();
  });
}
