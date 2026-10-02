import { useAdminAuthStore } from '@/lib/stores/admin-auth-store';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Admin-specific axios instance for the admin dashboard.
 * Attaches JWT Bearer token from the admin auth store and handles
 * 401/403 responses globally.
 */
const adminApi: AxiosInstance = axios.create({
    baseURL,
    timeout: 20000,
});

// --- Request Interceptor ---
adminApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = useAdminAuthStore.getState().token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error: AxiosError): Promise<AxiosError> => {
        return Promise.reject(error);
    },
);

// --- Response Interceptor ---
let isRedirecting = false;

adminApi.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: AxiosError): Promise<never> => {
        const status = error.response?.status;

        // 401 Unauthorized → clear auth state, redirect to /login
        if (status === 401 && typeof window !== 'undefined' && !isRedirecting) {
            isRedirecting = true;
            useAdminAuthStore.getState().clearAuth();
            window.location.replace('/login');
        }

        // 403 Forbidden → display "Access Denied" toast, preserve page state
        if (status === 403) {
            toast.error('Access Denied', { duration: 5000 });
        }

        return Promise.reject(error);
    },
);

export default adminApi;
