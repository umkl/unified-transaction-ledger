import { checkbox } from "@inquirer/prompts";
import { brokerizePortfolioRequest } from "./requests/brokerize/portfolioRequest";
import getSupportedInstitutions from "./supported";
import { fetchAccountInformation } from "./tradeRepublic";
import { readConfig } from "./lib/env";

export default async function balanceAction() {
    const institutions = await getSupportedInstitutions();

    const results = institutions.map((inst) => ({
        name: inst.name,
        value: inst.id,
        checked: false,
    }));

    const checkedInstitutions = await checkbox({
        message: "Select your institutions:",
        choices: results,
        required: true,
    });

    const config = await readConfig();

    for (const insti of checkedInstitutions) {
        if (insti === "TRADE_REPUBLIC") {
            const res = await fetchAccountInformation();
            console.log(res);
        }
        if (insti === "FLATEX") {
            const portfolioId = config.BRZ_PORTFOLIO_ID;
            const accessToken = config.BRZ_ACCESS_TOKEN;
            const clientId = config.BRZ_CLIENT_ID;

            brokerizePortfolioRequest(portfolioId, accessToken, clientId).then(
                (x) => {
                    console.log(x);
                },
            );
        }
    }
}
