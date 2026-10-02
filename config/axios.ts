import { getUser, removeUser } from '@/lib/user';
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';


const baseURL = process.env.NEXT_PUBLIC_API_URL as string;

const Axios: AxiosInstance = axios.create({
  baseURL: `${baseURL}`,
  timeout: 20000,
});

Axios.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (!navigator.onLine) {
      throw new Error('No internet connection.');
    }

    const user = getUser();
    const token = user?.token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Normalize URL to avoid duplicated base paths (e.g. /api/v1/api/v1/...)
    // If the request `url` already includes the `baseURL` prefix, strip it
    // so axios does not concatenate them resulting in double prefixes.
    try {
      const base = String(config.baseURL || '');
      if (config.url && base) {
        // If url starts with base (or with a leading slash + base), remove the duplicate part
        if (config.url.startsWith(base)) {
          config.url = config.url.substring(base.length) || '/';
        } else if (config.url.startsWith(`/${base}`)) {
          config.url = config.url.substring(base.length + 1) || '/';
        }
        // Ensure url starts with a single '/'
        if (!config.url.startsWith('/')) config.url = `/${config.url}`;
      }
    } catch {
      // ignore normalization errors and continue with original config
    }

    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);


let isRedirecting = false;

Axios.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => response,
  async (error: AxiosError): Promise<never> => {
    const data = error.response?.data as { shouldLogout?: boolean } | undefined;

    if (
      typeof window !== 'undefined' &&
      data?.shouldLogout === true &&
      !isRedirecting
    ) {
      isRedirecting = true;

      removeUser();
      const next =
        window.location.pathname +
        window.location.search +
        window.location.hash; // to redirect user after again login to same page from where he logged out

      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
    return Promise.reject(error);
  }
);


export default Axios;
