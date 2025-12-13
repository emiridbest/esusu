/**
 * EIP-6963: Ethereum Provider Discovery Standard
 * 
 * Instead of fighting over window.ethereum, wallets announce themselves via events.
 * This eliminates conflicts between multiple wallet extensions.
 * 
 * Reference: https://eips.ethereum.org/EIPS/eip-6963
 */

export interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

export interface EIP6963AnnounceProviderEvent extends Event {
  detail: EIP6963ProviderDetail;
}

/**
 * Request all available providers via EIP-6963 standard
 * Wallets will respond by firing eip6963:announceProvider events
 */
export function requestEIP6963Providers(): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    const providers: Map<string, EIP6963ProviderDetail> = new Map();
    
    // Listen for wallet announcements
    const handleAnnounceProvider = (event: Event) => {
      const announceEvent = event as EIP6963AnnounceProviderEvent;
      const detail = announceEvent.detail;
      
      // Store by RDNS (reverse domain name system) to avoid duplicates
      providers.set(detail.info.rdns, detail);
    };

    // Add listener
    window.addEventListener('eip6963:announceProvider', handleAnnounceProvider);

    // Request all providers to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Wait a bit for all providers to respond, then resolve
    // 500ms should be enough for most wallets to respond
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider);
      resolve(Array.from(providers.values()));
    }, 500);
  });
}

/**
 * Get a specific provider by name/RDNS
 */
export async function getEIP6963Provider(rdns: string): Promise<EIP6963ProviderDetail | null> {
  const providers = await requestEIP6963Providers();
  return providers.find(p => p.info.rdns === rdns) || null;
}

/**
 * Map common wallet RDNS values for easy reference
 */
export const WALLET_RDNS = {
  METAMASK: 'io.metamask',
  RABBY: 'io.rabby',
  COINBASE: 'com.coinbase.wallet',
  PHANTOM: 'app.phantom',
  RAINBOW: 'me.rainbow',
  TRUST: 'com.trustwallet.app',
  LEDGER: 'com.ledger',
} as const;

/**
 * Get provider by common wallet name
 */
export async function getProviderByWallet(
  walletName: keyof typeof WALLET_RDNS
): Promise<EIP6963ProviderDetail | null> {
  const rdns = WALLET_RDNS[walletName];
  return getEIP6963Provider(rdns);
}
