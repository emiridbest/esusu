
  export interface RateParams {
    base_currency: string;
  }
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
  export const convert = async (params: RateParams) => {
    try {
      // retrive data from backend and filter out the last value
      const response = await fetch(`${API_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
  
      const rate = data && data.rate ? data.rate : 0;
      console.log('API Response:', rate);
  
      return rate;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };  