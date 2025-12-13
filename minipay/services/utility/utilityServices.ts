// Utility service for interacting with Reloadly services through our API endpoints
import { countryCodeToISO2 } from './countryData';

export type NetworkOperator = {
    id: string;
    name: string;
    logoUrls: string[];
    supportsData: boolean;
    supportsBundles: boolean;
};

export type AirtimeOperator = {
    id: string;
    name: string;
    logoUrls: string[];
    supportsTopup: boolean;
};

export type DataPlan = {
    id: string;
    name: string;
    price: string;
    description: string;
    dataAmount: string;
    validity: string;
};
export type PriceRange = {
    localMinAmount: number;
    localMaxAmount: number;
};
export type AirtimeAmount = {
    id: string;
    name: string;
    amount: number;
};

export type CableProvider = {
    id: string;
    name: string;
    logoUrls: string[];
    supportsPackages: boolean;
};

export type CablePackage = {
    id: string;
    name: string;
    description: string;
    price: string;
    validity: string;
    packageType: string;
};

export type ElectricityProvider = {
    id: string;
    name: string;
    logoUrls: string[];
    accountNumberRegex: string | null;
    accountNumberMask: string | null;
    currencyCode: string;
};

/**
 * Fetch mobile operators for a specific country that support data bundles
 */
export async function fetchMobileOperators(countryCode: string): Promise<NetworkOperator[]> {
    if (!countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/data/providers?country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch mobile operators: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching mobile operators:', error);
        return [];
    }
}

/**
 * Fetch data plans for a specific mobile operator and country
 */
export async function fetchDataPlans(operatorId: string, countryCode: string): Promise<DataPlan[]> {
    if (!operatorId || !countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/data/bundles?provider=${operatorId}&country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch data plans: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching data plans:', error);
        return [];
    }
}



/**
 * Verify a phone number with a specific mobile provider
 * Returns verification status with suggested provider if available
 */
export async function verifyPhoneNumber(phoneNumber: string, providerId: string, countryCode: string): Promise<{
    verified: boolean;
    message: string;
    operatorName?: string;
    suggestedProvider?: { id: string; name: string };
    autoSwitched?: boolean;
}> {
    if (!phoneNumber || !providerId || !countryCode) {
        return { verified: false, message: 'Missing required information' };
    }

    // Clean the phone number - remove spaces, dashes, etc.
    const cleanedPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {

        const response = await fetch(`/api/utilities/data/verify?phoneNumber=${cleanedPhoneNumber}&provider=${providerId}&country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Verification API returned status: ${response.status}`);
        }

        const result = await response.json();

        // Handle case where verification failed but a suggestion is available
        if (!result.verified && result.suggestedProvider) {
        }

        return result;
    } catch (error) {
        console.error('Error verifying phone number:', error);
        return {
            verified: false,
            message: error instanceof Error ? error.message : 'Failed to verify phone number'
        };
    }
}

/**
 * Verify phone number and automatically switch to the correct provider if needed
 */
export async function verifyAndSwitchProvider(phoneNumber: string, providerId: string, countryCode: string): Promise<{
    verified: boolean;
    message: string;
    operatorName?: string;
    suggestedProvider?: { id: string; name: string };
    autoSwitched?: boolean;
    correctProviderId?: string;
}> {
    const result = await verifyPhoneNumber(phoneNumber, providerId, countryCode);

    // If verification failed but we have a suggested provider, retry with that provider
    if (!result.verified && result.suggestedProvider && result.suggestedProvider.id) {

        const retryResult = await verifyPhoneNumber(phoneNumber, result.suggestedProvider.id, countryCode);

        if (retryResult.verified) {
            return {
                ...retryResult,
                autoSwitched: true,
                correctProviderId: result.suggestedProvider.id,
                message: `Automatically switched to ${result.suggestedProvider.name} which matches your phone number`
            };
        }
    }

    return result;
}

/**
 * Fetch cable TV providers for a specific country
 */
export async function fetchCableProviders(countryCode: string): Promise<CableProvider[]> {
    if (!countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/cable/providers?country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch cable providers: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching cable providers:', error);
        return [];
    }
}

/**
 * Fetch cable TV packages for a specific provider and country
 */
export async function fetchCablePackages(providerId: string, countryCode: string): Promise<CablePackage[]> {
    if (!providerId || !countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/cable/packages?provider=${providerId}&country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch cable packages: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching cable packages:', error);
        return [];
    }
}

/**
 * Fetch electricity providers for a specific country
 */
export async function fetchElectricityProviders(countryCode: string): Promise<ElectricityProvider[]> {
    if (!countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/electricity/providers?country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch electricity providers: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching electricity providers:', error);
        return [];
    }
}

export type MeterVerificationResult = {
    verified: boolean;
    message?: string;
    customerName?: string;
    customerAddress?: string;
};

export async function verifyMeterNumber(
    meterNumber: string,
    providerId: string,
    countryCode: string
): Promise<MeterVerificationResult> {
    try {
        // TODO: Replace with actual API call to verify meter number
        // Simulating API response for now
        return {
            verified: true,
            customerName: "Sample Customer",
            customerAddress: "Sample Address"
        };
    } catch (error) {
        console.error("Error verifying meter number:", error);
        return {
            verified: false,
            message: "Failed to verify meter number. Please try again."
        };
    }
}

/**
 * Verifies a subscriber ID with the specified provider
 * @param subscriberId The subscriber ID to verify
 * @param providerId The provider ID
 * @param countryCode The country code
 * @returns A verification result object 
 */
export async function verifySubscriberID(subscriberId: string, providerId: string, countryCode: string): Promise<{ verified: boolean; message?: string }> {
    try {
        // TODO: Implement actual verification logic using the API
        // For now, use simulated implementation
        // Simulate API call delay 
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Return success
        return { verified: true };

        // Note: This code below was unreachable. Commented out for future implementation.
        // const response = await fetch('/api/cable/verify', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ subscriberId, providerId, countryCode })
        // });
        // return await response.json();
    } catch (error) {
        console.error("Error verifying subscriber ID:", error);
        return { verified: false, message: "Failed to verify subscriber ID. Please check the ID and try again." };
    }
}

/**
 * Fetch mobile operators for airtime for a specific country
 */
export async function fetchAirtimeOperators(countryCode: string): Promise<AirtimeOperator[]> {
    if (!countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/airtime/providers?country=${iso2Code}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch airtime operators: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching airtime operators:', error);
        return [];
    }
}

/**
 * Fetch available airtime amounts for a specific operator and country
 */
export async function fetchAirtimeAmounts(operatorId: string, countryCode: string): Promise<AirtimeAmount[]> {
    if (!operatorId || !countryCode) return [];

    // Convert country code to ISO2 format if needed
    const iso2Code = countryCodeToISO2(countryCode);

    try {
        const response = await fetch(`/api/utilities/airtime/amounts?provider=${operatorId}&country=${iso2Code}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch airtime amounts: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching airtime amounts:', error);
        return [];
    }
}
