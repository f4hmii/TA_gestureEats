import { apiClient } from './client';
import { Product } from '../types/api';
import { isMenuDisabled } from './menuAvailability';

/**
 * Mengambil daftar semua menu/produk dari server
 * Response berformat { value: [...], Count: N }
 */
export const getMenusFromOutlet = async (outlet: 'coworking' | 'ngolab'): Promise<Product[]> => {
  try {
    const apiPrefix = outlet === 'coworking' ? '/api/coworking' : '/api/ngolab';
    
    const menuEndpoint = import.meta.env.VITE_MENU_ENDPOINT || '/api/menu?outlet=coworking';
    const cleanEndpoint = menuEndpoint.replace(/^\/api/, '');
    const baseEndpoint = cleanEndpoint.split('?')[0];
    const API_KEY = import.meta.env.VITE_API_KEY || '';
    
    const requestUrl = `${apiPrefix}${baseEndpoint}?outlet=${outlet}`;
      
    const res = await fetch(requestUrl, {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    console.log(`[Menu Debug] getMenusFromOutlet data untuk ${outlet}:`, data);
    let items: Product[] = [];
    
    // Response berformat { value: [...], Count: N }
    if (data && Array.isArray(data.value)) {
      items = data.value as Product[];
    }
    // Fallback: jika response langsung array
    else if (Array.isArray(data)) {
      items = data as Product[];
    } else {
      console.warn(`[Menu] Format response tidak dikenali untuk outlet ${outlet}:`, data);
      return [];
    }

    return items.map(item => ({
      ...item,
      outlet
    }));
  } catch (error) {
    console.error(`[Menu] Gagal mengambil menu untuk outlet ${outlet}:`, error);
    return [];
  }
};

export const getMenus = async (): Promise<Product[]> => {
  const [coworkingMenus, ngolabMenus] = await Promise.all([
    getMenusFromOutlet('coworking'),
    getMenusFromOutlet('ngolab')
  ]);
  
  return [...coworkingMenus, ...ngolabMenus];
};

/**
 * Mengambil menu berdasarkan kategori
 */
export const getMenusByCategory = async (category: string) => {
  const allMenus = await getMenus();
  return allMenus.filter(m => m.category.toLowerCase() === category.toLowerCase());
};

/**
 * Cek ketersediaan satu menu (dipakai kartu menu Kiosk untuk label "Habis").
 * Aturan sama seperti filter lama, dipisah agar bisa dipakai saat render.
 */
export const isMenuAvailable = (menu: Product): boolean =>
  menu.inStock !== false &&
  menu.inventoryAvailable !== false &&
  menu.status !== 'Habis' &&
  menu.stock !== 0;

/**
 * Mengambil HANYA menu yang berstatus aktif/ditampilkan.
 * Menu stok habis tetap ikut (ditandai "Habis" di kartu), bukan disembunyikan.
 */
export const getActiveMenus = async () => {
  const allMenus = await getMenus();

  return allMenus.filter(menu => {
    // Menu dinonaktifkan sementara dari halaman admin /ngolabadm
    if (isMenuDisabled(menu.id)) return false;

    // Mengecek apakah menu diizinkan untuk ditampilkan
    return menu.displayed === 1 || menu.displayed as unknown as boolean === true;
  });
};
