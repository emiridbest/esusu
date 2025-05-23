/**
 * Utility functions for interacting with Warpcast API through our proxy
 */

/**
 * Get a resource from the Warpcast API using our proxy
 * @param endpoint - The Warpcast API endpoint to call
 * @param body - The request body
 * @param token - The authorization token
 */
export async function warpcastRequest<T = any>(
  endpoint: string,
  body: any = {},
  token?: string
): Promise<T> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/farcaster/warpcast?endpoint=${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch from Warpcast API');
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in Warpcast API call to ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Get wallet resource from Warpcast
 */
export async function getWalletResource(token: string, resourceId: string) {
  return warpcastRequest('wallet/resource', { resourceId }, token);
}

/**
 * Authentication helper for Warpcast
 */
export async function authenticateWarpcast(signer_uuid: string) {
  return warpcastRequest('auth/signer', { signer_uuid });
}

/**
 * Get user profile from Warpcast
 */
export async function getUserProfile(fid: number, token?: string) {
  return warpcastRequest(`user-profile?fid=${fid}`, {}, token);
}
