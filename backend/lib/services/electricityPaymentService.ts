import axios from 'axios';
import { config } from '../config';

// Interfaces for electricity providers
export interface ElectricityProvider {
  id: string;
  name: string;
  serviceType: string;
  minAmount: number;
  maxAmount: number;
  currency: string;
  country: string;
}

export interface ElectricityValidationRequest {
  providerId: string;
  customerId: string;
  country: string;
}

export interface ElectricityValidationResponse {
  valid: boolean;
  customerName?: string;
  customerAddress?: string;
  tariff?: string;
  outstandingAmount?: number;
  error?: string;
}

export interface ElectricityPaymentRequest {
  providerId: string;
  customerId: string;
  amount: number;
  customerPhone?: string;
  customerEmail?: string;
  country: string;
  requestReference: string;
}

export interface ElectricityPaymentResponse {
  success: boolean;
  transactionRef: string;
  approvedAmount: number;
  responseCode: string;
  responseDescription: string;
  token?: string; // For prepaid meters
  units?: number; // For prepaid meters
  error?: string;
}

export interface ElectricityTransactionStatusResponse {
  status: 'pending' | 'completed' | 'failed';
  transactionRef: string;
  amount: number;
  responseDescription: string;
  completedAt?: Date;
}

// Reloadly API service for all countries including Nigeria
class ReloadlyElectricityService {
  private baseUrl = config.RELOADLY_UTILITIES_BASE_URL;
  private authUrl = config.RELOADLY_AUTH_URL;
  private clientId = config.RELOADLY_CLIENT_ID;
  private clientSecret = config.RELOADLY_CLIENT_SECRET;
  private isSandbox = config.RELOADLY_SANDBOX_MODE;
  private acceptHeader = config.RELOADLY_ACCEPT_HEADER_BILLER;
  
  private tokenCache: { token: string; expiresAt: number } = { token: '', expiresAt: 0 };

  async getAccessToken(): Promise<string> {
    if (this.tokenCache.token && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Reloadly credentials not configured');
    }

    try {
      if (!this.authUrl) {
        throw new Error('Reloadly auth URL not configured');
      }
      
      const audience = config.RELOADLY_UTILITIES_AUDIENCE_URL || this.baseUrl;
      
      console.log('Reloadly: Making auth request with:', {
        authUrl: this.authUrl,
        clientId: this.clientId?.substring(0, 8) + '...',
        audience: audience,
        grantType: 'client_credentials'
      });
      
      const response = await axios.post(this.authUrl, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        audience: audience
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      const { access_token, expires_in } = response.data;
      this.tokenCache.token = access_token;
      this.tokenCache.expiresAt = Date.now() + (expires_in * 1000) - 60000;
      
      return access_token;
    } catch (error) {
      console.error('Reloadly token generation failed:', error);
      throw new Error('Failed to authenticate with Reloadly');
    }
  }

  async getElectricityProviders(countryCode: string): Promise<ElectricityProvider[]> {
    try {
      console.log(`Reloadly: Fetching electricity providers for ${countryCode}`);
      console.log(`Reloadly Config:`, {
        baseUrl: this.baseUrl,
        authUrl: this.authUrl,
        isSandbox: this.isSandbox,
        hasClientId: !!this.clientId,
        hasClientSecret: !!this.clientSecret,
        audienceUrl: config.RELOADLY_UTILITIES_AUDIENCE_URL,
        configuredAudience: config.RELOADLY_UTILITIES_AUDIENCE_URL || this.baseUrl
      });
      
      if (!this.baseUrl) {
        throw new Error('Reloadly utilities base URL not configured');
      }
      
      const token = await this.getAccessToken();
      console.log(`Reloadly: Got access token for electricity providers`);
      
      const requestUrl = `${this.baseUrl}/billers`;
      const params = { 
        id: '',
        name: '',
        type: '',
        serviceType: '',
        countryISOCode: countryCode.toUpperCase(),
        page: '',
        size: ''
      };
      
      console.log(`Reloadly: Making request to ${requestUrl} with params:`, params);
      
      const response = await axios.get(requestUrl, {
        params,
        headers: {
          'Accept': 'application/com.reloadly.utilities-v1+json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`Reloadly: Response status ${response.status}`);
      console.log(`Reloadly: Response data:`, JSON.stringify(response.data, null, 2));
      
      const billers = response.data.content || response.data || [];
      
      if (!Array.isArray(billers)) {
        console.error('Reloadly: Expected array of billers, got:', typeof billers, billers);
        return [];
      }
      
      const providers = billers.map((biller: any) => ({
        id: biller.id?.toString() || biller.billerId?.toString(),
        name: biller.name || biller.billerName || 'Unknown Provider',
        serviceType: 'electricity',
        minAmount: biller.minLocalTransactionAmount || 1,
        maxAmount: biller.maxLocalTransactionAmount || 100000,
        currency: biller.localTransactionCurrencyCode || 'USD',
        country: countryCode.toLowerCase()
      }));
      
      console.log(`Reloadly: Mapped ${providers.length} electricity providers for ${countryCode}`);
      return providers;
    } catch (error: any) {
      console.error('Failed to fetch Reloadly electricity providers:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        countryCode
      });
      throw new Error(`Reloadly electricity providers API failed: ${error.message}`);
    }
  }

  async validateCustomer(request: ElectricityValidationRequest): Promise<ElectricityValidationResponse> {
    try {
      const token = await this.getAccessToken();
      // Fetch providers and get minAmount for the selected provider
      let minAmount: number | undefined;
      try {
        const providers = await this.getElectricityProviders(request.country);
        const provider = providers.find(p => p.id === request.providerId);
        if (provider && provider.minAmount) {
          minAmount = provider.minAmount;
        }
      } catch (err) {
        // If provider fetch fails, return error for validation
        return {
          valid: false,
          error: 'Unable to fetch provider minimum amount for validation. Please try again or contact support.'
        };
      }

      if (minAmount === undefined) {
        return {
          valid: false,
          error: 'Provider minimum amount not found. Please select a valid provider.'
        };
      }

      const response = await axios.post(`${this.baseUrl}/pay`, {
        billerId: parseInt(request.providerId),
        subscriberAccountNumber: request.customerId,
        amount: minAmount, // Use provider's minAmount for validation
        useLocalAmount: true,
        validate: true // Validation only
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': this.acceptHeader || 'application/com.reloadly.utilities-v1+json'
        }
      });

      const data: any = response.data || {};
      return {
        valid: response.status === 200,
        customerName: data.customerName || 'N/A',
        customerAddress: data.customerAddress,
        tariff: data.tariff,
        outstandingAmount:
          typeof data.outstandingAmount === 'number'
            ? data.outstandingAmount
            : (data.outstandingAmount ? parseFloat(data.outstandingAmount) : undefined)
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.message || 'Customer validation failed'
      };
    }
  }

  async makePayment(request: ElectricityPaymentRequest): Promise<ElectricityPaymentResponse> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.post(`${this.baseUrl}/pay`, {
        billerId: parseInt(request.providerId),
        subscriberAccountNumber: request.customerId,
        amount: request.amount,
        useLocalAmount: true,
        referenceId: request.requestReference
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': this.acceptHeader || 'application/com.reloadly.utilities-v1+json'
        }
      });

      const result = response.data;

      return {
        success: response.status === 200,
        transactionRef: result.transactionId?.toString() || request.requestReference,
        approvedAmount: result.amount,
        responseCode: result.status,
        responseDescription: result.status === 'SUCCESSFUL' ? 'Payment completed' : 'Payment failed',
        token: result.pinlessData?.token,
        units: result.pinlessData?.units
      };
    } catch (error: any) {
      console.error('Reloadly payment failed:', error);
      return {
        success: false,
        transactionRef: '',
        approvedAmount: 0,
        responseCode: 'ERROR',
        responseDescription: 'Payment processing failed',
        error: error.response?.data?.message || 'Unknown error'
      };
    }
  }

  async getTransactionStatus(transactionRef: string): Promise<ElectricityTransactionStatusResponse> {
    try {
      const token = await this.getAccessToken();
      
      const response = await axios.get(`${this.baseUrl}/transactions/${transactionRef}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': this.acceptHeader || 'application/com.reloadly.utilities-v1+json'
        }
      });

      const transaction = response.data;
      
      return {
        status: transaction.status === 'SUCCESSFUL' ? 'completed' : 'failed',
        transactionRef: transaction.transactionId?.toString() || transactionRef,
        amount: transaction.amount,
        responseDescription: transaction.status,
        completedAt: new Date(transaction.submittedAt)
      };
    } catch (error) {
      return {
        status: 'failed',
        transactionRef,
        amount: 0,
        responseDescription: 'Status check failed'
      };
    }
  }
}

// Main electricity payment service - uses Reloadly for all countries
export class ElectricityPaymentService {
  private reloadlyService = new ReloadlyElectricityService();

  async getProviders(country: string): Promise<ElectricityProvider[]> {
    return this.reloadlyService.getElectricityProviders(country);
  }

  async validateCustomer(request: ElectricityValidationRequest): Promise<ElectricityValidationResponse> {
    return this.reloadlyService.validateCustomer(request);
  }

  async processPayment(request: ElectricityPaymentRequest): Promise<ElectricityPaymentResponse> {
    return this.reloadlyService.makePayment(request);
  }

  async getTransactionStatus(country: string, transactionRef: string): Promise<ElectricityTransactionStatusResponse> {
    return this.reloadlyService.getTransactionStatus(transactionRef);
  }
}

export const electricityPaymentService = new ElectricityPaymentService();
