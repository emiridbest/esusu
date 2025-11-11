export const config = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  
  // Email and Notifications
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  
  // Payment API Security
  PAYMENT_API_KEY: process.env.PAYMENT_API_KEY,
  

  // Reloadly 
  RELOADLY_UTILITIES_BASE_URL: process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true' 
    ? (process.env.NEXT_PUBLIC_SANDBOX_BILLER_API_URL || 'https://utilities-sandbox.reloadly.com')
    : (process.env.NEXT_PUBLIC_BILLER_API_URL || 'https://utilities.reloadly.com'),
  RELOADLY_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.reloadly.com/oauth/token',
  RELOADLY_CLIENT_ID: process.env.NEXT_CLIENT_ID,
  RELOADLY_CLIENT_SECRET: process.env.NEXT_CLIENT_SECRET,
  RELOADLY_SANDBOX_MODE: process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true',
  RELOADLY_ACCEPT_HEADER_BILLER: process.env.NEXT_PUBLIC_ACCEPT_HEADER_BILLER || 'application/com.reloadly.utilities-v1+json',
  RELOADLY_AUDIENCE_URL: process.env.NEXT_PUBLIC_AUDIENCE_URL,
  RELOADLY_UTILITIES_AUDIENCE_URL: process.env.NEXT_PUBLIC_SANDBOX_MODE === 'true' 
    ? (process.env.NEXT_PUBLIC_UTILITIES_AUDIENCE_URL || 'https://utilities-sandbox.reloadly.com')
    : (process.env.NEXT_PUBLIC_UTILITIES_AUDIENCE_URL_PRODUCTION || 'https://utilities.reloadly.com'),
  
  // Environment
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT and Security
  JWT_SECRET: process.env.JWT_SECRET,
  
  // External API URLs
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXT_PUBLIC_SANDBOX_BILLER_API_URL: process.env.NEXT_PUBLIC_SANDBOX_BILLER_API_URL,
  NEXT_PUBLIC_BILLER_API_URL: process.env.NEXT_PUBLIC_BILLER_API_URL,
  NEXT_PUBLIC_SANDBOX_MODE: process.env.NEXT_PUBLIC_SANDBOX_MODE,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SANDBOX_API_URL: process.env.NEXT_PUBLIC_SANDBOX_API_URL,
  NEXT_PUBLIC_FX_API_URL: process.env.NEXT_PUBLIC_FX_API_URL,
  NEXT_PUBLIC_SANDBOX_FX_API_URL: process.env.NEXT_PUBLIC_SANDBOX_FX_API_URL,
  NEXT_PUBLIC_ACCEPT_HEADER: process.env.NEXT_PUBLIC_ACCEPT_HEADER,
  NEXT_PUBLIC_ACCEPT_HEADER_BILLER: process.env.NEXT_PUBLIC_ACCEPT_HEADER_BILLER,
  NEXT_PUBLIC_AUDIENCE_URL: process.env.NEXT_PUBLIC_AUDIENCE_URL,
  NEXT_CLIENT_ID: process.env.NEXT_CLIENT_ID,
  NEXT_CLIENT_SECRET: process.env.NEXT_CLIENT_SECRET,
};
