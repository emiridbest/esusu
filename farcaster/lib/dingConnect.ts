/**
 * DingConnect API Client
 * Handles authentication and API requests to DingConnect for international airtime/data PIN top-ups.
 * 
 * Docs: https://www.dingconnect.com/Api
 * 
 * Environment Variables:
 * - DING_API_KEY: API key from DingConnect Developer tab (required)
 * - DING_API_URL: Optional, defaults to https://api.dingconnect.com
 * - DING_SANDBOX_MODE: Set to 'true' to use UAT test numbers
 */

// --- Configuration ---
const DING_API_URL = process.env.DING_API_URL || 'https://api.dingconnect.com';

// Check if in sandbox/test mode
export const isDingSandboxMode = () => process.env.DING_SANDBOX_MODE === 'true';

// --- Types ---
export interface DingProduct {
    SkuCode: string;
    ProviderCode: string;
    LocalizationKey: string;
    Maximum: { ReceiveValue: number; SendValue: number; ReceiveCurrencyIso: string; SendCurrencyIso: string };
    Minimum: { ReceiveValue: number; SendValue: number; ReceiveCurrencyIso: string; SendCurrencyIso: string };
    CommissionRate: number;
    Benefits: { Type: string; Description: string }[];
    RedemptionMechanism: 'Immediate' | 'ReadReceipt'; // 'ReadReceipt' means PIN
    RegionCode: string;
    ProviderLogoUrl?: string;
    CountryIso: string;
    ValidityPeriodIso?: string;
    UatNumber?: string; // UAT test number for sandbox testing
}

export interface DingProvider {
    ProviderCode: string;
    Name: string;
    CountryIso: string;
    LogoUrl?: string;
    RegionCode?: string;
}

export interface DingTransferResult {
    TransferId: string;
    ReceiptText?: string; // This is the PIN for ReadReceipt products
    Status: string;
    ErrorCode?: string;
    ErrorText?: string;
}

// --- API Request Helper ---
async function dingApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiKey = process.env.DING_API_KEY;

    if (!apiKey) {
        throw new Error('DingConnect API key not configured. Set DING_API_KEY environment variable.');
    }

    const url = `${DING_API_URL}${endpoint}`;

    const response = await fetch(url, {
        ...options,
        headers: {
            'api_key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(options.headers || {}),
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`DingConnect API error (${endpoint}):`, errorText);
        throw new Error(`DingConnect API request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
}

// --- Public API Functions ---

/**
 * Get all providers for a specific country.
 */
export async function getDingProviders(countryIso: string): Promise<DingProvider[]> {
    try {
        const result = await dingApiRequest<{ Providers: DingProvider[] }>(`/api/V1/GetProviders?countryIsos=${countryIso.toUpperCase()}`);
        return result.Providers || [];
    } catch (error) {
        console.error(`Error fetching Ding providers for ${countryIso}:`, error);
        return [];
    }
}

/**
 * Get all products for a specific country.
 * Filters for PIN (ReadReceipt) products by default for the "voucher" use case.
 */
export async function getDingProducts(countryIso: string, pinOnly = false): Promise<DingProduct[]> {
    try {
        const result = await dingApiRequest<{ Products: DingProduct[] }>(`/api/V1/GetProducts?countryIsos=${countryIso.toUpperCase()}`);
        let products = result.Products || [];

        if (pinOnly) {
            products = products.filter(p => p.RedemptionMechanism === 'ReadReceipt');
        }

        return products;
    } catch (error) {
        console.error(`Error fetching Ding products for ${countryIso}:`, error);
        return [];
    }
}

/**
 * Execute a top-up transfer.
 * @param skuCode The product SKU to purchase.
 * @param recipientNumber The phone number to top-up (or for PIN, can be a reference).
 * @param sendValue The amount to send in the sender's currency.
 * @param uatNumber Optional UAT test number - used automatically in sandbox mode.
 * @returns Transfer result including the PIN if it's a ReadReceipt product.
 */
export async function sendDingTransfer(
    skuCode: string,
    recipientNumber: string,
    sendValue: number,
    uatNumber?: string
): Promise<DingTransferResult> {
    const sandboxMode = isDingSandboxMode();

    // In sandbox mode, use UAT number for no-cost test transactions
    let actualRecipient = recipientNumber;
    if (sandboxMode && uatNumber) {
        actualRecipient = uatNumber;
        console.log('[DING SANDBOX MODE] Using UAT test number:', actualRecipient);
        console.log('[DING SANDBOX MODE] Original recipient:', recipientNumber);
    }

    const body = {
        SkuCode: skuCode,
        SendValue: sendValue,
        AccountNumber: actualRecipient,
        DistributorRef: `esusu-${Date.now()}`,
        ValidateOnly: false,
        Settings: {
            ValidateAccountNumber: false,
        }
    };

    if (sandboxMode) {
        console.log('[DING SANDBOX MODE] Transfer request:', JSON.stringify(body, null, 2));
    }

    try {
        const result = await dingApiRequest<{ TransferRecord: DingTransferResult }>(
            '/api/V1/SendTransfer',
            { method: 'POST', body: JSON.stringify(body) }
        );

        if (sandboxMode) {
            console.log('[DING SANDBOX MODE] Transfer result:', JSON.stringify(result.TransferRecord, null, 2));
        }

        return result.TransferRecord;
    } catch (error) {
        console.error('Error sending Ding transfer:', error);
        throw error;
    }
}

/**
 * Helper to format Ding products into the app's standard operator format.
 */
export function formatDingProvidersToOperators(providers: DingProvider[]): { id: string; name: string; logoUrls: string[] }[] {
    return providers.map(p => ({
        id: `ding_${p.ProviderCode}`,
        name: p.Name,
        logoUrls: p.LogoUrl ? [p.LogoUrl] : [],
    }));
}

/**
 * Helper to format Ding products into the app's standard plan format.
 * Includes UatNumber for sandbox testing.
 */
export function formatDingProductsToPlans(products: DingProduct[]): {
    id: string;
    name: string;
    price: string;
    description: string;
    dataAmount: string;
    validity: string;
    uatNumber?: string;
}[] {
    return products.map(p => ({
        id: `ding_${p.SkuCode}`,
        name: p.Benefits?.[0]?.Description || p.LocalizationKey || p.SkuCode,
        price: `${p.Minimum.SendValue} ${p.Minimum.SendCurrencyIso}`,
        description: p.RedemptionMechanism === 'ReadReceipt' ? 'PIN/Voucher' : 'Direct Top-up',
        dataAmount: '',
        validity: p.ValidityPeriodIso || 'N/A',
        uatNumber: p.UatNumber,
    }));
}
