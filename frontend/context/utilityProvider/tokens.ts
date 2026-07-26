export type TokenOption = {
    id: string;
    name: string;
    icon: string;
    /** Optional promo tag shown beside the token in payment selectors */
    badge?: string;
};

export const TOKENS: TokenOption[] = [
    { id: 'USDM', name: 'USDm', icon: '💲' },
    { id: 'USDC', name: 'USDC', icon: '🔵' },
    { id: 'USDT', name: 'USDT', icon: '🟩' },
    { id: 'CELO', name: 'CELO', icon: '🌕' },
    { id: 'G$', name: 'G$', icon: '💰', badge: '20% off fees' },
    { id: 'KESm', name: 'KESm', icon: '🇰🇪' },
    { id: 'NGNm', name: 'NGNm', icon: '🇳🇬' },
  ];
