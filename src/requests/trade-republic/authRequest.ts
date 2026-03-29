import { https } from "follow-redirects";

const options = {
    method: "POST",
    hostname: "api.traderepublic.com",
    path: "/api/v1/auth/web/login",
    headers: {
        accept: "*/*",
        "accept-language": "en",
        "content-type": "application/json",
        priority: "u=1, i",
        "sec-ch-ua":
            '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "x-aws-waf-token":
            "4a1a5c5a-257b-4cbf-ab86-8d89e9f5898e:CQoAb5V4iQ4DAAAA:1jfXgMBeEwx2CCvwyotf9Aq1he0CuF5Zd/63De4MJP0kqbHN8rWcZsoXsyu69NPtxypif/i7ZnVlHTVy7ohj3WcPJH5JqKY4tSld16PWtpQjOHeYQ8iwxvmPUVUloFci0zI2lqWh1x6tbt7Mgd+rDdkR+J0i4JnjDtw3h2u/1DanTyXDiXs3CnRy1QoH9yLD08XKUG7Da/YSdTVhVyIxccFmJ/tXAF8D3umXj5bw48PKysWgcr775uHjZQ==",
        "x-tr-app-version": "14.23.3",
        "x-tr-device-info":
            "eyJzdGFibGVEZXZpY2VJZCI6IjM2YjhmNGI3ZTRkM2RmNDM1NzFiNjIxMjc1ZGEwNDIwMTNjMWVmMDgzMWI0NjI1ZjUwNWNiMWQ5Yzg1YTJkMzU0MTMyMTUzNTI5MTU5NDYzNDU3YzNhNDU0Yjk4MTE0YmNlODZhZWU0OTFjODEwNDAxNWEzNWMxYzA5MGIwYzljIiwibW9kZWwiOiJBcHBsZSBNYWNpbnRvc2giLCJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3NlclZlcnNpb24iOiIxNDguMC4wLjAiLCJvcyI6Ik1hYyBPUyIsIm9zVmVyc2lvbiI6IjEwLjE1LjciLCJ0aW1lem9uZSI6IkV1cm9wZS9WaWVubmEiLCJ0aW1lem9uZU9mZnNldCI6LTYwLCJzY3JlZW4iOiI1MTIweDE0NDB4MjQiLCJwcmVmZXJyZWRMYW5ndWFnZXMiOlsiZW4tVVMiXSwibnVtYmVyT2ZDb3JlcyI6MTAsImRldmljZU1lbW9yeSI6MTZ9",
        "x-tr-platform": "web",
        cookie:
            "i18n_redirected=en; tr_appearance=Light; analytics=grant; marketing=grant; JSESSIONID=4AC8B20444343E1C488156475526D987; aws-waf-token=4a1a5c5a-257b-4cbf-ab86-8d89e9f5898e:CQoAb5V4iQ4DAAAA:1jfXgMBeEwx2CCvwyotf9Aq1he0CuF5Zd/63De4MJP0kqbHN8rWcZsoXsyu69NPtxypif/i7ZnVlHTVy7ohj3WcPJH5JqKY4tSld16PWtpQjOHeYQ8iwxvmPUVUloFci0zI2lqWh1x6tbt7Mgd+rDdkR+J0i4JnjDtw3h2u/1DanTyXDiXs3CnRy1QoH9yLD08XKUG7Da/YSdTVhVyIxccFmJ/tXAF8D3umXj5bw48PKysWgcr775uHjZQ==",
    } as any,
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

        options.headers["content-length"] = Buffer.byteLength(
            JSON.stringify(body),
        );

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

                    if (!bodyData) {
                        const status = res.statusCode ?? "unknown";
                        const contentType =
                            res.headers["content-type"] ?? "unknown";
                        reject(
                            new Error(
                                `Empty response. status=${status} content-type=${contentType}`,
                            ),
                        );
                        return;
                    }

                    let json: any;
                    try {
                        json = JSON.parse(bodyData);
                    } catch (parseErr) {
                        const status = res.statusCode ?? "unknown";
                        const contentType =
                            res.headers["content-type"] ?? "unknown";
                        reject(
                            new Error(
                                `Non-JSON response. status=${status} content-type=${contentType} body=${bodyData.slice(
                                    0,
                                    500,
                                )}`,
                            ),
                        );
                        return;
                    }

                    console.log(json);

                    if (
                        (res.statusCode ?? 0) >= 400 ||
                        json["status_code"] >= 400
                    ) {
                        reject(new Error("AUTHENTICATION ISSUE"));
                        return;
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
