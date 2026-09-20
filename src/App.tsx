import React, { useState, useEffect, useMemo, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBasket,
  Plus,
  Minus,
  ChevronRight,
  Utensils,
  Coffee,
  Pizza as PizzaIcon,
  IceCream,
  Trash2,
  CheckCircle2,
  X,
  Hand,
  MoveHorizontal,
  MoveVertical,
  Pointer,
  HelpCircle,
  Ticket,
  ScanBarcode,
  Barcode,
  Printer,
  ThumbsUp,
  HandFist,
  Loader2,
  AlertCircle,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import qrisBarcode from "./assets/qriz/barcode_qriz.jpeg";
import { useHandTracking } from "./hooks/useHandTracking";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getActiveMenus, isMenuAvailable } from "./api/menu";
import { Product, User, Promotion, CoinPromo, AdminPromo } from "./types/api";
import AdminMenu from "./AdminMenu";
import { getPromotions, scanTag, getCoinPromos, createTangolabOrder, redeemCoinPromo, getAdminPromos, uploadPaymentProof, outletOfItem, apiPrefixForOutlet, buildOrderPayload } from "./api/tangolab";
import {
  getActiveMedia,
  pingScreen,
  DIGITAL_BOARD_API_BASE,
  DigitalBoardMedia,
} from "./api/digitalBoard";

// --- Types ---
type MenuItem = Product;

// --- Helper ---
// /uploads (gambar menu + media idle promo) tidak boleh lewat origin kiosk: nginx site ini
// melayani path itu sebagai static dari dist, jadi balas index.html bukan gambar.
const BASE_URL = import.meta.env.VITE_AIRGESTURE_DOMAIN || import.meta.env.VITE_API_BASE_URL || '';

const resolveImageUrl = (item: MenuItem): string => {
  const img = item.image || item.image_url;
  if (!img) {
    const name = item.name.toLowerCase();
    if (name.includes("yamin") || name.includes("mie")) {
      return "https://picsum.photos/seed/yamin1/400/400";
    }
    if (name.includes("bakso")) {
      return "https://picsum.photos/seed/bakso1/400/400";
    }
    if (name.includes("nasi goreng") || name.includes("nasgor")) {
      return "https://picsum.photos/seed/nasigoreng/400/400";
    }
    if (name.includes("ayam")) {
      return "https://picsum.photos/seed/AyamBakar/400/300";
    }
    // Menggunakan base64 SVG data URI sebagai placeholder lokal yang aman dan andal
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjk3MzE2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3Qgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiB4PSIzIiB5PSIzIiByeD0iMiIgcnk9IjIiLz48Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIvPjxwYXRoIGQ9Im0yMSAxNS0zLjA4Ni0zLjA4NmEyIDIgMCAwIDAtMi44MjggMEw2IDIxIi8+PC9zdmc+";
  }
  if (img.startsWith('http')) return img;

  // Absolut: foto menu ada di backend outlet masing-masing (VITE_*_DOMAIN).
  // Fallback terakhir ke backend coworking, BUKAN IP lokal yang tak terpakai lagi.
  const baseUrl =
    (item.outlet?.toLowerCase() === 'ngolab'
      ? import.meta.env.VITE_KASIR_DOMAIN || import.meta.env.VITE_NGOLAB_API_URL
      : import.meta.env.VITE_AIRGESTURE_DOMAIN || import.meta.env.VITE_COWORKING_API_URL)
    || import.meta.env.VITE_AIRGESTURE_DOMAIN || import.meta.env.VITE_API_BASE_URL || '';

  return `${baseUrl}${img}`;
};

interface CartItem extends MenuItem {
  quantity: number;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// --- Mock Data ---
const CATEGORIES: Category[] = [
  { id: "makanan", name: "Makanan", icon: <Utensils className="w-5 h-5" /> },
  { id: "tambahan", name: "Tambahan", icon: <Plus className="w-5 h-5" /> },
  { id: "minuman", name: "Minuman", icon: <Coffee className="w-5 h-5" /> },
  { id: "eskrim", name: "Es Krim", icon: <IceCream className="w-5 h-5" /> },
];

// Mapping nama kategori dari API → nama tampilan yang lebih bersih
const CATEGORY_NAME_MAP: Record<string, string> = {
  "minuman siap saji": "Minuman",
  "minuman cepat saji": "Minuman",
  "fast drink": "Minuman",
  "beverages": "Minuman",
  "beverage": "Minuman",
  "drinks": "Minuman",
  "drink": "Minuman",
  "makanan utama": "Makanan",
  "main course": "Makanan",
  "food": "Makanan",
  "es krim": "Es Krim",
  "ice cream": "Es Krim",
  "dessert": "Es Krim",
  "snack": "Tambahan",
  "cemilan": "Tambahan",
  "side dish": "Tambahan",
};

// Helper: normalisasi nama kategori dari API
const normalizeCategoryName = (raw: string): string => {
  const lower = raw.toLowerCase().trim();
  return CATEGORY_NAME_MAP[lower] ?? raw;
};

const MENU_ITEMS: any[] = [
  // Makanan (5 total)
  {
    id: "b1",
    name: "Bakso Halus",
    description: "Bakso sapi halus dengan kuah kaldu gurih.",
    price: 20000,
    image: "https://picsum.photos/seed/bakso1/400/400",
    category: "makanan",
  },
  {
    id: "b2",
    name: "Bakso Urat",
    description: "Bakso sapi urat yang kenyal dan penuh rasa.",
    price: 22000,
    image: "https://picsum.photos/seed/bakso2/400/400",
    category: "makanan",
  },
  {
    id: "b3",
    name: "Bakso Komplit",
    description: "Bakso halus, urat, tahu, dan mie.",
    price: 28000,
    image: "https://picsum.photos/seed/bakso3/400/400",
    category: "makanan",
  },
  {
    id: "y1",
    name: "Mie Yamin Manis",
    description: "Mie dengan bumbu kecap manis dan topping ayam.",
    price: 18000,
    image: "https://picsum.photos/seed/yamin1/400/400",
    category: "makanan",
  },
  {
    id: "y2",
    name: "Mie Yamin Asin",
    description: "Mie gurih dengan topping ayam dan sayuran.",
    price: 18000,
    image: "https://picsum.photos/seed/yamin2/400/400",
    category: "makanan",
  },
  // Tambahan (5 total)
  {
    id: "t1",
    name: "Bakso Goreng",
    description: "Bakso goreng renyah isi 3 pcs.",
    price: 15000,
    image: "https://picsum.photos/seed/goreng1/400/400",
    category: "tambahan",
  },
  {
    id: "t2",
    name: "Pangsit Goreng",
    description: "Pangsit goreng garing isi 3 pcs.",
    price: 12000,
    image: "https://picsum.photos/seed/goreng2/400/400",
    category: "tambahan",
  },
  {
    id: "t3",
    name: "Pangsit Gulung",
    description: "Pangsit gulung spesial isi 3 pcs.",
    price: 14000,
    image: "https://picsum.photos/seed/goreng3/400/400",
    category: "tambahan",
  },
  {
    id: "t4",
    name: "Tahu Bakso",
    description: "Tahu isi adonan bakso kukus isi 2 pcs.",
    price: 10000,
    image: "https://picsum.photos/seed/tahu1/400/400",
    category: "tambahan",
  },
  {
    id: "t5",
    name: "Siomay Ikan",
    description: "Siomay ikan tenggiri kukus isi 2 pcs.",
    price: 12000,
    image: "https://picsum.photos/seed/siomay1/400/400",
    category: "tambahan",
  },
  // Minuman (11 total)
  {
    id: "m1",
    name: "Es Teh Manis",
    description: "Teh manis segar dengan es batu.",
    price: 5000,
    image: "https://picsum.photos/seed/drink1/400/400",
    category: "minuman",
  },
  {
    id: "m2",
    name: "Es Jeruk",
    description: "Perasan jeruk asli yang menyegarkan.",
    price: 8000,
    image: "https://picsum.photos/seed/drink2/400/400",
    category: "minuman",
  },
  {
    id: "m3",
    name: "Teh Botol",
    description: "Teh melati dalam kemasan botol dingin.",
    price: 6000,
    image: "https://picsum.photos/seed/drink3/400/400",
    category: "minuman",
  },
  {
    id: "m4",
    name: "Air Mineral",
    description: "Air mineral pegunungan 600ml.",
    price: 4000,
    image: "https://picsum.photos/seed/drink4/400/400",
    category: "minuman",
  },
  {
    id: "m5",
    name: "Es Kelapa Muda",
    description: "Air kelapa murni dengan daging kelapa.",
    price: 12000,
    image: "https://picsum.photos/seed/drink5/400/400",
    category: "minuman",
  },
  {
    id: "m6",
    name: "Soda Gembira",
    description: "Soda dengan susu kental manis dan sirup.",
    price: 15000,
    image: "https://picsum.photos/seed/drink6/400/400",
    category: "minuman",
  },
  {
    id: "m7",
    name: "Es Campur",
    description: "Aneka buah dan jelly dengan sirup merah.",
    price: 15000,
    image: "https://picsum.photos/seed/drink7/400/400",
    category: "minuman",
  },
  {
    id: "m8",
    name: "Es Blewah",
    description: "Serutan buah blewah segar.",
    price: 10000,
    image: "https://picsum.photos/seed/drink8/400/400",
    category: "minuman",
  },
  {
    id: "m9",
    name: "Kopi Hitam",
    description: "Kopi tubruk panas aroma mantap.",
    price: 6000,
    image: "https://picsum.photos/seed/drink9/400/400",
    category: "minuman",
  },
  {
    id: "m10",
    name: "Es Kopi Susu",
    description: "Kopi susu dingin yang creamy.",
    price: 10000,
    image: "https://picsum.photos/seed/drink10/400/400",
    category: "minuman",
  },
  {
    id: "m11",
    name: "Jus Alpukat",
    description: "Jus alpukat kental dengan cokelat.",
    price: 15000,
    image: "https://picsum.photos/seed/drink11/400/400",
    category: "minuman",
  },
  // Es Krim (5 total)
  {
    id: "e1",
    name: "Es Krim Cokelat",
    description: "Es krim lembut rasa cokelat premium.",
    price: 10000,
    image: "https://picsum.photos/seed/ice1/400/400",
    category: "eskrim",
  },
  {
    id: "e2",
    name: "Es Krim Vanilla",
    description: "Es krim lembut rasa vanilla klasik.",
    price: 10000,
    image: "https://picsum.photos/seed/ice2/400/400",
    category: "eskrim",
  },
  {
    id: "e3",
    name: "Es Krim Strawberry",
    description: "Es krim lembut rasa strawberry segar.",
    price: 10000,
    image: "https://picsum.photos/seed/ice3/400/400",
    category: "eskrim",
  },
  {
    id: "e4",
    name: "Es Krim Durian",
    description: "Es krim lembut dengan aroma durian asli.",
    price: 12000,
    image: "https://picsum.photos/seed/ice4/400/400",
    category: "eskrim",
  },
  {
    id: "e5",
    name: "Es Krim Matcha",
    description: "Es krim lembut rasa teh hijau jepang.",
    price: 12000,
    image: "https://picsum.photos/seed/ice5/400/400",
    category: "eskrim",
  },
];

const GESTURE_GUIDE = [
  {
    id: 'point',
    name: "Arahkan Kursor",
    desc: "Tunjuk Layar",
    icon: <Pointer className="w-8 h-8" />,
    color: "bg-blue-500"
  },
  {
    id: 'fist',
    name: "Menggenggam",
    desc: "Memilih / Klik",
    icon: <HandFist className="w-8 h-8" />,
    color: "bg-orange-500"
  },
  {
    id: 'thumbsup',
    name: "Gesture Jempol",
    desc: "Otomatis Check Out",
    icon: <ThumbsUp className="w-8 h-8" />,
    color: "bg-green-500"
  }
];

export default function App() {
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<'all' | 'coworking' | 'ngolab'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [orderComplete, setOrderComplete] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [isIdle, setIsIdle] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ type: 'voucher' | 'point', value: number, code: string } | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPrintNotification, setShowPrintNotification] = useState(false);
  const [promoMedia, setPromoMedia] = useState<Promotion[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coinPromos, setCoinPromos] = useState<CoinPromo[]>([]);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [showCoinPromoDialog, setShowCoinPromoDialog] = useState(false);
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const rfidBuffer = React.useRef("");

  const [manualPromoCode, setManualPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [showProofPreview, setShowProofPreview] = useState(false);
  const [paymentProof, setPaymentProof] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  // Pesanan yang berhasil dibuat per outlet (1 nota bisa jadi 2 pesanan)
  const [createdOrders, setCreatedOrders] = useState<{ outlet: string, orderId: string, total: number }[]>([]);
  const paymentVideoRef = useRef<HTMLVideoElement>(null);
  const paymentCanvasRef = useRef<HTMLCanvasElement>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const clearCountdown = () => {
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  };

  // Hitung mundur 5 detik lalu jepret otomatis
  const startCountdown = () => {
    clearCountdown();
    let remaining = 5;
    setCountdown(remaining);
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        handleCapture();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  };

  const startPaymentCamera = async () => {
    setShowCameraDialog(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (paymentVideoRef.current) {
        paymentVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Gagal mengakses kamera. Pastikan izin diberikan.");
    }
  };

  const stopPaymentCamera = () => {
    clearCountdown();
    if (paymentVideoRef.current && paymentVideoRef.current.srcObject) {
      const stream = paymentVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCameraDialog(false);
  };

  const handleCapture = () => {
    if (paymentVideoRef.current && paymentCanvasRef.current) {
      const context = paymentCanvasRef.current.getContext('2d');
      if (context) {
        paymentCanvasRef.current.width = paymentVideoRef.current.videoWidth;
        paymentCanvasRef.current.height = paymentVideoRef.current.videoHeight;
        context.drawImage(paymentVideoRef.current, 0, 0, paymentCanvasRef.current.width, paymentCanvasRef.current.height);
        const dataUrl = paymentCanvasRef.current.toDataURL('image/jpeg');
        setPaymentProof(dataUrl);
        stopPaymentCamera();
      }
    }
  };
  const barcodeBuffer = React.useRef("");
  const html5QrcodeRef = React.useRef<Html5Qrcode | null>(null);


  // Fetch menus from API (ulang tiap 30s supaya status Habis ikut stok terbaru; kategori hanya di-set saat awal)
  useEffect(() => {
    let first = true;
    const fetchMenus = async () => {
      try {
        const data = await getActiveMenus();
        setMenuItems(data);
        if (first) {
          first = false;
          // Ekstrak kategori unik dari data API dan tambahkan "Semua" di awal
          const cats = Array.from(new Set(data.map(m => normalizeCategoryName(m.category)).filter(Boolean)));
          setDynamicCategories(["Semua", ...cats]);
          setActiveCategory("Semua");
        }
      } catch (error) {
        console.error("[Menu] Gagal mengambil menu:", error);
      }
    };
    fetchMenus();
    const menuTimer = setInterval(fetchMenus, 30000);
    return () => clearInterval(menuTimer);
  }, []);

  // Fetch Digital Board active media (Promotions)
  useEffect(() => {
    const fetchPromoMedia = async () => {
      try {
        console.log("[Promo] Mengambil data promosi...");
        const data = await getPromotions();
        console.log("[Promo] Data diterima:", data);
        if (data && data.length > 0) {
          setPromoMedia(data);
          console.log("[Promo] Berhasil memuat", data.length, "item promosi");
        } else {
          console.warn("[Promo] Data kosong atau tidak valid, gunakan fallback");
        }
      } catch (error) {
        console.error("[Promo] Gagal memuat media promosi:", error);
      }
    };
    fetchPromoMedia();
  }, []);

  // RFID Scanner Listener
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Jangan tangkap input jika sedang di dalam dialog/input lain
      if (e.key === 'Enter') {
        const code = rfidBuffer.current.trim();
        rfidBuffer.current = "";
        if (code.length > 3) {
          try {
            const user = await scanTag(code);
            setCurrentUser(user);
            const promos = await getCoinPromos();
            const activePromos = promos.filter(p => p.is_active === 1);
            setCoinPromos(activePromos);

            // Tampilkan dialog pilihan promo koin jika ada
            if (activePromos.length > 0) {
              setShowCoinPromoDialog(true);
            }
          } catch (err) {
            console.error("Scan RFID gagal", err);
          }
        }
      } else {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9-]/)) {
          rfidBuffer.current += e.key;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler untuk menukar koin menjadi voucher
  const handleRedeemPromo = async (promo: CoinPromo) => {
    if (!currentUser) return;
    if (currentUser.coin_balance < promo.coin_cost) {
      alert(`Koin Anda tidak cukup. Dibutuhkan ${promo.coin_cost} koin, saldo Anda ${currentUser.coin_balance} koin.`);
      return;
    }
    setRedeemingPromo(true);
    try {
      const result = await redeemCoinPromo(currentUser.id, promo.id);
      // Hitung nilai diskon berdasarkan tipe
      let discountValue = 0;
      if (promo.discount_type === 'percentage') {
        discountValue = Math.floor(cartTotal * (promo.discount_value / 100));
      } else {
        discountValue = promo.discount_value;
      }
      setAppliedPromo({ type: 'voucher', value: discountValue, code: result.voucher_code });
      // Update saldo koin user secara lokal
      setCurrentUser(prev => prev ? { ...prev, coin_balance: prev.coin_balance - promo.coin_cost } : null);
      setShowCoinPromoDialog(false);
    } catch (err) {
      console.error("Gagal menukar koin:", err);
      alert("Gagal menukar koin, silakan coba lagi.");
    } finally {
      setRedeemingPromo(false);
    }
  };

  // Screen Ping Logic
  useEffect(() => {
    const doPing = async () => {
      try {
        console.log("Digital Board API: Mengirim ping status online...");
        await pingScreen(1);
        console.log("Digital Board API: Ping sukses.");
      } catch (error) {
        console.error("Digital Board API: Ping gagal:", error);
      }
    };
    doPing();
    const pingTimer = setInterval(doPing, 30000);
    return () => clearInterval(pingTimer);
  }, []);

  // Hand tracking hook
  const { videoRef, canvasRef, cursorRef, isModelLoaded, stopCamera, startCamera } = useHandTracking();

  // Clock Logic
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Idle Timer Logic
  useEffect(() => {
    let idleTimer: any;

    const resetIdleTimer = () => {
      setIsIdle(false);
      if (idleTimer) clearTimeout(idleTimer);

      // Don't start idle timer if checkout dialog is open (QRIS, Success, or Receipt)
      if (isCheckoutOpen) return;

      idleTimer = setTimeout(() => setIsIdle(true), 3000); // 15 seconds
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'activity'];
    events.forEach(event => document.addEventListener(event, resetIdleTimer));

    resetIdleTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetIdleTimer));
      clearTimeout(idleTimer);
    };
  }, [isCheckoutOpen, orderComplete]);

  const promoCount = promoMedia.length;

  // Reset promo index when idle state changes or list size changes
  useEffect(() => {
    setPromoIndex(0);
  }, [isIdle, promoCount]);

  // Promo Rotation Logic
  useEffect(() => {
    let promoTimer: any;
    if (isIdle && promoCount > 0) {
      const currentItem = promoMedia[promoIndex];
      const duration = currentItem && currentItem.duration
        ? currentItem.duration * 1000
        : 5000; // default 5 seconds

      promoTimer = setInterval(() => {
        setPromoIndex(prev => (prev + 1) % promoCount);
      }, duration);
    }
    return () => clearInterval(promoTimer);
  }, [isIdle, promoIndex, promoCount, promoMedia]);

  // Close checkout if cart becomes empty
  useEffect(() => {
    if (cart.length === 0 && isCheckoutOpen && !orderComplete) {
      setIsCheckoutOpen(false);
    }
  }, [cart.length, isCheckoutOpen, orderComplete]);

  // Thumbs up gesture listener
  useEffect(() => {
    const handleThumbsUp = () => {
      // Only trigger checkout if not already open and cart is not empty
      if (!isCheckoutOpen && cart.length > 0) {
        handleCheckout();
      }
    };

    document.addEventListener('thumbsup', handleThumbsUp);
    return () => document.removeEventListener('thumbsup', handleThumbsUp);
  }, [isCheckoutOpen, cart.length]);

  const filteredItems = useMemo(() =>
    menuItems.filter(item => {
      const matchCategory = !activeCategory || activeCategory.toLowerCase() === 'semua' || normalizeCategoryName(item.category).toLowerCase() === activeCategory.toLowerCase();
      const matchOutlet = selectedOutlet === 'all' || !item.outlet || item.outlet.toLowerCase() === selectedOutlet.toLowerCase();
      return matchCategory && matchOutlet;
    }),
    [activeCategory, selectedOutlet, menuItems]
  );

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
    [cart]
  );

  const finalTotal = useMemo(() => {
    let total = cartTotal;
    if (appliedPromo) {
      total = Math.max(0, total - appliedPromo.value);
    }
    return total;
  }, [cartTotal, appliedPromo]);

  const cartCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const handleApplyBarcodeVoucher = async (codeToApply: string) => {
    const code = codeToApply.trim();
    if (!code) return;

    setPromoLoading(true);
    setPromoError(null);
    setPromoSuccess(null);

    try {
      const adminPromos = await getAdminPromos();
      // Cari promo yang cocok (case-insensitive)
      const foundPromo = adminPromos.find(p => p.code.toUpperCase() === code.toUpperCase());

      if (!foundPromo) {
        setPromoError("Voucher tidak ditemukan");
        setPromoLoading(false);
        return;
      }

      // Validasi 1: Status Aktif
      if (foundPromo.status !== 'Active') {
        setPromoError("Voucher sedang tidak aktif");
        setPromoLoading(false);
        return;
      }

      // Validasi 2: Minimal Pembelian
      if (cartTotal < foundPromo.minPurchase) {
        setPromoError(`Minimal pembelian untuk voucher ini adalah Rp ${foundPromo.minPurchase.toLocaleString('id-ID')}`);
        setPromoLoading(false);
        return;
      }

      // Validasi 3: Kuota Penggunaan
      // maxUsage null atau 0 = unlimited (tidak ada batasan)
      const hasUsageLimit = foundPromo.maxUsage !== null && foundPromo.maxUsage > 0;
      if (hasUsageLimit && foundPromo.usageCount >= foundPromo.maxUsage) {
        setPromoError("Voucher telah mencapai batas kuota penggunaan");
        setPromoLoading(false);
        return;
      }

      // Validasi 4: Tanggal Periode
      // Mendukung format "YYYY-MM-DD to YYYY-MM-DD" (ngolab) maupun "YYYY-MM-DD - YYYY-MM-DD"
      if (foundPromo.period) {
        const periodParts = foundPromo.period.split(/ to | - /i);
        const [startDateStr, endDateStr] = periodParts;
        const startDate = new Date(startDateStr.trim());
        const endDate = new Date(endDateStr.trim());
        endDate.setHours(23, 59, 59, 999);
        const now = new Date();
        if (now < startDate || now > endDate) {
          setPromoError(`Voucher hanya berlaku pada periode ${foundPromo.period}`);
          setPromoLoading(false);
          return;
        }
      }

      // Hitung nilai diskon
      let discountValue = 0;
      if (foundPromo.type === 'Percentage') {
        discountValue = Math.floor(cartTotal * (foundPromo.discount / 100));
      } else {
        discountValue = foundPromo.discount;
      }

      // Terapkan promo
      setAppliedPromo({
        type: 'voucher',
        value: discountValue,
        code: foundPromo.code
      });

      setPromoSuccess(`Voucher ${foundPromo.code} berhasil dipasang! Diskon Rp ${discountValue.toLocaleString('id-ID')}`);

      // Tutup dialog setelah jeda visual
      setTimeout(() => {
        closePromoDialogAndResumeHandTracking();
      }, 1500);

    } catch (err) {
      console.error("Gagal memvalidasi voucher:", err);
      setPromoError("Gagal menghubungi server untuk verifikasi voucher");
    } finally {
      setPromoLoading(false);
    }
  };

  const closePromoDialogAndResumeHandTracking = async () => {
    console.log("closePromoDialogAndResumeHandTracking: Memulai penutupan aman...");
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        console.log("closePromoDialogAndResumeHandTracking: Menghentikan scanner kamera...");
        await html5QrcodeRef.current.stop();
      } catch (e) {
        console.error("closePromoDialogAndResumeHandTracking: Gagal stop scanner:", e);
      } finally {
        html5QrcodeRef.current = null;
      }
    }
    setShowPromoDialog(false);
  };


  // Barcode Scanner Listener untuk Voucher Admin
  useEffect(() => {
    if (!showPromoDialog) {
      barcodeBuffer.current = "";
      setPromoError(null);
      setPromoSuccess(null);
      setManualPromoCode("");
      return;
    }

    const handleBarcodeKeyDown = (e: KeyboardEvent) => {
      // Jika user sedang mengetik langsung di kolom input manual, abaikan listener barcode scanner global ini
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Barcode scanner bertindak sebagai emulasi keyboard yang cepat diakhiri Enter.
      if (e.key === 'Enter') {
        const code = barcodeBuffer.current.trim();
        barcodeBuffer.current = "";
        if (code.length > 2) {
          handleApplyBarcodeVoucher(code);
        }
      } else {
        // Abaikan tombol kontrol sistem
        if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9-]/)) {
          barcodeBuffer.current += e.key;
          setManualPromoCode(barcodeBuffer.current);
        }
      }
    };

    window.addEventListener('keydown', handleBarcodeKeyDown);
    return () => window.removeEventListener('keydown', handleBarcodeKeyDown);
  }, [showPromoDialog, cartTotal]);

  // Camera Barcode Scanner dengan html5-qrcode
  useEffect(() => {
    if (!showPromoDialog) return;

    // 1. Hentikan kamera hand tracking sementara agar tidak konflik kamera
    stopCamera();

    let html5Qrcode: Html5Qrcode | null = null;
    let isStopped = false;

    // Tunggu sebentar agar div #reader dirender oleh React sebelum diakses
    const startScanner = async () => {
      try {
        html5Qrcode = new Html5Qrcode("reader");
        html5QrcodeRef.current = html5Qrcode;


        const qrCodeSuccessCallback = (decodedText: string) => {
          console.log("Barcode/QR Terdeteksi Kamera:", decodedText);
          handleApplyBarcodeVoucher(decodedText);

          if (html5Qrcode && html5Qrcode.isScanning && !isStopped) {
            isStopped = true;
            html5Qrcode.stop().catch(err => console.error("Gagal stop scanner setelah sukses:", err));
          }
        };

        const config = {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        };

        await html5Qrcode.start(
          { facingMode: "user" },
          config,
          qrCodeSuccessCallback,
          () => {
            // Abaikan error logs untuk frame yang tidak ada barcode-nya
          }
        );
      } catch (err) {
        console.error("Gagal menyalakan scanner webcam:", err);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);

      const cleanup = async () => {
        if (html5Qrcode && html5Qrcode.isScanning) {
          try {
            await html5Qrcode.stop();
          } catch (e) {
            console.error("Cleanup stop scanner failed:", e);
          }
        }
        // 2. Hidupkan kembali kamera hand tracking setelah dialog ditutup
        startCamera();
      };
      cleanup();
    };
  }, [showPromoDialog]);


  const addToCart = (item: MenuItem) => {
    // Jangan masukkan menu stok habis (mis. dari dialog detail yang masih terbuka saat data berubah)
    if (!isMenuAvailable(item)) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleCheckout = () => {
    setCheckoutStep('details');
    setIsCheckoutOpen(true);
  };

  const confirmOrder = async () => {
    // Outlet dikelompokkan per item — 1 nota bisa berisi menu ngolab + coworking,
    // tiap grup dikirim ke server outlet masing-masing (KDS admin terpisah).
    const grouped: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const outlet = outletOfItem(item);
      (grouped[outlet] ||= []).push(item);
    });
    const groups = Object.entries(grouped);

    setSubmittingOrder(true);
    try {
      const customerName = currentUser ? currentUser.nama : `Pelanggan Kiosk #${Math.floor(Math.random() * 100)}`;
      // Satu external_id untuk seluruh nota; tiap outlet dapat suffix agar tidak bentrok
      const notaId = `KIOSK-${Date.now()}`;

      const created: { outlet: string, orderId: string, apiPrefix: string, total: number }[] = [];
      let failed: { outlet: string, message: string } | null = null;

      for (const [outlet, items] of groups) {
        const groupTotal = items.reduce((sum, item) => sum + parseFloat(item.price as any) * item.quantity, 0);
        const isLast = outlet === groups[groups.length - 1][0];
        // Diskon promo dibagi proporsional; grup terakhir menyerap sisa pembulatan
        const allocated = isLast
          ? Math.max(0, finalTotal - created.reduce((sum, g) => sum + g.total, 0))
          : Math.round(groupTotal * finalTotal / (cartTotal || 1));

        const externalId = groups.length === 1 ? notaId : `${notaId}-${outlet === 'ngolab' ? 'NGL' : 'CWK'}`;
        const payload = buildOrderPayload(outlet, {
          customerName,
          total: allocated,
          items,
          externalId,
          userId: currentUser?.id as string | undefined,
        });

        try {
          const res = await createTangolabOrder(payload, apiPrefixForOutlet(outlet));
          // Bentuk response beda: coworking {message, order:{id}}, ngolab {message, id}
          const orderId = res?.order?.id || res?.id || res?.invoice_number || externalId;
          created.push({ outlet, orderId, apiPrefix: apiPrefixForOutlet(outlet), total: allocated });
        } catch (groupError) {
          // Jangan lanjut kirim grup lain: tampilkan persis outlet mana yang gagal
          failed = { outlet, message: groupError instanceof Error ? groupError.message : String(groupError) };
          break;
        }
      }

      setCreatedOrders(created);
      setLastOrderId(created[0]?.orderId || notaId);

      // Bukti bayar dikirim ke tiap pesanan yang berhasil dibuat
      if (paymentProof) {
        for (const order of created) {
          try {
            await uploadPaymentProof(order.orderId, paymentProof, order.apiPrefix);
          } catch (uploadError) {
            console.error(`Gagal mengunggah bukti pembayaran (${order.outlet}):`, uploadError);
          }
        }
      }

      if (failed) {
        const done = created.map(c => `${c.outlet} (${c.orderId})`).join(', ');
        throw new Error(
          `outlet ${failed.outlet} menolak pesanan — ${failed.message}` +
          (done ? `. Pesanan yang sudah masuk: ${done}` : '')
        );
      }

      // Hitung simulasi earned points, e.g. 5% of total
      setEarnedPoints(Math.floor(finalTotal * 0.05));

      setOrderComplete(true);
      setTimeout(() => setShowReceipt(true), 3000);
    } catch (e) {
      console.error("Order failed", e);
      alert(`Pesanan gagal dibuat: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const closeOrder = () => {
    setOrderComplete(false);
    setShowReceipt(false);
    setIsCheckoutOpen(false);
    setCart([]);
    // Reset semua state promo & user agar transaksi berikutnya mulai bersih
    setAppliedPromo(null);
    setPromoError(null);
    setPromoSuccess(null);
    setManualPromoCode("");
    setCurrentUser(null);
    setPaymentProof(null);
    setCreatedOrders([]);
    setEarnedPoints(0);
  };

  const handlePrint = () => {
    setShowPrintNotification(true);
    window.print();
    setTimeout(() => {
      setShowPrintNotification(false);
    }, 3000);
  };

  return (
    <div className="h-screen bg-stone-50 font-sans text-stone-900 flex flex-col overflow-hidden relative">
      {/* Air Gesture Cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-16 h-16 pointer-events-none z-[9999] opacity-0 transition-opacity duration-300"
        style={{ willChange: 'transform' }}
      >
        <div className="absolute -top-3 -left-4 text-orange-600 drop-shadow-[0_0_20px_rgba(249,115,22,0.9)] filter">
          <Pointer className="w-16 h-16 fill-orange-500 -rotate-45" strokeWidth={1.5} />
        </div>
        <div className="absolute top-0 left-0 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border-[3px] border-orange-600 -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Hidden Hand Tracking Elements */}
      <div className="fixed opacity-0 pointer-events-none -z-50" style={{ left: '-9999px' }}>
        <video
          ref={videoRef}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
        />
      </div>

      {/* Halaman Admin (dibuka lewat klik jam di header) */}
      <AnimatePresence>
        {showAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-stone-100 overflow-y-auto"
          >
            <AdminMenu forceLogin onClose={() => setShowAdmin(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle Promotion Overlay */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
            id="idle_screen_container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => setIsIdle(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={promoIndex}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 1 }}
                className="relative w-full h-full"
              >
                {(() => {
                  const item: Promotion | undefined = promoMedia[promoIndex];

                  if (!item) return null;

                  const rawUrl = item.file_url;
                  // Jika URL relatif (upload dari admin), tambahkan base URL
                  const url = rawUrl && !rawUrl.startsWith('http')
                    ? `${BASE_URL}${rawUrl}`
                    : rawUrl;

                  return (
                    <>
                      {item.file_type === "video" ? (
                        <video
                          src={url}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : (
                        <img
                          src={url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>

            {/* Static Content while Idle */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                  <div className="w-2 h-2 bg-orange-600 rounded-full" />
                  <div className="w-12 h-1 bg-white/20 rounded-full" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-white text-4xl font-black uppercase tracking-[0.4em] italic drop-shadow-lg">
                    Lambaikan Tangan
                  </p>
                  <p className="text-orange-200 text-sm font-bold uppercase tracking-widest opacity-60">
                    Air Gesture Detection Active
                  </p>
                </div>

                {/* Quick Gesture Legend on Idle */}
                <div className="flex gap-8 mt-4">
                  {GESTURE_GUIDE.map((g) => (
                    <div key={g.id} className="flex flex-col items-center gap-2 opacity-40">
                      <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                        {React.cloneElement(g.icon as React.ReactElement, { className: "w-5 h-5 text-white" })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Promo Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 z-[110]">
              {Array.from({ length: promoCount }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    promoIndex === i ? "w-12 bg-orange-600" : "w-2 bg-white/30"
                  )}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print Notification */}
      <AnimatePresence>
        {showPrintNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-stone-900 text-white px-8 py-5 rounded-[32px] shadow-3xl border border-white/10 flex items-center gap-5 min-w-[320px]"
          >
            <div className="bg-orange-600 p-3 rounded-2xl shadow-lg shadow-orange-900/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <p className="font-black text-xl uppercase tracking-tight leading-tight">Struk Dicetak</p>
              <p className="text-sm text-stone-400 font-bold uppercase tracking-widest mt-1">Silakan Ambil di Printer</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Categories */}
        <aside className="w-[clamp(56px,5vw,96px)] bg-white border-r border-stone-100 flex flex-col shrink-0 relative z-20">
          <ScrollArea className="h-full">
            <div className="flex flex-col py-6 gap-6">
              {dynamicCategories.map((cat) => {
                const getCategoryIcon = (categoryName: string) => {
                  const name = categoryName.toLowerCase();
                  if (name === 'semua') return <ShoppingBasket className="w-8 h-8" />;
                  if (name === 'minuman') return <Coffee className="w-8 h-8" />;
                  if (name === 'es krim' || name === 'eskrim' || name === 'dessert') return <IceCream className="w-8 h-8" />;
                  if (name === 'tambahan' || name === 'cemilan' || name === 'snack') return <Plus className="w-8 h-8" />;
                  return <Utensils className="w-8 h-8" />;
                };

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-3 transition-all relative",
                      activeCategory === cat ? "text-orange-600" : "text-stone-400 hover:text-stone-600"
                    )}
                  >
                    {activeCategory === cat && (
                      <motion.div
                        layoutId="active-cat"
                        className="absolute left-0 w-1 h-12 bg-orange-600 rounded-r-full"
                      />
                    )}
                    <div className={cn(
                      "p-2 rounded-2xl transition-all",
                      activeCategory === cat ? "bg-orange-50" : "bg-transparent"
                    )}>
                      {getCategoryIcon(cat)}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{cat}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Center Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white py-[clamp(8px,1.2vh,16px)] px-[clamp(12px,2vw,32px)] border-b border-stone-100 flex justify-between items-center z-10 shrink-0">
            <div>
              <h1 className="text-[clamp(1rem,1.8vw,1.5rem)] font-bold tracking-tight text-stone-900">Bakso <span className="text-orange-600">Masyanto</span></h1>
              <p className="text-[clamp(8px,0.8vw,12px)] text-stone-500 font-medium uppercase tracking-widest">Kiosk Pemesanan Mandiri</p>
            </div>

            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setShowAdmin(true)}
                title="Admin"
                className="flex flex-col items-end rounded-2xl px-4 py-2 transition-all active:scale-95 hover:bg-stone-50"
              >
                <p className="text-xs text-stone-400 font-black uppercase tracking-[0.2em] leading-none mb-1.5">
                  {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[clamp(1rem,2vw,2.25rem)] font-black text-stone-900 tracking-tighter italic leading-none">
                  {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                  <span className="text-orange-600 animate-pulse ml-1 text-base">
                    {currentTime.getSeconds().toString().padStart(2, '0')}
                  </span>
                </p>
              </button>
            </div>
          </header>

          {/* Gesture Instruction Bar */}
          <div className="bg-stone-900 text-white/90 overflow-hidden shrink-0 border-b border-white/10">
            <div className="flex items-center justify-center gap-12 px-8 py-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-orange-500 shrink-0">
                <ScanBarcode className="w-5 h-5 animate-pulse" />
                Gesture Active
              </div>
              {GESTURE_GUIDE.map((g) => (
                <div key={g.id} className="flex items-center gap-4 shrink-0">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    {React.cloneElement(g.icon as React.ReactElement, { className: "w-4 h-4 text-white" })}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-wider">{g.name}</span>
                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-tight">{g.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <main className="flex-1 bg-stone-50/50 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-[clamp(16px,2vh,40px)] p-[clamp(12px,2vw,40px)] pb-[clamp(12px,2vh,40px)]">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-[clamp(1.5rem,3vw,3rem)] font-black text-stone-800 capitalize tracking-tight">{activeCategory}</h2>
                    <span className="text-lg text-stone-400 font-bold">{filteredItems.length} items</span>
                  </div>

                  {/* Outlet Filter Tabs */}
                  <div className="flex gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200/50">
                    {(['all', 'coworking', 'ngolab'] as const).map((outlet) => (
                      <button
                        key={outlet}
                        onClick={() => setSelectedOutlet(outlet)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                          selectedOutlet === outlet
                            ? "bg-white text-orange-600 shadow-sm"
                            : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        {outlet === 'all' ? 'Semua' : outlet === 'coworking' ? 'Coworking' : 'Ngolab'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.map((item) => {
                      const habis = !isMenuAvailable(item);
                      return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="h-full"
                      >
                        <Card
                          className={cn(
                            "rounded-3xl overflow-hidden border-none shadow-sm transition-shadow bg-white group h-full flex flex-col p-0",
                            habis ? "cursor-not-allowed opacity-60" : "hover:shadow-md cursor-pointer"
                          )}
                          onClick={() => !habis && setSelectedItem(item)}
                        >
                          <CardContent className="p-0 flex flex-col h-full">
                            <div className="aspect-[4/3] w-full overflow-hidden relative shrink-0">
                              <img
                                src={resolveImageUrl(item)}
                                alt={item.name}
                                className={cn(
                                  "w-full h-full object-cover transition-transform duration-500",
                                  habis ? "grayscale" : "group-hover:scale-110"
                                )}
                                referrerPolicy="no-referrer"
                              />
                              {habis && (
                                <>
                                  <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]" />
                                  <span className="absolute inset-0 flex items-center justify-center text-white text-[clamp(1rem,1.6vw,1.75rem)] font-black uppercase tracking-[0.2em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                                    Habis
                                  </span>
                                </>
                              )}
                              {item.outlet && (
                                <div className="absolute top-2 left-2 rounded-xl overflow-hidden shadow-md">
                                  <Badge className={cn(
                                    "text-[10px] px-2.5 py-1 border-none font-black uppercase tracking-wider text-white",
                                    item.outlet.toLowerCase() === 'coworking'
                                      ? "bg-amber-600/90 hover:bg-amber-600/90"
                                      : "bg-purple-600/90 hover:bg-purple-600/90"
                                  )}>
                                    {item.outlet}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 p-5 flex flex-col gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                  <h3 className="font-bold text-lg leading-tight text-stone-800 uppercase tracking-tight line-clamp-2">
                                    {item.name}
                                  </h3>
                                  <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>
                                <span className="shrink-0 self-start font-black text-[clamp(20px,1.8vw,28px)] leading-none text-orange-600 tracking-tight whitespace-nowrap">
                                  Rp {parseFloat(item.price).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <Button
                                size="lg"
                                disabled={habis}
                                className={cn(
                                  "rounded-2xl w-full h-[clamp(40px,5.5vh,64px)] px-6 text-[clamp(13px,1.2vw,18px)] font-black uppercase tracking-tight mt-auto shrink-0",
                                  habis
                                    ? "bg-stone-300 text-stone-500 shadow-none"
                                    : "bg-orange-600 hover:bg-orange-700 text-white shadow-xl shadow-orange-100 group-hover:scale-[1.02] transition-transform"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                              >
                                <ShoppingBasket className="w-6 h-6 mr-2" />
                                {habis ? "Habis" : "Add"}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </ScrollArea>
          </main>
        </div>

        {/* Right Sidebar Checkout Button */}
        <aside className="w-[clamp(56px,5vw,96px)] bg-orange-600 flex flex-col shrink-0 z-30 shadow-[-10px_0_40px_-20px_rgba(0,0,0,0.2)]">
          <button
            className="h-full w-full flex flex-col items-center justify-center gap-6 text-white hover:bg-orange-700 transition-colors disabled:bg-stone-300 disabled:text-stone-500"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            <span className="[writing-mode:vertical-rl] text-[clamp(13px,1.4vw,22px)] font-black uppercase tracking-[0.2em] whitespace-nowrap">
              Selesaikan Pesanan
            </span>
            <ChevronRight className="w-8 h-8 stroke-[4] mt-4" />
          </button>
        </aside>
      </div>

      {/* Bottom Horizontal Cart Section */}
      <footer className="bg-white border-t border-stone-100 p-[clamp(12px,2vw,32px)] flex flex-col gap-[clamp(8px,1.5vh,24px)] h-[clamp(180px,22vh,320px)] z-30 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)] relative shrink-0">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-[clamp(1.2rem,2.5vw,1.875rem)] font-black text-stone-900 tracking-tighter uppercase italic">Keranjang</h2>
            <div className="bg-orange-600 text-white text-sm font-black h-10 w-10 flex items-center justify-center rounded-xl shadow-lg shadow-orange-200">
              {cartCount}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-stone-400 font-bold uppercase tracking-widest text-sm">Total Pembelian</span>
            <span className="text-[clamp(1.5rem,3.5vw,3rem)] font-black text-stone-900 tracking-tighter italic leading-none mt-1">
              Rp {cartTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative">
          <ScrollArea className="w-full h-full" orientation="horizontal">
            <div className="flex gap-6 pb-4 px-2">
              <AnimatePresence mode="popLayout">
                {cart.length > 0 ? (
                  cart.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.8, x: -20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-3 bg-stone-50 p-2 pr-4 rounded-[20px] border border-stone-100 group shrink-0 relative hover:border-orange-200 transition-colors w-[clamp(240px,28vw,360px)]"
                    >
                      <div className="relative w-[clamp(56px,5.5vw,96px)] h-[clamp(56px,5.5vw,96px)] rounded-lg overflow-hidden shadow-sm shrink-0">
                        <img
                          src={resolveImageUrl(item)}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-0 right-0 bg-stone-900/80 backdrop-blur-sm text-white text-xs font-black h-6 min-w-[2rem] px-1.5 flex items-center justify-center rounded-bl-md">
                          {item.quantity}x
                        </div>
                      </div>
                      <div className="flex flex-col justify-center flex-1 min-w-0 pr-1">
                        <p className="text-[clamp(12px,1.2vw,18px)] font-black text-stone-800 truncate uppercase tracking-tight leading-tight">{item.name}</p>
                        <p className="text-[clamp(11px,1vw,16px)] text-orange-600 font-bold mt-1">Rp {(parseFloat(item.price) * item.quantity).toLocaleString('id-ID')}</p>

                        <div className="flex items-center gap-3 mt-3 bg-white rounded-xl p-1.5 border border-stone-200/50 w-max shadow-sm">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-black text-stone-900 text-lg">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-900 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <div className="w-[1px] h-5 bg-stone-200 mx-1" />
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-stone-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex items-center gap-6 py-10 opacity-30 px-6">
                    <ShoppingBasket className="w-16 h-16 text-stone-400" />
                    <p className="font-black uppercase tracking-[0.2em] text-sm italic text-stone-500">Pilih Menu untuk Memulai Pesanan</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </footer>

      {/* Floating Control Center (Gesture Friendly) - REMOVED for layout implementation */}


      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-[800px] w-[90vw] rounded-[48px] border-none p-0 overflow-hidden shadow-3xl bg-white">
          {selectedItem && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto overflow-hidden">
                <img
                  src={resolveImageUrl(selectedItem)}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-12 flex flex-col justify-between flex-1 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-6 right-6 text-stone-300 hover:text-stone-900 rounded-full"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="w-8 h-8" />
                </Button>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <Badge className="bg-orange-100 text-orange-600 border-none font-black px-4 py-1.5 uppercase text-[10px] tracking-[0.2em] rounded-full">
                      {selectedItem.category}
                    </Badge>
                    <h2 className="text-3xl md:text-4xl font-black text-stone-900 tracking-tight leading-none uppercase">
                      {selectedItem.name}
                    </h2>
                  </div>

                  <div className="h-0.5 w-12 bg-orange-600/20 rounded-full" />

                  <p className="text-stone-500 text-xl leading-relaxed font-bold">
                    {selectedItem.description}
                  </p>

                  <div className="text-5xl font-black text-stone-900 italic tracking-tighter">
                    Rp {parseFloat(selectedItem.price).toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-stone-100">
                  <Button
                    disabled={!isMenuAvailable(selectedItem)}
                    className="w-full h-24 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-2xl font-black uppercase tracking-tight shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 py-8 group disabled:bg-stone-300 disabled:text-stone-500 disabled:shadow-none"
                    onClick={() => {
                      addToCart(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    <ShoppingBasket className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    {isMenuAvailable(selectedItem) ? "Tambah ke Pesanan" : "Habis"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout Full Screen */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-white flex flex-col overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!orderComplete ? (
                checkoutStep === 'details' ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col h-full"
                  >
                    <div className="p-[clamp(16px,3vw,48px)] pb-4 text-center border-b border-stone-100 shrink-0 mt-4">
                      <h2 className="text-[clamp(1.8rem,4vw,3.75rem)] font-black text-stone-900 tracking-tight">Detail Pesanan</h2>
                      <p className="text-stone-400 text-[clamp(0.9rem,1.5vw,1.5rem)] font-bold mt-2">
                        Silakan tinjau kembali pesanan Anda sebelum melakukan pembayaran.
                      </p>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full w-full px-12 py-8">
                        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
                          {cart.map((item) => (
                            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 p-4 bg-stone-50 rounded-[24px] border border-stone-100">
                              <div className="w-[clamp(56px,5.5vw,96px)] h-[clamp(56px,5.5vw,96px)] rounded-xl overflow-hidden shadow-sm shrink-0">
                                <img src={resolveImageUrl(item)} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xl font-black text-stone-800 uppercase tracking-tight leading-tight truncate">{item.name}</p>
                                <p className="text-base text-stone-500 font-bold mt-1">Rp {parseFloat(item.price).toLocaleString('id-ID')}</p>
                              </div>
                              <div className="flex items-center gap-3 bg-white rounded-[16px] p-1.5 border-2 border-stone-200 w-max shadow-sm shrink-0 h-max">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-[clamp(32px,4vw,48px)] h-[clamp(32px,4vw,48px)] flex items-center justify-center hover:bg-stone-100 rounded-[12px] text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  <Minus className="w-6 h-6" />
                                </button>
                                <span className="w-12 text-center font-black text-stone-900 text-xl">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-[clamp(32px,4vw,48px)] h-[clamp(32px,4vw,48px)] flex items-center justify-center hover:bg-stone-100 rounded-[12px] text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  <Plus className="w-6 h-6" />
                                </button>
                                <div className="w-[1.5px] h-8 bg-stone-200 mx-1.5" />
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-[clamp(32px,4vw,48px)] h-[clamp(32px,4vw,48px)] flex items-center justify-center hover:bg-red-50 rounded-[12px] text-stone-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                              <div className="w-48 text-right shrink-0">
                                <span className="text-stone-400 font-black uppercase tracking-[0.15em] text-[10px] block mb-1">Subtotal</span>
                                <p className="text-2xl font-black text-orange-600">Rp {(parseFloat(item.price) * item.quantity).toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="p-12 pt-8 bg-white border-t border-stone-100 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] shrink-0">
                      <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="flex justify-between items-center bg-stone-50 p-[clamp(16px,2.5vw,40px)] rounded-[32px]">
                          <span className="text-stone-400 font-black uppercase tracking-[0.2em] text-[clamp(1rem,1.8vw,1.5rem)]">Total Pembayaran</span>
                          <span className="text-[clamp(1.5rem,4vw,4.5rem)] font-black text-stone-900 tracking-tighter italic">Rp {finalTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-4">
                          <Button
                            variant="outline"
                            className="flex-1 h-[clamp(48px,7.5vh,96px)] rounded-[24px] border-4 border-stone-200 hover:bg-stone-50 text-stone-600 text-[clamp(1rem,2vw,1.875rem)] font-black transition-all active:scale-95 uppercase tracking-tight"
                            onClick={() => setIsCheckoutOpen(false)}
                          >
                            Kembali
                          </Button>
                          <Button
                            className="flex-[2] h-[clamp(48px,7.5vh,96px)] rounded-[24px] bg-orange-600 hover:bg-orange-700 text-white text-[clamp(1.1rem,2.5vw,2.25rem)] font-black shadow-2xl transition-all active:scale-95 uppercase tracking-tight"
                            onClick={() => setCheckoutStep('payment')}
                          >
                            Lanjut Bayar
                            <ChevronRight className="w-8 h-8 ml-3 stroke-[4]" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="flex flex-col h-full"
                  >
                    <div className="p-12 pb-6 text-center shrink-0 mt-8">
                      <h2 className="text-6xl font-black text-stone-900 tracking-tight">Pembayaran</h2>
                      <p className="text-stone-400 text-2xl font-bold mt-4">
                        Pindai QRIS di bawah ini untuk menyelesaikan pesanan Anda.
                      </p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-start pt-8 overflow-hidden px-12 gap-12">
                      {/* QRIS Section (Centered) */}
                      <div className="flex flex-col items-center justify-start space-y-8">
                        <div className="flex flex-col items-center gap-6">
                          <p className="text-xl font-black text-orange-600 uppercase tracking-[0.3em]">QRIS Standar</p>
                          <div className="bg-white rounded-3xl border-4 border-stone-100 shadow-2xl group overflow-hidden inline-flex">
                            <img
                              src={qrisBarcode}
                              alt="QRIS Code"
                              className="w-[720px] h-auto object-contain"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
                          <div className="flex justify-between items-center w-full px-8 py-6 bg-stone-50 rounded-3xl border-2 border-stone-100">
                            <span className="text-xl font-bold text-stone-500 uppercase tracking-widest">Total Tagihan</span>
                            <span className="text-4xl font-black text-stone-900 tracking-tighter italic">Rp {finalTotal.toLocaleString('id-ID')}</span>
                          </div>


                        </div>

                        <div className="flex items-center gap-6 bg-orange-50 px-10 py-6 rounded-full border border-orange-100 shadow-sm mt-4">
                          <div className="w-6 h-6 bg-orange-500 rounded-full animate-ping" />
                          <p className="text-orange-700 font-black text-xl uppercase tracking-widest">Menunggu Pembayaran...</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-12 pt-8 bg-stone-50/80 backdrop-blur-md border-t border-stone-100 shrink-0">
                      {paymentProof && (
                        <div className="max-w-7xl mx-auto mb-6 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setShowProofPreview(true)}
                            className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-green-500 shadow-xl transition-all active:scale-95 hover:scale-105"
                          >
                            <img src={paymentProof} alt="Bukti Bayar" className="w-full h-full object-cover" />
                            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs font-black uppercase tracking-widest py-1">
                              Lihat / Ulangi
                            </span>
                          </button>
                        </div>
                      )}
                      <div className="max-w-7xl mx-auto flex gap-8">
                        <Button
                          variant="outline"
                          className="h-32 px-16 rounded-[32px] border-4 border-stone-200 hover:bg-stone-50 text-stone-600 text-2xl font-black transition-all active:scale-95 uppercase tracking-tight"
                          onClick={() => setCheckoutStep('details')}
                        >
                          Kembali
                        </Button>
                        <Button
                          className="flex-1 h-32 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-4xl font-black shadow-2xl transition-all active:scale-95 uppercase tracking-tight disabled:opacity-50"
                          onClick={paymentProof ? confirmOrder : startPaymentCamera}
                          disabled={paymentProof ? submittingOrder : false}
                        >
                          {paymentProof ? (submittingOrder ? "Mengirim..." : "Sudah Bayar") : "Unggah Bukti Bayar"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col h-full justify-center pb-20 pt-10"
                >
                  <ScrollArea className="flex-1 w-full max-w-4xl mx-auto">
                    <div className={cn(
                      "flex flex-col items-center text-center space-y-10",
                      showReceipt ? "p-12" : "p-16"
                    )}>
                      <div className="w-40 h-40 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", damping: 12, stiffness: 200 }}
                        >
                          <CheckCircle2 className="w-20 h-20" />
                        </motion.div>
                      </div>
                      <h2 className="text-6xl font-black text-stone-900 tracking-tight">Pesanan Berhasil!</h2>
                      <div className="space-y-4 pb-4">
                        <p className="text-stone-500 text-3xl font-bold uppercase tracking-widest">Nomor Antrean</p>
                        <p className="text-9xl font-black text-orange-600 tracking-tighter">#420</p>
                      </div>

                      <AnimatePresence mode="wait">
                        {!showReceipt ? (
                          <motion.div
                            key="success-msg"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center pt-8"
                          >
                            <p className="text-2xl text-stone-400 max-w-xl font-bold leading-relaxed">
                              Silakan ambil struk Anda dan tunggu nomor Anda dipanggil.
                            </p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="receipt"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full bg-stone-50 rounded-[48px] p-12 border-2 border-stone-100 space-y-10 text-left mt-8"
                          >
                            <div className="flex justify-between items-start border-b-2 border-dashed border-stone-200 pb-8">
                              <div>
                                <h3 className="text-3xl font-black text-stone-900 uppercase">Struk Pembayaran</h3>
                                <p className="text-stone-500 font-bold mt-1 text-base tracking-[0.3em] uppercase">{lastOrderId}</p>
                                <p className="text-stone-400 font-bold mt-1 text-lg">Bakso Masyanto - Kiosk #1</p>
                                {createdOrders.length > 1 && (
                                  <div className="mt-3 space-y-1">
                                    <p className="text-stone-400 font-bold text-sm uppercase tracking-widest">Pesanan diteruskan ke dapur:</p>
                                    {createdOrders.map(o => (
                                      <p key={o.outlet} className="text-stone-500 font-bold text-sm uppercase">
                                        - {o.outlet === 'ngolab' ? 'Ngolab (Kasir)' : 'Coworking'} · {o.orderId} · Rp {o.total.toLocaleString('id-ID')}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-stone-400 font-bold text-lg">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                <p className="text-stone-400 font-bold text-lg">{currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')} WIB</p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              {cart.map((item) => (
                                <div key={item.id} className="flex justify-between items-center group">
                                  <div>
                                    <p className="font-bold text-2xl text-stone-800 group-hover:text-orange-600 transition-colors uppercase">{item.name}</p>
                                    <p className="text-lg text-stone-400 mt-1">{item.quantity}x Rp {parseFloat(item.price).toLocaleString('id-ID')}</p>
                                  </div>
                                  <p className="font-black text-2xl text-stone-900">Rp {(parseFloat(item.price) * item.quantity).toLocaleString('id-ID')}</p>
                                </div>
                              ))}
                            </div>

                            <div className="pt-8 border-t-2 border-stone-200">
                              <div className="flex justify-between items-center">
                                <span className="text-stone-400 font-bold text-xl uppercase tracking-widest">Total Belanja</span>
                                <span className="text-4xl font-black text-stone-900">Rp {cartTotal.toLocaleString('id-ID')}</span>
                              </div>
                            </div>

                            {/* Barcode klaim poin disembunyikan sementara */}
                            {false && (
                            <div className="pt-8 mt-8 border-t-2 border-dashed border-stone-200 flex flex-col items-center">
                              <p className="text-stone-400 text-sm font-black uppercase tracking-widest mb-4">Scan untuk Klaim Poin</p>
                              <div className="p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                <img
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=BAKSO_POINTS_${lastOrderId}_VAL_${(cartTotal / 1000).toFixed(0)}`}
                                  alt="Loyalty QR"
                                  className="w-48 h-48 mix-blend-multiply"
                                />
                              </div>
                              <p className="text-orange-600 font-black text-2xl mt-6">+{(cartTotal / 1000).toFixed(0)} Poin Masyanto</p>
                              <p className="text-xs font-mono text-stone-300 font-bold tracking-widest uppercase mt-2">ID: TRX-{lastOrderId}</p>
                            </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>

                  {showReceipt && (
                    <div className="p-12 pt-8 bg-white border-t border-stone-100 shrink-0 w-full max-w-4xl mx-auto shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                      {/* Tombol Cetak Struk dinonaktifkan sementara */}
                      {false && (
                      <Button
                        className="w-full h-24 rounded-[32px] bg-orange-600 hover:bg-orange-700 text-white text-3xl font-black tracking-tight shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4"
                        onClick={handlePrint}
                      >
                        <Printer className="w-8 h-8" />
                        Cetak Struk
                      </Button>
                      )}
                      <Button
                        className="w-full h-32 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-4xl font-black tracking-tight border-4 border-stone-700 shadow-2xl transition-all active:scale-95"
                        onClick={closeOrder}
                      >
                        Selesai & Kembali
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promo Dialog (Scanner Barcode & Input Manual) */}
      <Dialog open={showPromoDialog} onOpenChange={(open) => {
        if (!open) {
          closePromoDialogAndResumeHandTracking();
        }
      }}>

        <DialogContent className="sm:max-w-[700px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-stone-900 text-white">
          <div className="flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-8">
              <div>
                <h3 className="text-4xl font-black tracking-tight">Scan Barcode Voucher</h3>
                <p className="text-stone-400 text-xl font-bold mt-2">Arahkan barcode voucher fisik Anda ke pemindai</p>
              </div>
              <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center">
                <ScanBarcode className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
            </div>
            {/* Scanner Box Camera */}
            <div className="relative w-full aspect-square max-w-[400px] border-4 border-stone-800 rounded-[48px] overflow-hidden mb-8 bg-stone-950 shadow-inner flex items-center justify-center">
              {/* Container video webcam */}
              <div id="reader" className="w-full h-full absolute inset-0 [&_video]:object-cover [&_video]:w-full [&_video]:h-full [&_a]:hidden" />

              {/* Garis Laser Animasi */}
              <div className="absolute inset-x-0 top-1/2 h-1 bg-orange-500 shadow-[0_0_20px_5px_rgba(249,115,22,0.6)] animate-[scan_2s_ease-in-out_infinite] pointer-events-none z-10" />

              {/* Decorative corners */}
              <div className="absolute top-8 left-8 w-16 h-16 border-t-8 border-l-8 border-orange-500 rounded-tl-3xl pointer-events-none z-10"></div>
              <div className="absolute top-8 right-8 w-16 h-16 border-t-8 border-r-8 border-orange-500 rounded-tr-3xl pointer-events-none z-10"></div>
              <div className="absolute bottom-8 left-8 w-16 h-16 border-b-8 border-l-8 border-orange-500 rounded-bl-3xl pointer-events-none z-10"></div>
              <div className="absolute bottom-8 right-8 w-16 h-16 border-b-8 border-r-8 border-orange-500 rounded-br-3xl pointer-events-none z-10"></div>
            </div>

            {/* Feedback & Input Manual Area */}
            <div className="w-full space-y-6">
              {promoLoading && (
                <div className="flex items-center justify-center gap-4 bg-stone-800/80 p-6 rounded-3xl border border-stone-700 text-orange-400 animate-[pulse_1.5s_infinite]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="font-black text-xl uppercase tracking-wider">Memverifikasi Voucher...</span>
                </div>
              )}

              {promoError && (
                <div className="flex items-center gap-4 bg-red-950/80 p-6 rounded-3xl border border-red-900 text-red-400">
                  <AlertCircle className="w-8 h-8 shrink-0" />
                  <span className="font-bold text-lg leading-relaxed">{promoError}</span>
                </div>
              )}

              {promoSuccess && (
                <div className="flex items-center gap-4 bg-green-950/80 p-6 rounded-3xl border border-green-900 text-green-400">
                  <CheckCircle2 className="w-8 h-8 shrink-0 animate-[bounce_0.6s_infinite]" />
                  <span className="font-black text-lg">{promoSuccess}</span>
                </div>
              )}

              {/* Manual Input Fallback */}
              <div className="flex gap-4">
                <input
                  type="text"
                  value={manualPromoCode}
                  onChange={(e) => setManualPromoCode(e.target.value)}
                  placeholder="Atau masukkan kode voucher disini..."
                  className="flex-1 bg-stone-950 border-2 border-stone-800 rounded-3xl px-6 py-5 text-2xl font-bold tracking-widest text-white placeholder-stone-600 focus:outline-none focus:border-orange-500 transition-colors shadow-inner"
                  disabled={promoLoading}
                />
                <Button
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-stone-800 text-white font-black text-xl px-10 py-5 h-auto rounded-3xl uppercase tracking-tight shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                  onClick={() => handleApplyBarcodeVoucher(manualPromoCode)}
                  disabled={promoLoading || !manualPromoCode.trim()}
                >
                  Terapkan
                </Button>
              </div>

              {/* Simulation Triggers for Demo */}
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-stone-800">
                <span className="text-stone-500 font-bold text-xs uppercase tracking-widest">Simulasikan Pemindaian Barcode Admin</span>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setManualPromoCode("KEMERDEKAAN");
                      handleApplyBarcodeVoucher("KEMERDEKAAN");
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-orange-400 font-bold rounded-xl text-xs uppercase transition-colors"
                    disabled={promoLoading}
                  >
                    Voucher [KEMERDEKAAN] (Rp 2.000)
                  </button>
                  <button
                    onClick={() => {
                      setManualPromoCode("BERKAH");
                      handleApplyBarcodeVoucher("BERKAH");
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-orange-400 font-bold rounded-xl text-xs uppercase transition-colors"
                    disabled={promoLoading}
                  >
                    Voucher [BERKAH] (Rp 3.000)
                  </button>
                  <button
                    onClick={() => {
                      setManualPromoCode("JUNIJULE");
                      handleApplyBarcodeVoucher("JUNIJULE");
                    }}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-orange-400 font-bold rounded-xl text-xs uppercase transition-colors"
                    disabled={promoLoading}
                  >
                    Voucher [JUNIJULE] (Rp 3.000)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gesture Help Dialog */}
      <Dialog open={showGestureHelp} onOpenChange={setShowGestureHelp}>
        <DialogContent className="sm:max-w-[600px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-white">
          <DialogHeader className="text-center mb-8">
            <DialogTitle className="text-4xl font-black text-stone-900 tracking-tight">Panduan Air Gesture</DialogTitle>
            <DialogDescription className="text-stone-400 text-lg font-bold mt-2">
              Kios ini dilengkapi dengan sensor deteksi gerakan tangan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6">
            {GESTURE_GUIDE.map((g) => (
              <div key={g.id} className="flex items-center gap-6 p-6 rounded-3xl bg-stone-50 border border-stone-100 hover:border-orange-200 transition-colors group">
                <div className={cn("p-4 rounded-2xl text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform", g.color)}>
                  {g.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-black text-stone-800 tracking-tight">{g.name}</h4>
                  <p className="text-stone-500 font-bold">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 bg-orange-50 rounded-3xl border border-orange-100 italic text-orange-600 text-center font-bold text-sm">
            "Gerakkan tangan Anda di depan layar dengan jarak sekitar 30-50cm untuk hasil terbaik."
          </div>

          <Button
            className="w-full h-20 rounded-[24px] bg-stone-900 hover:bg-stone-800 text-white text-xl font-black uppercase tracking-tight shadow-xl mt-8"
            onClick={() => setShowGestureHelp(false)}
          >
            Mengerti, Lanjutkan
          </Button>
        </DialogContent>
      </Dialog>

      {/* Coin Promo Dialog - Muncul setelah RFID scan */}
      <Dialog open={showCoinPromoDialog} onOpenChange={setShowCoinPromoDialog}>
        <DialogContent className="sm:max-w-[600px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-white">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-black text-stone-900 tracking-tight">
              🪙 Tukar Koin
            </DialogTitle>
            <DialogDescription className="text-stone-400 text-lg font-bold mt-2">
              Pilih promo untuk ditukar dengan koin Anda
            </DialogDescription>
          </DialogHeader>

          {/* User Info */}
          {currentUser && (
            <div className="flex items-center gap-5 p-5 bg-stone-50 rounded-3xl border border-stone-100 mb-6">
              <img
                src={currentUser.avatar_url}
                alt={currentUser.nama}
                className="w-16 h-16 rounded-full object-cover border-2 border-orange-500"
              />
              <div className="flex-1">
                <p className="text-xl font-black text-stone-800 tracking-tight">{currentUser.nama}</p>
                <p className="text-sm text-stone-500 font-bold">NIM: {currentUser.nim}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-orange-600">{currentUser.coin_balance}</p>
                <p className="text-xs text-stone-400 font-black uppercase tracking-widest">Koin</p>
              </div>
            </div>
          )}

          {/* Promo List */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {coinPromos.map((promo) => (
                <div key={promo.id} className="flex items-center gap-4 p-5 rounded-3xl bg-stone-50 border border-stone-100 hover:border-orange-200 transition-colors group">
                  {promo.image_url && (
                    <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                      <img
                        src={promo.image_url.startsWith('http') ? promo.image_url : `${BASE_URL}${promo.image_url}`}
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-black text-stone-800 tracking-tight truncate">{promo.title}</p>
                    <p className="text-sm text-stone-500 truncate">{promo.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-black text-xs">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `Rp ${promo.discount_value.toLocaleString('id-ID')}`}
                      </Badge>
                      <span className="text-xs text-stone-400 font-bold">🪙 {promo.coin_cost} Koin</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRedeemPromo(promo)}
                    disabled={redeemingPromo || !currentUser || currentUser.coin_balance < promo.coin_cost}
                    className="shrink-0 h-14 px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black uppercase tracking-tight shadow-lg disabled:opacity-40"
                  >
                    {redeemingPromo ? "..." : "Tukar"}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          <Button
            className="w-full h-16 rounded-[24px] bg-stone-200 hover:bg-stone-300 text-stone-700 text-lg font-black uppercase tracking-tight mt-6"
            onClick={() => setShowCoinPromoDialog(false)}
          >
            Lewati
          </Button>
        </DialogContent>
      </Dialog>

      {/* Camera Dialog for Payment Proof */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => {
        if (!open) stopPaymentCamera();
      }}>
        <DialogContent className="sm:max-w-[600px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-stone-900 text-white">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-black tracking-tight text-white">Ambil Foto Bukti Bayar</DialogTitle>
            <DialogDescription className="text-stone-400 text-lg mt-2">
              Arahkan bukti bayar Anda ke kamera, lalu tekan Mulai Hitungan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full aspect-square max-w-[400px] bg-stone-950 rounded-3xl overflow-hidden border-4 border-stone-800 flex items-center justify-center shadow-inner">
              <video ref={paymentVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={paymentCanvasRef} className="hidden" />
              {countdown !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                  <span className="text-white font-black text-[160px] leading-none drop-shadow-2xl tabular-nums">{countdown}</span>
                  <span className="text-white/90 font-black text-2xl uppercase tracking-[0.3em] mt-4">Bersiap...</span>
                </div>
              )}
            </div>
            <div className="flex gap-6 w-full max-w-[400px]">
            {countdown === null && (
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-2xl font-black py-8 rounded-3xl uppercase tracking-tight"
                onClick={startCountdown}
              >
                <Camera className="w-8 h-8 mr-3" />
                Mulai Hitungan
              </Button>
            )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview & Ulangi Bukti Bayar */}
      <Dialog open={showProofPreview} onOpenChange={setShowProofPreview}>
        <DialogContent className="sm:max-w-[720px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-stone-900 text-white">
          <DialogHeader className="text-center mb-6">
            <DialogTitle className="text-3xl font-black tracking-tight text-white">Preview Bukti Bayar</DialogTitle>
            <DialogDescription className="text-stone-400 text-lg mt-2">
              Pastikan bukti bayar terbaca jelas. Kalau kurang jelas, ulangi foto.
            </DialogDescription>
          </DialogHeader>
          {paymentProof && (
            <img
              src={paymentProof}
              alt="Preview Bukti Bayar"
              className="w-full max-h-[55vh] object-contain rounded-3xl border-4 border-stone-800 bg-stone-950"
            />
          )}
          <div className="flex gap-6 mt-6">
            <Button
              variant="outline"
              className="flex-1 bg-transparent border-4 border-stone-700 hover:bg-stone-800 text-white text-2xl font-black h-24 rounded-3xl uppercase tracking-tight"
              onClick={() => setShowProofPreview(false)}
            >
              Tutup
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-2xl font-black h-24 rounded-3xl uppercase tracking-tight"
              onClick={() => {
                setShowProofPreview(false);
                startPaymentCamera();
              }}
            >
              <Camera className="w-8 h-8 mr-3" />
              Ulangi Foto
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
