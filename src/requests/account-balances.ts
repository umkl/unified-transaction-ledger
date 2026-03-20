import { https } from "follow-redirects";
import fs from "node:fs";
import path from "node:path";
import { getConfigPath } from "../lib/env";

const options = {
    method: "GET",
    hostname: "bankaccountdata.gocardless.com",
    path: "/api/v2/accounts/00000000-0000-0000-0000-000000000000/balances/",
    headers: {
        Accept: "application/json",
        Authorization: "",
    },
    maxRedirects: 20,
};

export async function listBalancesRequest(
    accessToken: string,
    accountId: string,
    institutionId: string,
): Promise<any> {
    return await new Promise((resolve, reject) => {
        options.headers.Authorization = `Bearer ${accessToken}`;
        options.path = `/api/v2/accounts/${accountId}/balances/`;

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
                        return;
                    }
                    const date = new Date().toISOString().split("T")[0];
                    const configDir = path.dirname(getConfigPath());
                    const cachePath = path.join(
                        configDir,
                        `balance-response-${accountId}-${institutionId}-${date}.json`,
                    );
                    fs.writeFile(
                        cachePath,
                        JSON.stringify(json, null, 2),
                        () => resolve(json),
                    );
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
