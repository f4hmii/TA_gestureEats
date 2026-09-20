import { Promotion, CoinPromo, User, AdminPromo } from '../types/api';

const BASE_URL = ''; // Kosong = menggunakan Vite proxy (path relatif ke /api/...)
const API_KEY = import.meta.env.VITE_API_KEY || '';

const getHeaders = () => ({
  'x-api-key': API_KEY,
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true'
});

/**
 * GET /api/menu?outlet=coworking
 * Mengambil daftar menu dari server
 */
export const getTangolabMenus = async () => {
  const endpoint = import.meta.env.VITE_MENU_ENDPOINT || '/api/menu?outlet=coworking';
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil menu");
  return res.json();
};

/**
 * GET /api/digital-board/media
 * Mengambil daftar media idle promotion dari digital board admin
 */
export const getPromotions = async (): Promise<Promotion[]> => {
  const res = await fetch(`${BASE_URL}/api/digital-board/media`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil promosi");
  const data = await res.json();
  // Response berformat { value: [...], Count: N }
  let items: Promotion[] = [];
  if (data && Array.isArray(data.value)) {
    items = data.value;
  } else if (Array.isArray(data)) {
    items = data;
  }
  // Filter hanya yang is_active = 1
  return items.filter(p => p.is_active === 1);
};

/**
 * GET /api/coin-promos
 * Mengambil daftar promo koin yang tersedia untuk ditukar user
 */
export const getCoinPromos = async (): Promise<CoinPromo[]> => {
  const res = await fetch(`${BASE_URL}/api/coin-promos`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil coin promos");
  return res.json();
};

/**
 * GET /api/v1/users/scan-tag/{uid_rfid}
 * Scan kartu RFID untuk mengenali user dan mendapatkan saldo koin
 */
export const scanTag = async (rfid: string): Promise<User> => {
  const endpoint = import.meta.env.VITE_SCAN_TAG_ENDPOINT || '/api/v1/users/scan-tag';
  const res = await fetch(`${BASE_URL}${endpoint}/${rfid}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal scan RFID");
  const data = await res.json();
  if (data.status === 'success' && data.user) {
    return data.user;
  }
  throw new Error("User tidak ditemukan");
};

/**
 * POST /api/v1/vouchers/redeem-gesture
 * Menukarkan koin user menjadi voucher diskon
 */
export const redeemCoinPromo = async (userId: string, promoId: string): Promise<{ voucher_code: string }> => {
  const endpoint = import.meta.env.VITE_REDEEM_ENDPOINT || '/api/v1/vouchers/redeem-gesture';
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      user_id: userId,
      promo_id: promoId
    })
  });
  if (!res.ok) throw new Error("Gagal menukar koin menjadi voucher");
  const data = await res.json();
  if (data.status === 'success' && data.data) {
    return data.data;
  }
  throw new Error("Gagal menukar koin");
};

/** Outlet pemilik item: ngolab (Kasir) atau coworking (Airgesture). */
export const outletOfItem = (item: any): string =>
  (item?.outlet || '').toLowerCase() === 'ngolab' ? 'ngolab' : 'coworking';

/** Prefix proxy Vite untuk tiap outlet. */
export const apiPrefixForOutlet = (outlet: string) =>
  outlet === 'ngolab' ? '/api/ngolab' : '/api/coworking';

/**
 * Payload pesanan per outlet — bentuknya beda:
 * - Ngolab   (Kasir)      : camelCase, id/table/customer/total/amountPaid/change/type
 * - Coworking (Airgesture): snake_case, customer_name/total_price/external_id/source
 */
export const buildOrderPayload = (
  outlet: string,
  { customerName, total, items, externalId, userId }: {
    customerName: string;
    total: number;
    items: any[];
    externalId: string;
    userId?: string | null;
  }
) => {
  if (outlet === 'ngolab') {
    return {
      id: externalId,
      table: "KiosK",
      customer: customerName,
      total,
      paymentMethod: "QRIS",
      amountPaid: total,
      change: 0,
      type: "Dine In",
      userId: userId || undefined,
      items: items.map(item => ({
        id: Number(item.id),
        name: item.name,
        price: parseFloat(item.price as any),
        quantity: item.quantity,
        note: ""
      }))
    };
  }

  return {
    customer_name: customerName,
    payment_method: "QRIS",
    // Backend menolak "lunas": pesanan eksternal selalu dibuat sebagai belum_bayar,
    // pelunasan lewat endpoint payment-proof.
    payment_status: "belum_bayar",
    total_price: total,
    external_id: externalId,
    source: "coworking",
    items: items.map(item => ({
      id: item.id.toString(),
      name: item.name,
      quantity: item.quantity,
      price: parseFloat(item.price as any)
    }))
  };
};

/**
 * POST /api/orders/external
 * Mengirim pesanan dari KiosK ke sistem KDS (Kitchen Display System)
 */
export const createTangolabOrder = async (orderData: any, apiPrefix?: string) => {
  let requestUrl = '';
  
  if (apiPrefix) {
    if (apiPrefix === '/api/ngolab') {
      requestUrl = '/api/ngolab/orders';
    } else {
      requestUrl = '/api/coworking/orders/external';
    }
  } else {
    const endpoint = import.meta.env.VITE_ORDER_ENDPOINT || '/api/orders/external';
    requestUrl = `${BASE_URL}${endpoint}`;
  }

  const res = await fetch(requestUrl, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData)
  });
  // Baca body dulu: server mengirim alasan asli di `error`/`message`
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || body.message || `Gagal membuat pesanan (HTTP ${res.status})`);
  }
  return body;
};

/**
 * GET /api/ngolab/promos
 * Mengambil daftar voucher admin dari server Kasir (Ngolab)
 */
export const getAdminPromos = async (): Promise<AdminPromo[]> => {
  const endpoint = '/api/ngolab/promos';
  const res = await fetch(`${BASE_URL}${endpoint}`, { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil voucher dari admin");
  return res.json();
};

/**
 * POST /api/.../orders/:id/payment-proof
 * Mengunggah bukti pembayaran pesanan
 */
export const uploadPaymentProof = async (orderId: string, base64Image: string, apiPrefix?: string) => {
  let requestUrl = '';
  // Nama field file beda per server: coworking pakai 'payment_proof', ngolab pakai 'paymentProof'
  let fileField = 'payment_proof';

  if (apiPrefix === '/api/ngolab') {
    requestUrl = `/api/ngolab/orders/${orderId}/payment-proof`;
    fileField = 'paymentProof';
  } else {
    requestUrl = `/api/coworking/orders/external/${orderId}/payment-proof`;
  }

  // Convert base64 to Blob
  const fetchRes = await fetch(base64Image);
  const blob = await fetchRes.blob();
  const formData = new FormData();
  formData.append(fileField, blob, "payment_proof.jpg");

  const res = await fetch(`${BASE_URL}${requestUrl}`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY, // Note: no Content-Type for FormData, let browser set boundary
      'bypass-tunnel-reminder': 'true'
    },
    body: formData
  });
  
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || body.message || `Gagal mengunggah bukti bayar (HTTP ${res.status})`);
  return body;
};
