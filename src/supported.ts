const supported = [
    {
        id: "RAIFFEISEN_AT_RZBAATWW",
        name: "Raiffeisen Bank",
        bic: "RZBAATWW",
        transaction_total_days: "730",
        max_access_valid_for_days: "180",
    },
    {
        id: "TRADE_REPUBLIC",
        name: "Trade Republic",
        countries: ["AT"],
    },
    {
        id: "REVOLUT_REVOLT21",
        name: "Revolut",
        bic: "REVOLT21XXX",
        transaction_total_days: "730",
        max_access_valid_for_days: "180",
    },
    {
        id: "FLATEX",
        name: "Flatex",
        countries: ["AT"],
    },
    {
        id: "N26_NTSBDEB1",
        name: "N26 Bank",
        bic: "NTSBDEB1XXX",
        transaction_total_days: "730",
        countries: ["AT"],
        logo: "https://storage.googleapis.com/gc-prd-institution_icons-production/DE/PNG/n26.png",
        max_access_valid_for_days: "180",
    },
] as unknown as Institution[];

export default async function getSupportedInstitutions(
    countryCode?: string,
): Promise<Institution[]> {
    const result = await new Promise<Institution[]>((resolve) => {
        resolve(supported);
    });
    if (countryCode) {
        return result.filter((inst) => inst.countries?.includes(countryCode));
    }
    return result;
}
