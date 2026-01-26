/**
 * Exchange Credentials API Service
 * Handles all API credential-related API calls
 */

import { api } from '@/services/api/client';
import { config } from '@/constants/config';
import {
    CreateCredentialRequest,
    UpdateCredentialRequest,
    CredentialResponse,
    CredentialsListResponse,
    CredentialActionResponse,
} from '@/types/exchange.types';

const { CREDENTIALS } = config.ENDPOINTS;

/**
 * Exchange Credentials API Service
 */
export const credentialsApi = {
    /**
     * Get all credentials for the authenticated user
     */
    async getAll(): Promise<CredentialResponse[]> {
        try {
            const response = await api.get(CREDENTIALS.GET_ALL);

            // Handle nested response: { status, data: [...] } or { status, data: { data: [...] } }
            const responseData = response.data;

            if (Array.isArray(responseData.data)) {
                return responseData.data;
            } else if (responseData.data?.data && Array.isArray(responseData.data.data)) {
                return responseData.data.data;
            }

            return [];
        } catch (error: any) {
            console.error('Get credentials error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Save new credentials (create or update if exists for exchange)
     */
    async save(data: CreateCredentialRequest): Promise<CredentialResponse> {
        try {
            const response = await api.post(CREDENTIALS.SAVE, data);

            // Handle nested response
            const responseData = response.data;

            if (responseData.data?.data) {
                return responseData.data.data;
            } else if (responseData.data) {
                return responseData.data;
            }

            return responseData;
        } catch (error: any) {
            console.error('Save credentials error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Update existing credentials
     */
    async update(id: string, data: UpdateCredentialRequest): Promise<CredentialResponse> {
        try {
            const response = await api.patch(CREDENTIALS.UPDATE(id), data);

            const responseData = response.data;

            if (responseData.data?.data) {
                return responseData.data.data;
            } else if (responseData.data) {
                return responseData.data;
            }

            return responseData;
        } catch (error: any) {
            console.error('Update credentials error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Delete credentials
     */
    async delete(id: string): Promise<void> {
        try {
            await api.delete(CREDENTIALS.DELETE(id));
        } catch (error: any) {
            console.error('Delete credentials error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Toggle credentials active status
     */
    async toggle(id: string): Promise<CredentialResponse> {
        try {
            const response = await api.patch(CREDENTIALS.TOGGLE(id));

            const responseData = response.data;

            if (responseData.data?.data) {
                return responseData.data.data;
            } else if (responseData.data) {
                return responseData.data;
            }

            return responseData;
        } catch (error: any) {
            console.error('Toggle credentials error:', error.response?.data || error.message);
            throw error;
        }
    },

    /**
     * Get single credential by ID
     */
    async getOne(id: string): Promise<CredentialResponse> {
        try {
            const response = await api.get(CREDENTIALS.GET_ONE(id));

            const responseData = response.data;

            if (responseData.data?.data) {
                return responseData.data.data;
            } else if (responseData.data) {
                return responseData.data;
            }

            return responseData;
        } catch (error: any) {
            console.error('Get credential error:', error.response?.data || error.message);
            throw error;
        }
    },
};

export default credentialsApi;
