/**
 * Exchange Types
 * Types for exchange API credentials
 */

// Supported Exchanges (must match backend ExchangeType enum)
export type ExchangeType = 'binance' | 'bitget' | 'gateio' | 'mexc' | 'alpha_vantage';

// Exchange metadata for UI
export interface ExchangeInfo {
    id: ExchangeType;
    name: string;
    icon: string; // MaterialCommunityIcons name
    color: string;
    requiresPassphrase: boolean;
    description: string;
}

// All supported exchanges with their UI info
export const SUPPORTED_EXCHANGES: ExchangeInfo[] = [
    {
        id: 'binance',
        name: 'Binance',
        icon: 'alpha-b-circle',
        color: '#F0B90B',
        requiresPassphrase: false,
        description: 'World\'s largest crypto exchange',
    },
    {
        id: 'bitget',
        name: 'Bitget',
        icon: 'alpha-b-box',
        color: '#00D4AA',
        requiresPassphrase: true,
        description: 'Leading derivatives exchange',
    },
    {
        id: 'gateio',
        name: 'Gate.io',
        icon: 'alpha-g-circle',
        color: '#17E6A1',
        requiresPassphrase: false,
        description: 'Popular altcoin exchange',
    },
    {
        id: 'mexc',
        name: 'MEXC',
        icon: 'alpha-m-circle',
        color: '#1972F5',
        requiresPassphrase: false,
        description: 'Global digital asset exchange',
    },
];

// Request DTOs
export interface CreateCredentialRequest {
    exchange: ExchangeType;
    apiKey: string;
    secretKey: string;
    passphrase?: string;
    label?: string;
    activeTrading?: boolean;
}

export interface UpdateCredentialRequest {
    apiKey?: string;
    secretKey?: string;
    passphrase?: string;
    label?: string;
    isActive?: boolean;
    activeTrading?: boolean;
}

// Response DTOs
export interface CredentialResponse {
    id: string;
    exchange: ExchangeType;
    isActive: boolean;
    activeTrading?: boolean;
    label?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CredentialsListResponse {
    status: string;
    statusCode: number;
    message: string;
    data: CredentialResponse[];
}

export interface CredentialActionResponse {
    status: string;
    statusCode: number;
    message: string;
    data: CredentialResponse;
}

// Helper to get exchange info by ID
export const getExchangeInfo = (exchangeId: ExchangeType): ExchangeInfo | undefined => {
    return SUPPORTED_EXCHANGES.find(e => e.id === exchangeId);
};
