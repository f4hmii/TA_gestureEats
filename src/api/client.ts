// Konfigurasi dasar API — kosong agar melalui Vite proxy
const BASE_URL = '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Wrapper standar untuk memanggil API
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error saat memanggil API ${endpoint}:`, error);
    throw error;
  }
}
