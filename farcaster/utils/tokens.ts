// Token configuration for the application
export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  isNative?: boolean;
}

// Celo network token addresses
export const TOKENS: Record<string, TokenConfig> = {
  CELO: {
    address: '0x471EcE3750Da237f93B8E339c536989b8978a438', // Native CELO token
    symbol: 'CELO',
    name: 'Celo',
    decimals: 18,
    isNative: true,
    logoUrl: '/celo2.png'
  },
  CUSD: {
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    symbol: 'cUSD',
    name: 'Celo Dollar',
    decimals: 18,
    logoUrl: '/cusd2.png'
  },
  USDC: {
    address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: '/usdc.png'
  },
  USDT: {
    address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoUrl: '/usdt.png'
  },
  G$: {
    address: '0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A',
    symbol: 'G$',
    name: 'GoodDollar',
    decimals: 18,
    logoUrl: '/gooddollar.svg'
  }
};

// Get token by address
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return Object.values(TOKENS).find(token =>
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return TOKENS[symbol.toUpperCase()];
}

// Get all available tokens
export function getAllTokens(): TokenConfig[] {
  return Object.values(TOKENS);
}

// Get supported tokens for thrift groups
export function getSupportedThriftTokens(): TokenConfig[] {
  // Only allow stablecoins for thrift groups
  return [TOKENS.CUSD, TOKENS.USDC, TOKENS.USDT];
}

// Format token amount
export function formatTokenAmount(amount: string | number, token: TokenConfig, decimals: number = 2): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return numAmount.toFixed(decimals);
}
