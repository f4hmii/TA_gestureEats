export interface DigitalBoardMedia {
  id: number;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  file_type: 'image' | 'video';
  mime_type: string;
  duration: number;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  uploaded_by: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface NowPlayingResponse {
  playlist: any;
  items: DigitalBoardMedia[];
  current_index: number;
}

export const DIGITAL_BOARD_API_BASE = import.meta.env.VITE_DIGITAL_BOARD_API_BASE || "";

/**
 * Mengambil daftar media aktif untuk digital board
 */
export async function getActiveMedia(): Promise<DigitalBoardMedia[]> {
  const res = await fetch(`${DIGITAL_BOARD_API_BASE}/api/digital-board/media`);
  if (!res.ok) {
    throw new Error(`Failed to fetch active media: ${res.statusText}`);
  }
  const data = await res.json();
  return data.filter((m: DigitalBoardMedia) => m.is_active === 1);
}

/**
 * Mengambil media yang sedang diputar untuk screen tertentu
 */
export async function getNowPlaying(screenId = 1): Promise<NowPlayingResponse> {
  const res = await fetch(`${DIGITAL_BOARD_API_BASE}/api/digital-board/now-playing/${screenId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch now playing for screen ${screenId}: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Mengirim ping status online untuk screen tertentu
 */
export async function pingScreen(screenId = 1): Promise<void> {
  const res = await fetch(`${DIGITAL_BOARD_API_BASE}/api/digital-board/screens/${screenId}/ping`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "online" })
  });
  if (!res.ok) {
    throw new Error(`Failed to ping screen ${screenId}: ${res.statusText}`);
  }
}
