import { https } from "follow-redirects";
import { log } from "node:console";
import fs from "node:fs";

const options = {
  method: "POST",
  hostname: "api.traderepublic.com",
  path: "/api/v1/auth/web/login",
  headers: {
    accept: "*/*",
    "accept-language": "en",
    "content-length": 0,
    "content-type": "application/json",
    origin: "https://app.traderepublic.com",
    priority: "u=1, i",
    "sec-ch-ua":
      '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "x-aws-waf-token":
      "ecc51b57-6aeb-417f-8741-009da0d97707:CQoAY1dDUc1WAAAA:WCdWOAocK2tt3vpIbHXquH99MMwq5fi3+/gfqksMv52rX4no3FS+1diOg7kcg0q+lmshKwLpMWSDNhpfSZMdmWaHe/GYBJQL+GxBU+2nt0yAi4jBAZzCjXDto0vDPwGqu/cT2MfN6qtYaTXSocFMM9O3f5ELI+Dcbm64cbcAdl0TBccNu+oSJUjZ8kM1aBGiL1pEUB8dBLrsPL/WlDjxxTUlC9WtTvj+0MdVKco2ejfh+YixNEVtL/VvPq6c5ijE5lT0m6KiSLY=",
    "x-tr-app-version": "14.23.3",
    "x-tr-device-info":
      "eyJzdGFibGVEZXZpY2VJZCI6IjM2YjhmNGI3ZTRkM2RmNDM1NzFiNjIxMjc1ZGEwNDIwMTNjMWVmMDgzMWI0NjI1ZjUwNWNiMWQ5Yzg1YTJkMzU0MTMyMTUzNTI5MTU5NDYzNDU3YzNhNDU0Yjk4MTE0YmNlODZhZWU0OTFjODEwNDAxNWEzNWMxYzA5MGIwYzljIiwibW9kZWwiOiJBcHBsZSBNYWNpbnRvc2giLCJicm93c2VyIjoiQ2hyb21lIiwiYnJvd3NlclZlcnNpb24iOiIxNDguMC4wLjAiLCJvcyI6Ik1hYyBPUyIsIm9zVmVyc2lvbiI6IjEwLjE1LjciLCJ0aW1lem9uZSI6IkV1cm9wZS9WaWVubmEiLCJ0aW1lem9uZU9mZnNldCI6LTEyMCwic2NyZWVuIjoiMjU2MHgxMDgweDI0IiwicHJlZmVycmVkTGFuZ3VhZ2VzIjpbImVuLVVTIiwiZW4iXSwibnVtYmVyT2ZDb3JlcyI6MTAsImRldmljZU1lbW9yeSI6MTZ9",
    "x-tr-platform": "web",
    cookie:
      "tr_appearance=Light; _gcl_au=1.1.11361988.1773940363; tr_device=2492a4ba-e88e-4340-9bd0-7004e09863ba; FPID=FPID2.2.NIfM1920i6CJtGT%2BeEgIjN6d6%2BERGBbCp6%2BhU3r3E%2F4%3D.1773940363; analytics=grant; marketing=grant; _twpid=tw.1774781116463.145973237815870849; _fbp=fb.1.1774781128900.708820695748371007; _gid=GA1.2.128527156.1775207507; _ga=GA1.1.218379440.1773940363; _uetsid=24a597302f3d11f1a0e9cd7b42bf7d89; _uetvid=5f00fba02b5c11f19583e9b6feb1b92a; _ga_ZSXFTWT6PV=GS2.1.s1775207507$o2$g0$t1775207507$j60$l0$h0; i18n_redirected=en; FPLC=iTOK5Tca2yBnj8yo3S5%2FS1iRzL19MXoeIlhr5bni%2FxT1kG084rmjedVi6vnrJOfd%2FHRXKr8UF26pTGgcRh63Z07tudbhX0763W9aGSMsK8BrtQAh%2FeffdOV72YNj9g%3D%3D; _ga_123456789=GS2.1.s1775207541$o4$g1$t1775208822$j60$l0$h193223730; _ga_B4DCM46WX1=GS2.1.s1775207507$o5$g1$t1775208824$j58$l0$h0; JSESSIONID=61222D87C045122B3578B997412EBF0C; _ga_N0BPVYT95P=GS2.1.s1775207508$o5$g1$t1775209073$j60$l0$h0; _ga_PVRF6YC9F3=GS2.1.s1775207507$o6$g1$t1775209074$j59$l0$h0; _ga_LRV2S9QZ6F=GS2.1.s1775207507$o5$g1$t1775209074$j59$l0$h0; aws-waf-token=ecc51b57-6aeb-417f-8741-009da0d97707:CQoAY1dDUc1WAAAA:WCdWOAocK2tt3vpIbHXquH99MMwq5fi3+/gfqksMv52rX4no3FS+1diOg7kcg0q+lmshKwLpMWSDNhpfSZMdmWaHe/GYBJQL+GxBU+2nt0yAi4jBAZzCjXDto0vDPwGqu/cT2MfN6qtYaTXSocFMM9O3f5ELI+Dcbm64cbcAdl0TBccNu+oSJUjZ8kM1aBGiL1pEUB8dBLrsPL/WlDjxxTUlC9WtTvj+0MdVKco2ejfh+YixNEVtL/VvPq6c5ijE5lT0m6KiSLY=",
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
    req.end();
  });
}
