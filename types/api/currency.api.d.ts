export interface Currency {
    id: string;
    name: string;
    code: string;
    symbol: string;
    isActive: boolean;
}

export type GetCurrenciesResponse = Currency[];
export type GetActiveCurrencyResponse = Currency | null;
