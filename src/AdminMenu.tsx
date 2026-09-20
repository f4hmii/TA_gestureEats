import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getMenusFromOutlet } from "./api/menu";
import { getDisabledMenuIds, setMenuDisabled } from "./api/menuAvailability";
import { Product } from "./types/api";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
const AUTH_KEY = "gestureta:admin-auth";

/**
 * Halaman admin sederhana: /ngolabadm
 * Toggle aktif/nonaktif menu coworking. Status disimpan lokal di perangkat Kiosk.
 * ponytail: sandi dicek di sisi klien (VITE_ADMIN_PASSWORD) — cukup untuk mencegah
 * kiosk ditinggal dalam mode admin. Pindah ke sesi login server kalau perlu keamanan nyata.
 */
export default function AdminMenu({ onClose, forceLogin }: { onClose?: () => void; forceLogin?: boolean }) {
  const [authed, setAuthed] = useState(
    () => !forceLogin && sessionStorage.getItem(AUTH_KEY) === "1"
  );
  const [pass, setPass] = useState("");
  const [shownPass, setShownPass] = useState(false);
  const [passError, setPassError] = useState(false);
  const [items, setItems] = useState<Product[]>([]);
  const [disabled, setDisabled] = useState<string[]>(() => getDisabledMenuIds());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!authed) return;
    getMenusFromOutlet("coworking")
      .then((data) => {
        setItems(data);
        setError(data.length === 0 ? "Menu coworking kosong / gagal dimuat." : null);
      })
      .finally(() => setLoading(false));
  }, [authed]);

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    // Tanpa VITE_ADMIN_PASSWORD halaman admin terkunci (jangan sampai sandi kosong = bebas masuk)
    if (!ADMIN_PASSWORD || pass !== ADMIN_PASSWORD) {
      setPassError(true);
      setPass("");
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
    setAuthed(true);
  };

  const closeToKiosk = () => {
    // Kiosk ditinggal → sesi admin dikunci lagi, sandi diminta ulang saat jam diklik
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPass("");
    onClose?.();
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
    setPass("");
  };

  const toggle = (id: Product["id"]) => {
    const next = !disabled.includes(String(id));
    setMenuDisabled(id, next);
    setDisabled(getDisabledMenuIds());
  };

  const resetAll = () => {
    disabled.forEach((id) => setMenuDisabled(id, false));
    setDisabled(getDisabledMenuIds());
  };

  const shown = useMemo(
    () =>
      items.filter(
        (m) =>
          !query.trim() ||
          `${m.name} ${m.category}`.toLowerCase().includes(query.trim().toLowerCase())
      ),
    [items, query]
  );

  const offCount = items.filter((m) => disabled.includes(String(m.id))).length;

  if (!authed) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-6 font-sans gap-4">
        {onClose && (
          <button
            type="button"
            onClick={closeToKiosk}
            className="self-start text-sm font-bold text-stone-500 hover:text-stone-800 uppercase tracking-widest"
          >
            ← Kembali ke Kiosk
          </button>
        )}
        <form
          onSubmit={submitPassword}
          className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div>
            <h1 className="text-xl font-black text-stone-800">Admin Menu Coworking</h1>
            <p className="text-sm text-stone-500">Masukkan sandi untuk melanjutkan.</p>
          </div>
          <div className="relative">
            <Input
              type={shownPass ? "text" : "password"}
              autoFocus
              placeholder="Sandi admin"
              value={pass}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPass(e.target.value);
                setPassError(false);
              }}
              aria-invalid={passError}
              className="bg-white pr-20"
            />
            <button
              type="button"
              onClick={() => setShownPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-stone-500 hover:text-stone-800"
            >
              {shownPass ? "Sembunyi" : "Lihat"}
            </button>
          </div>
          {passError && <p className="text-sm text-red-600">Sandi salah.</p>}
          <Button type="submit" className="w-full">
            Masuk
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-6 font-sans">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-stone-800">Admin Menu Coworking</h1>
            <p className="text-sm text-stone-500">
              Nonaktifkan menu sementara jika belum bisa dipakai. Menu nonaktif disembunyikan dari Kiosk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="destructive">{offCount} nonaktif</Badge>
            <Badge variant="outline">{items.length} menu</Badge>
            <Button variant="outline" size="sm" onClick={resetAll} disabled={offCount === 0}>
              Aktifkan semua
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={closeToKiosk}>
                Kembali ke Kiosk
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              Keluar
            </Button>
          </div>
        </div>

        <Input
          placeholder="Cari nama / kategori menu..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          className="bg-white"
        />

        {loading && <p className="text-sm text-stone-500">Memuat menu...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="divide-y divide-stone-200 rounded-xl bg-white shadow-sm">
          {shown.map((m) => {
            const off = disabled.includes(String(m.id));
            return (
              <div key={m.id} className="flex items-center gap-4 p-3">
                <img
                  src={m.image || m.image_url || ""}
                  alt={m.name}
                  className="size-12 rounded-lg object-cover bg-stone-200"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-800">{m.name}</p>
                  <p className="text-xs text-stone-500">
                    {m.category} · Rp {Number(m.price).toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge variant={off ? "destructive" : "secondary"}>
                  {off ? "Nonaktif" : "Tersedia"}
                </Badge>
                <Button
                  variant={off ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggle(m.id)}
                >
                  {off ? "Aktifkan" : "Nonaktifkan"}
                </Button>
              </div>
            );
          })}
          {!loading && shown.length === 0 && (
            <p className="p-4 text-sm text-stone-500">Tidak ada menu yang cocok.</p>
          )}
        </div>
      </div>
    </div>
  );
}
