import React, { useState, useEffect, useMemo } from "react";
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
  Printer
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

// --- Types ---
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

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

const MENU_ITEMS: MenuItem[] = [
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

const PROMO_IMAGES = [
  {
    url: "https://picsum.photos/seed/bakso-promo/1080/1920",
    title: "Bakso Komplit Spesial",
    subtitle: "Menu Terlaris Minggu Ini"
  },
  {
    url: "https://picsum.photos/seed/yamin-promo/1080/1920",
    title: "Mie Yamin Bakso",
    subtitle: "Perpaduan Sempurna"
  },
  {
    url: "https://picsum.photos/seed/goreng-promo/1080/1920",
    title: "Bakso Goreng Renyah",
    subtitle: "Camilan Favorit Keluarga"
  }
];

const GESTURE_GUIDE = [
  { 
    id: 'wave',
    name: "Lambaikan", 
    desc: "Mulai Memesan", 
    icon: <Hand className="w-8 h-8" />,
    color: "bg-blue-500"
  },
  { 
    id: 'swipe-h',
    name: "Geser Horisontal", 
    desc: "Ganti Kategori", 
    icon: <MoveHorizontal className="w-8 h-8" />,
    color: "bg-orange-500"
  },
  { 
    id: 'swipe-v',
    name: "Geser Vertikal", 
    desc: "Scroll Menu", 
    icon: <MoveVertical className="w-8 h-8" />,
    color: "bg-green-500"
  },
  { 
    id: 'point',
    name: "Tunjuk & Tahan", 
    desc: "Detail Menu", 
    icon: <Pointer className="w-8 h-8" />,
    color: "bg-stone-900"
  }
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [orderComplete, setOrderComplete] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [isIdle, setIsIdle] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{type: 'voucher' | 'point', value: number, code: string} | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPrintNotification, setShowPrintNotification] = useState(false);

  // Hand tracking hook
  const { videoRef, canvasRef, cursorRef, isModelLoaded } = useHandTracking();

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

      idleTimer = setTimeout(() => setIsIdle(true), 15000); // 15 seconds
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

  // Promo Rotation Logic
  useEffect(() => {
    let promoTimer: any;
    if (isIdle) {
      promoTimer = setInterval(() => {
        setPromoIndex(prev => (prev + 1) % PROMO_IMAGES.length);
      }, 5000); // Rotate every 5 seconds
    }
    return () => clearInterval(promoTimer);
  }, [isIdle]);

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
    MENU_ITEMS.filter(item => item.category === activeCategory),
    [activeCategory]
  );

  const cartTotal = useMemo(() => 
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
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

  const addToCart = (item: MenuItem) => {
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

  const confirmOrder = () => {
    setOrderComplete(true);
    // Generate order code: 2 random letters + 4 random digits
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomChars = Array.from({ length: 2 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    const randomNums = Math.floor(1000 + Math.random() * 9000);
    const orderId = `${randomChars}${randomNums}`;
    
    setLastOrderId(orderId);
    
    // Automatically transition to receipt view after 3 seconds
    setTimeout(() => {
      setShowReceipt(true);
    }, 3000);
  };

  const closeOrder = () => {
    setOrderComplete(false);
    setShowReceipt(false);
    setIsCheckoutOpen(false);
    setCart([]);
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

      {/* Idle Promotion Overlay */}
      <AnimatePresence>
        {isIdle && (
          <motion.div
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
                <img
                  src={PROMO_IMAGES[promoIndex].url}
                  alt="Promotion"
                  className="w-full h-full object-cover opacity-70"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col items-center justify-center text-center p-10">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="space-y-6"
                  >
                    <Badge className="bg-orange-600 text-white text-2xl px-6 py-2 rounded-2xl font-black uppercase tracking-widest border-none">
                      Best Seller
                    </Badge>
                    <h2 className="text-8xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
                      {PROMO_IMAGES[promoIndex].title}
                    </h2>
                    <p className="text-3xl text-orange-200 font-bold tracking-wide uppercase">
                      {PROMO_IMAGES[promoIndex].subtitle}
                    </p>
                  </motion.div>
                </div>
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
              {PROMO_IMAGES.map((_, i) => (
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
        <aside className="w-24 bg-white border-r border-stone-100 flex flex-col shrink-0 relative z-20">
        <ScrollArea className="h-full">
          <div className="flex flex-col py-6 gap-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-2 py-4 transition-all relative",
                  activeCategory === cat.id ? "text-orange-600" : "text-stone-400 hover:text-stone-600"
                )}
              >
                {activeCategory === cat.id && (
                  <motion.div 
                    layoutId="active-cat"
                    className="absolute left-0 w-1 h-12 bg-orange-600 rounded-r-full"
                  />
                )}
                <div className={cn(
                  "p-4 rounded-2xl transition-all",
                  activeCategory === cat.id ? "bg-orange-50" : "bg-transparent"
                )}>
                  {React.cloneElement(cat.icon as React.ReactElement, { className: "w-8 h-8" })}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{cat.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Center Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white py-4 px-8 border-b border-stone-100 flex justify-between items-center z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Bakso <span className="text-orange-600">Masyanto</span></h1>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-widest">Kiosk Pemesanan Mandiri</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <p className="text-xs text-stone-400 font-black uppercase tracking-[0.2em] leading-none mb-1.5">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-4xl font-black text-stone-900 tracking-tighter italic leading-none">
                {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                <span className="text-orange-600 animate-pulse ml-1 text-base">
                  {currentTime.getSeconds().toString().padStart(2, '0')}
                </span>
              </p>
            </div>
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
          <ScrollArea className="h-full p-10">
            <div className="space-y-10 pb-10">
              <div className="flex justify-between items-end">
                <h2 className="text-5xl font-black text-stone-800 capitalize tracking-tight">{activeCategory}</h2>
                <span className="text-lg text-stone-400 font-bold">{filteredItems.length} items</span>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="h-full"
                    >
                      <Card 
                        className="rounded-3xl overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white group h-full flex flex-col p-0 cursor-pointer"
                        onClick={() => setSelectedItem(item)}
                      >
                        <CardContent className="p-0 flex flex-col h-full">
                          <div className="aspect-[4/3] w-full overflow-hidden relative shrink-0">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 border-2 border-white/20 rounded-xl overflow-hidden">
                              <Badge className="bg-white/95 text-stone-900 backdrop-blur-md text-sm px-3 py-1.5 border-none font-black shadow-lg">
                                Rp {item.price.toLocaleString('id-ID')}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex-1 p-5 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5 flex-1">
                              <h3 className="font-bold text-lg leading-tight text-stone-800 uppercase tracking-tight line-clamp-2">
                                {item.name}
                              </h3>
                              <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                            <Button 
                              size="lg" 
                              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl w-full h-16 px-6 shadow-xl shadow-orange-100 text-lg font-black uppercase tracking-tight group-hover:scale-[1.02] transition-transform mt-auto shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                            >
                              <ShoppingBasket className="w-6 h-6 mr-2" />
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </ScrollArea>
        </main>
      </div>

      {/* Right Sidebar Checkout Button */}
      <aside className="w-24 bg-orange-600 flex flex-col shrink-0 z-30 shadow-[-10px_0_40px_-20px_rgba(0,0,0,0.2)]">
        <button 
           className="h-full w-full flex flex-col items-center justify-center gap-6 text-white hover:bg-orange-700 transition-colors disabled:bg-stone-300 disabled:text-stone-500"
           onClick={handleCheckout}
           disabled={cart.length === 0}
        >
           <span className="[writing-mode:vertical-rl] text-3xl font-black uppercase tracking-[0.2em] whitespace-nowrap">
             Selesaikan Pesanan
           </span>
           <ChevronRight className="w-8 h-8 stroke-[4] mt-4" />
        </button>
      </aside>
      </div>

      {/* Bottom Horizontal Cart Section */}
      <footer className="bg-white border-t border-stone-100 p-8 flex flex-col gap-6 h-80 z-30 shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.1)] relative shrink-0">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-black text-stone-900 tracking-tighter uppercase italic">Keranjang</h2>
              <div className="bg-orange-600 text-white text-sm font-black h-10 w-10 flex items-center justify-center rounded-xl shadow-lg shadow-orange-200">
                {cartCount}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-stone-400 font-bold uppercase tracking-widest text-sm">Total Pembelian</span>
              <span className="text-5xl font-black text-stone-900 tracking-tighter italic leading-none mt-1">
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
                        className="flex items-center gap-4 bg-stone-50 p-3 pr-5 rounded-[20px] border border-stone-100 group shrink-0 relative hover:border-orange-200 transition-colors w-[360px]"
                      >
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden shadow-sm shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-0 right-0 bg-stone-900/80 backdrop-blur-sm text-white text-xs font-black h-6 min-w-[2rem] px-1.5 flex items-center justify-center rounded-bl-md">
                            {item.quantity}x
                          </div>
                        </div>
                        <div className="flex flex-col justify-center flex-1 min-w-0 pr-1">
                          <p className="text-lg font-black text-stone-800 truncate uppercase tracking-tight leading-tight">{item.name}</p>
                          <p className="text-base text-orange-600 font-bold mt-1">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                          
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
        <DialogContent className="sm:max-w-[800px] w-[90vw] rounded-[48px] border-none p-0 overflow-hidden shadow-3xl bg-white">
          {selectedItem && (
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-1/2 aspect-square md:aspect-auto overflow-hidden">
                <img 
                  src={selectedItem.image} 
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
                    Rp {selectedItem.price.toLocaleString('id-ID')}
                  </div>
                </div>
                
                <div className="mt-12 pt-8 border-t border-stone-100">
                  <Button 
                    className="w-full h-24 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-2xl font-black uppercase tracking-tight shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4 py-8 group"
                    onClick={() => {
                      addToCart(selectedItem);
                      setSelectedItem(null);
                    }}
                  >
                    <ShoppingBasket className="w-10 h-10 group-hover:scale-110 transition-transform" />
                    Tambah ke Pesanan
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
                    <div className="p-12 pb-6 text-center border-b border-stone-100 shrink-0 mt-8">
                      <h2 className="text-6xl font-black text-stone-900 tracking-tight">Detail Pesanan</h2>
                      <p className="text-stone-400 text-2xl font-bold mt-4">
                        Silakan tinjau kembali pesanan Anda sebelum melakukan pembayaran.
                      </p>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full w-full px-12 py-8">
                        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
                          {cart.map((item) => (
                            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-6 p-6 bg-stone-50 rounded-[24px] border border-stone-100">
                              <div className="w-24 h-24 rounded-xl overflow-hidden shadow-sm shrink-0">
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xl font-black text-stone-800 uppercase tracking-tight leading-tight truncate">{item.name}</p>
                                <p className="text-base text-stone-500 font-bold mt-1">Rp {item.price.toLocaleString('id-ID')}</p>
                              </div>
                              <div className="flex items-center gap-3 bg-white rounded-[16px] p-1.5 border-2 border-stone-200 w-max shadow-sm shrink-0 h-max">
                                <button 
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-12 h-12 flex items-center justify-center hover:bg-stone-100 rounded-[12px] text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  <Minus className="w-6 h-6" />
                                </button>
                                <span className="w-12 text-center font-black text-stone-900 text-xl">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-12 h-12 flex items-center justify-center hover:bg-stone-100 rounded-[12px] text-stone-400 hover:text-stone-900 transition-colors"
                                >
                                  <Plus className="w-6 h-6" />
                                </button>
                                <div className="w-[1.5px] h-8 bg-stone-200 mx-1.5" />
                                <button 
                                  onClick={() => removeFromCart(item.id)}
                                  className="w-12 h-12 flex items-center justify-center hover:bg-red-50 rounded-[12px] text-stone-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </button>
                              </div>
                              <div className="w-48 text-right shrink-0">
                                <span className="text-stone-400 font-black uppercase tracking-[0.15em] text-[10px] block mb-1">Subtotal</span>
                                <p className="text-2xl font-black text-orange-600">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="p-12 pt-8 bg-white border-t border-stone-100 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] shrink-0">
                      <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="flex justify-between items-center bg-stone-50 p-10 rounded-[32px]">
                          <span className="text-stone-400 font-black uppercase tracking-[0.2em] text-2xl">Total Pembayaran</span>
                          <span className="text-7xl font-black text-stone-900 tracking-tighter italic">Rp {finalTotal.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex gap-8">
                          <Button 
                            variant="outline"
                            className="flex-1 h-32 rounded-[32px] border-4 border-stone-200 hover:bg-stone-50 text-stone-600 text-3xl font-black transition-all active:scale-95 uppercase tracking-tight"
                            onClick={() => setIsCheckoutOpen(false)}
                          >
                            Kembali
                          </Button>
                          <Button 
                            className="flex-[2] h-32 rounded-[32px] bg-orange-600 hover:bg-orange-700 text-white text-4xl font-black shadow-2xl transition-all active:scale-95 uppercase tracking-tight"
                            onClick={() => setCheckoutStep('payment')}
                          >
                            Lanjut Bayar
                            <ChevronRight className="w-10 h-10 ml-4 stroke-[4]" />
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
                          
                          {appliedPromo ? (
                            <div className="flex justify-between items-center bg-green-50 px-8 py-6 rounded-3xl border-2 border-green-200 w-full">
                                <div className="flex items-center gap-3 text-green-700">
                                  <CheckCircle2 className="w-8 h-8" />
                                  <span className="font-bold text-2xl">Promo: {appliedPromo.code}</span>
                                </div>
                                <span className="text-3xl font-black text-green-700">- Rp {appliedPromo.value.toLocaleString('id-ID')}</span>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setShowPromoDialog(true)}
                              className="w-full flex items-center justify-between px-8 py-6 rounded-3xl border-4 border-dashed border-orange-200 bg-orange-50/50 hover:bg-orange-50 hover:border-orange-300 transition-colors shadow-sm group"
                            >
                               <div className="flex items-center gap-6">
                                 <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                                   <Ticket className="w-8 h-8" />
                                 </div>
                                 <span className="text-2xl font-bold text-orange-700">Gunakan Voucher / Poin</span>
                               </div>
                               <ChevronRight className="w-8 h-8 text-orange-400 group-hover:translate-x-2 transition-transform" />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 bg-orange-50 px-10 py-6 rounded-full border border-orange-100 shadow-sm mt-4">
                          <div className="w-6 h-6 bg-orange-500 rounded-full animate-ping" />
                          <p className="text-orange-700 font-black text-xl uppercase tracking-widest">Menunggu Pembayaran...</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-12 pt-8 bg-stone-50/80 backdrop-blur-md border-t border-stone-100 shrink-0">
                      <div className="max-w-7xl mx-auto flex gap-8">
                        <Button 
                          variant="outline"
                          className="h-32 px-16 rounded-[32px] border-4 border-stone-200 hover:bg-stone-50 text-stone-600 text-2xl font-black transition-all active:scale-95 uppercase tracking-tight"
                          onClick={() => setCheckoutStep('details')}
                        >
                          Kembali
                        </Button>
                        <Button 
                          className="flex-1 h-32 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-4xl font-black shadow-2xl transition-all active:scale-95 uppercase tracking-tight"
                          onClick={confirmOrder}
                        >
                          Sudah Bayar
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
                                    <p className="text-lg text-stone-400 mt-1">{item.quantity}x Rp {item.price.toLocaleString('id-ID')}</p>
                                  </div>
                                  <p className="font-black text-2xl text-stone-900">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</p>
                                </div>
                              ))}
                            </div>

                            <div className="pt-8 border-t-2 border-stone-200">
                              <div className="flex justify-between items-center">
                                <span className="text-stone-400 font-bold text-xl uppercase tracking-widest">Total Belanja</span>
                                <span className="text-4xl font-black text-stone-900">Rp {cartTotal.toLocaleString('id-ID')}</span>
                              </div>
                            </div>

                            <div className="pt-8 mt-8 border-t-2 border-dashed border-stone-200 flex flex-col items-center">
                              <p className="text-stone-400 text-sm font-black uppercase tracking-widest mb-4">Scan untuk Klaim Poin</p>
                              <div className="p-6 bg-white rounded-2xl border-2 border-stone-100 shadow-sm">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=BAKSO_POINTS_${lastOrderId}_VAL_${(cartTotal/1000).toFixed(0)}`}
                                  alt="Loyalty QR"
                                  className="w-48 h-48 mix-blend-multiply"
                                />
                              </div>
                              <p className="text-orange-600 font-black text-2xl mt-6">+{(cartTotal/1000).toFixed(0)} Poin Masyanto</p>
                              <p className="text-xs font-mono text-stone-300 font-bold tracking-widest uppercase mt-2">ID: TRX-{lastOrderId}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </ScrollArea>
                  
                  {showReceipt && (
                    <div className="p-12 pt-8 bg-white border-t border-stone-100 shrink-0 w-full max-w-4xl mx-auto shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                      <Button 
                        className="w-full h-24 rounded-[32px] bg-orange-600 hover:bg-orange-700 text-white text-3xl font-black tracking-tight shadow-xl transition-all active:scale-95 flex items-center justify-center gap-4"
                        onClick={handlePrint}
                      >
                        <Printer className="w-8 h-8" />
                        Cetak Struk
                      </Button>
                      <Button 
                        className="w-full h-24 rounded-[32px] bg-stone-900 hover:bg-stone-800 text-white text-3xl font-black tracking-tight shadow-xl transition-all active:scale-95"
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
      
      {/* Promo Dialog (Scanner Mockup) */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="sm:max-w-[700px] rounded-[48px] border-none p-12 overflow-hidden shadow-3xl bg-stone-900 text-white">
          <div className="flex flex-col items-center">
             <div className="flex justify-between items-center w-full mb-8">
               <div>
                  <h3 className="text-4xl font-black tracking-tight">Scan Voucher / Poin</h3>
                  <p className="text-stone-400 text-xl font-bold mt-2">Arahkan barcode ke pemindai</p>
               </div>
               <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center animate-pulse">
                  <ScanBarcode className="w-8 h-8 text-orange-500" />
               </div>
             </div>
             
             {/* Scanner Box Mockup */}
             <div className="relative w-full aspect-square max-w-[400px] border-4 border-stone-800 rounded-[48px] overflow-hidden mb-10 flex items-center justify-center bg-stone-950">
               <div className="absolute inset-x-0 top-1/2 h-1 bg-orange-500 shadow-[0_0_20px_5px_rgba(249,115,22,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
               <div className="p-12 text-center opacity-50 flex flex-col items-center justify-center">
                 <Barcode className="w-32 h-32 mb-4 text-stone-700" />
                 <p className="font-bold text-stone-600 text-xl uppercase tracking-widest">Scanner Area</p>
               </div>
               
               {/* Decorative corners */}
               <div className="absolute top-8 left-8 w-16 h-16 border-t-8 border-l-8 border-orange-500 rounded-tl-3xl"></div>
               <div className="absolute top-8 right-8 w-16 h-16 border-t-8 border-r-8 border-orange-500 rounded-tr-3xl"></div>
               <div className="absolute bottom-8 left-8 w-16 h-16 border-b-8 border-l-8 border-orange-500 rounded-bl-3xl"></div>
               <div className="absolute bottom-8 right-8 w-16 h-16 border-b-8 border-r-8 border-orange-500 rounded-br-3xl"></div>
             </div>

             <Button 
               className="h-24 w-full bg-orange-600 hover:bg-orange-700 text-white text-3xl font-black rounded-[24px] uppercase tracking-tight shadow-2xl"
               onClick={() => {
                 setAppliedPromo({ type: 'voucher', value: 10000, code: 'HEMAT10K' });
                 setShowPromoDialog(false);
               }}
             >
                Simulasikan Berhasil
             </Button>
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
        </div>
  );
}
