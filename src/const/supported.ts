import { InstitutionId } from './enums';

export const supported: Record<InstitutionId, Institution> = {
    [InstitutionId.RAIFFEISEN_AT_RZBAATWW]: {
        id: 'RAIFFEISEN_AT_RZBAATWW',
        name: 'Raiffeisen Bank',
        bic: 'RZBAATWW',
        transaction_total_days: '730',
        max_access_valid_for_days: '180',
    },
    [InstitutionId.TRADE_REPUBLIC]: {
        id: 'TRADE_REPUBLIC',
        name: 'Trade Republic',
        countries: ['AT'],
    },
    [InstitutionId.REVOLUT_REVOLT21]: {
        id: 'REVOLUT_REVOLT21',
        name: 'Revolut',
        bic: 'REVOLT21XXX',
        transaction_total_days: '730',
        max_access_valid_for_days: '180',
    },
    [InstitutionId.FLATEX]: {
        id: 'FLATEX',
        name: 'Flatex',
        countries: ['AT'],
    },
    [InstitutionId.N26_NTSBDEB1]: {
        id: 'N26_NTSBDEB1',
        name: 'N26 Bank',
        bic: 'NTSBDEB1XXX',
        transaction_total_days: '730',
        max_access_valid_for_days: '180',
    },
};

export default async function getSupportedInstitutions(
    countryCode?: string
): Promise<Institution[]> {
    const result = await new Promise<Institution[]>((resolve) => {
        resolve(Object.values(supported) as Institution[]);
    });

    if (countryCode) {
        return result.filter((inst) => inst.countries?.includes(countryCode));
    }

    return result;
}
