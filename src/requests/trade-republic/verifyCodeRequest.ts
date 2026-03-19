import { https } from "follow-redirects";
import { log } from "node:console";
import fs from "node:fs";

const options = {
  method: "POST",
  hostname: "api.traderepublic.com",
  path: "/api/v1/auth/web/login",
  headers: {
    Accept: "*/*",
    "Accept-Language": "en",
    "Content-Type": "application/json",
    "Content-Length": 0,
    Origin: "https://app.traderepublic.com",
    Priority: "u=1, i",
    "Sec-CH-UA": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"macOS"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "x-aws-waf-token":
      "f4414de5-fbaa-45e7-8ddc-e8e001b1b00d:CQoAglR4ONmMAAAA:oHsfje8jXy+x9aZpKH57SQBxVRlymxgbYhA63MRBkRT91rJHK45+kLc0QU6bVjPEFRoZFkLniJBtEWA2rxPzZS5IVjDXF505OUa0fCmD3FRYdGMUkfNVzUeCCieF7QOfMlFqaYv36ZnXTawunC7s3aR7klcU64/4lFQ6Vfnd2Fvnt+Nd/qmJdvfwC+DPc9Ka+gKPpNs8v6puFa5jnuq3VY4DtBjdFcgN+xVjBe0bdW16UYrDHED2IiUkRA==",
    "x-tr-app-version": "13.40.5",
    "x-tr-device-info":
      "eyJzdGFibGVEZXZpY2VJZCI6IjM2YjhmNGI3ZTRkM2RmNDM1NzFiNjIxMjc1ZGEwNDIwMTNjMWVmMDgzMWI0NjI1ZjUwNWNiMWQ5Yzg1YTJkMzU0MTMyMTUzNTI5MTU5NDYzNDU3YzNhNDU0Yjk4MTE0YmNlODZhZWU0OTFjODEwNDAxNWEzNWMxYzA5MGIwYzljIiwibW9kZWwiOiJBcHBsZSBNYWNpbnRvc2giLCJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3NlclZlcnNpb24iOiIxNDguMC4wLjAiLCJvcyI6Ik1hYyBPUyIsIm9zVmVyc2lvbiI6IjEwLjE1LjciLCJ0aW1lem9uZSI6IkV1cm9wZS9WaWVubmEiLCJ0aW1lem9uZU9mZnNldCI6LTYwLCJzY3JlZW4iOiI1MTIweDE0NDB4MjQiLCJwcmVmZXJyZWRMYW5ndWFnZXMiOlsiZW4tVVMiLCJlbiJdLCJudW1iZXJPZkNvcmVzIjoxMCwiZGV2aWNlTWVtb3J5IjoxNn0=",
    "x-tr-platform": "web",
    Cookie:
      "i18n_redirected=en; tr_appearance=Light; analytics=grant; marketing=grant; _gcl_au=1.1.11361988.1773940363; _ga_N0BPVYT95P=GS2.1.s1773940363$o1$g0$t1773940363$j60$l0$h0; _ga=GA1.1.218379440.1773940363; _ga_PVRF6YC9F3=GS2.1.s1773940363$o1$g1$t1773940363$j60$l0$h0; _ga_LRV2S9QZ6F=GS2.1.s1773940363$o1$g1$t1773940363$j60$l0$h0; _ga_B4DCM46WX1=GS2.1.s1773940363$o1$g0$t1773940363$j60$l0$h0; aws-waf-token=f4414de5-fbaa-45e7-8ddc-e8e001b1b00d:CQoAglR4ONmMAAAA:oHsfje8jXy+x9aZpKH57SQBxVRlymxgbYhA63MRBkRT91rJHK45+kLc0QU6bVjPEFRoZFkLniJBtEWA2rxPzZS5IVjDXF505OUa0fCmD3FRYdGMUkfNVzUeCCieF7QOfMlFqaYv36ZnXTawunC7s3aR7klcU64/4lFQ6Vfnd2Fvnt+Nd/qmJdvfwC+DPc9Ka+gKPpNs8v6puFa5jnuq3VY4DtBjdFcgN+xVjBe0bdW16UYrDHED2IiUkRA==",
  },
  maxRedirects: 20,
};

export async function trVerifyCodeRequest(
  code: string,
  processId: string,
): Promise<any> {
  return await new Promise(async (resolve, reject) => {
    console.log(processId);
    console.log(code);
    options.path = `/api/v1/auth/web/login/${processId}/${code}`;

    const req = https.request(options, function (res) {
      const chunks: any = [];

      res.on("data", function (chunk) {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const bodyData = Buffer.concat(chunks).toString("utf-8").trim();

        // 1. Log exactly what we got (for debugging)
        console.log("Raw body received:", `"${bodyData}"`);

        // 2. Handle empty response body
        if (!bodyData) {
          console.log("Received empty body, checking headers for cookies...");
        } else {
          try {
            const json = JSON.parse(bodyData);
            console.log("Parsed JSON:", json);
          } catch (err) {
            console.error("Failed to parse JSON. Body was:", bodyData);
            // Don't reject yet, you might still have the cookie in the headers!
          }
        }

        // 3. Proceed to check headers regardless of the body
        const setCookie = res.headers["set-cookie"] || [];
        const sessionCookie = setCookie.find((c) =>
          c.startsWith("tr_session="),
        );

        if (sessionCookie) {
          resolve(sessionCookie);
        } else {
          reject(new Error("No tr_session found and no valid JSON body."));
        }
      });

      res.on("error", function (error) {
        reject(error);
      });
    });

    req.on("error", reject);
    req.write(JSON.stringify({}));
    req.end();
  });
}
