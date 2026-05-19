import { apiClient } from './client';
import { Product } from '../types/api';

/**
 * Mengambil daftar semua menu/produk dari backend
 */
export const getMenus = () => {
  return apiClient<Product[]>('/menu');
};

/**
 * Mengambil menu berdasarkan kategori
 */
export const getMenusByCategory = (category: string) => {
  return apiClient<Product[]>(`/menu?category=${category}`);
};
