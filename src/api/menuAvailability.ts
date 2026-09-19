/**
 * Penonaktifan menu (sisi Kiosk) — disimpan di localStorage perangkat Kiosk.
 * Dipakai halaman admin /ngolabadm untuk menyembunyikan menu coworking sementara.
 * ponytail: server coworking punya kolom availability_override, tapi butuh sesi login admin
 * (endpoint tulis balas 401). Override lokal cukup sampai login server tersedia.
 */
const KEY = 'gestureta:menu-disabled';

const read = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export const getDisabledMenuIds = (): string[] => read();

export const isMenuDisabled = (id: string | number): boolean => read().includes(String(id));

export const setMenuDisabled = (id: string | number, disabled: boolean): void => {
  const ids = new Set(read());
  if (disabled) ids.add(String(id));
  else ids.delete(String(id));
  localStorage.setItem(KEY, JSON.stringify([...ids]));
};
