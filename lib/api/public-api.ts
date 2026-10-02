/**
 * Public API — Axios instance for all customer-facing HTTP requests.
 *
 * Features:
 * - Bearer token from CustomerAuthStore on every request
 * - 401 → token refresh queue (isRefreshing + failedQueue) → redirect /login?session=expired
 * - 429 → attaches friendlyMessage to the error for display by calling components
 * - withCredentials: true so the httpOnly refresh token cookie is sent automatically
 */

import { useCustomerAuthStore } from '@/lib/stores/customer-auth-store';
import axios, {
    AxiosError,
    AxiosInstance,
    AxiosRequestConfig,
    AxiosResponse,
    InternalAxiosRequestConfig,
} from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

// --- Axios instance ---

const publicApi: AxiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// --- Token refresh queue ---
// Prevents multiple simultaneous refresh calls when concurrent 401s arrive.

let isRefreshing = false;
type QueueCallback = (token: string | null) => void;
let failedQueue: { resolve: QueueCallback; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null): void {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
}

// --- Request interceptor: attach Bearer token ---

publicApi.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        const token = useCustomerAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError): Promise<AxiosError> => Promise.reject(error),
);

// --- Response interceptor: handle 401 and 429 ---

publicApi.interceptors.response.use(
    (response: AxiosResponse): AxiosResponse => response,
    async (error: AxiosError): Promise<never> => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        const status = error.response?.status;

        // --- 429 Rate Limited ---
        if (status === 429) {
            const enhancedError = error as AxiosError & { friendlyMessage: string };
            enhancedError.friendlyMessage =
                'Too many requests. Please wait a moment and try again.';
            return Promise.reject(enhancedError);
        }

        // --- 401 Unauthorized: attempt token refresh once ---
        if (status === 401 && !originalRequest._retry) {
            // If no token exists, this is a guest user — don't attempt refresh or redirect
            const currentToken = useCustomerAuthStore.getState().token;
            if (!currentToken) {
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // Queue this request until the refresh completes
                return new Promise<never>((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token) => {
                            if (token) {
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                            }
                            resolve(publicApi(originalRequest) as never);
                        },
                        reject,
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshRes = await axios.post(
                    `${baseURL}/auth/refresh-token`,
                    {},
                    { withCredentials: true },
                );
                const newToken: string = refreshRes.data?.data?.accessToken;

                if (newToken) {
                    // Update store with new token
                    const { user } = useCustomerAuthStore.getState();
                    if (user) {
                        useCustomerAuthStore.getState().setAuth(user, newToken);
                    }
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    processQueue(null, newToken);
                    return publicApi(originalRequest) as never;
                }

                throw new Error('No access token in refresh response');
            } catch (refreshError) {
                processQueue(refreshError, null);
                useCustomerAuthStore.getState().clearAuth();

                if (typeof window !== 'undefined') {
                    window.location.replace('/login?session=expired');
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default publicApi;

// Re-export config type for use in hooks
export type { AxiosRequestConfig };
