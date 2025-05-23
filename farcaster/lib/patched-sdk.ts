/**
 * Utility to monkey-patch the Farcaster SDK to use our proxy for Warpcast API calls
 */
import { sdk } from '@farcaster/frame-sdk';
import posthog from 'posthog-js';

/**
 * Initialize and patch the Farcaster SDK to use our proxy
 */
export function initPatchedFarcasterSdk() {
  try {
    // Save original fetch function
    const originalFetch = window.fetch;
    
    // Monkey patch the global fetch to intercept calls to Warpcast
    window.fetch = async function(input, init) {
      const url = input instanceof Request ? input.url : input.toString();
      
      // Check if this is a call to Warpcast API
      if (url.includes('client.warpcast.com')) {
        console.log('Intercepting Warpcast API call:', url);
        
        // Extract the endpoint from the URL
        const urlObj = new URL(url);
        const endpoint = urlObj.pathname.replace('/v2/', '');
        
        // Extract the authorization header
        let authorization = '';
        if (init?.headers) {
          const headers = init.headers as any;
          if (headers.get) {
            authorization = headers.get('Authorization') || '';
          } else if (headers.Authorization) {
            authorization = headers.Authorization;
          }
        }
        
        // Prepare the body
        let body = {};
        if (init?.body) {
          try {
            body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
          } catch (e) {
            console.error('Error parsing body:', e);
          }
        }
        
        // Make the request through our proxy
        const proxyResponse = await originalFetch(`/api/farcaster/warpcast?endpoint=${endpoint}`, {
          method: init?.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(authorization ? { 'Authorization': authorization } : {})
          },
          body: init?.body ? JSON.stringify(body) : undefined
        });
        
        return proxyResponse;
      }
      
      // For all other requests, use the original fetch
      return originalFetch(input, init);
    };
    
    // Track that we've patched the SDK
    posthog.capture('sdk_patched');
    
    return sdk;
  } catch (error) {
    console.error('Error patching Farcaster SDK:', error);
    
    // If patching fails, return the original SDK
    return sdk;
  }
}
