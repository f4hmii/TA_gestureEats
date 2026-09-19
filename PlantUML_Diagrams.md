# Dokumentasi Analisis Sistem & Diagram PlantUML
Dokumen ini berisi analisis lengkap arsitektur aplikasi Kios Pemesanan Mandiri berbasis *Air Gesture* (Bakso Masyanto) beserta diagram PlantUML untuk Class Diagram, Sequence Diagram, dan Entity-Relationship Diagram (ERD).

---

## 1. Analisis Fungsional & Sistem Kiosk

Aplikasi ini dirancang sebagai Kios Pemesanan Mandiri tanpa sentuh (*touchless self-ordering kiosk*). Interaksi pengguna sepenuhnya dioperasikan melalui kamera depan (webcam) menggunakan pengenalan gerakan tangan (*Air Gesture*).

### Komponen Utama Sistem
1.  **Antarmuka Pengguna (Kiosk Frontend):**
    *   Dibangun dengan **React, Vite, TypeScript, TailwindCSS, dan Motion**.
    *   Navigasi kategori menu (Bakso, Minuman, dll), daftar menu interaktif, keranjang belanja, proses checkout, serta mode penayangan promosi (*idle loop*) saat tidak digunakan.
2.  **Deteksi Gerakan (useHandTracking Hook):**
    *   Menggunakan library **MediaPipe Tasks Vision** (`HandLandmarker`) yang berjalan lokal di browser.
    *   Kursor dipetakan dari koordinat kamera depan ke area layar menggunakan *Exponential Moving Average (EMA)* dengan koefisien $\alpha = 0.2$ untuk meredam getaran kursor (*jitter*).
    *   **Gesture Menggenggam (Fist/Grab):** Melakukan *click event* secara programmatic pada koordinat kursor.
    *   **Gesture Jempol (Thumbs Up):** Melakukan konfirmasi otomatis untuk langsung masuk ke halaman checkout pesanan (*auto-checkout*).
3.  **Layanan Data (API & Database Web Admin):**
    *   Semua data menu produk, data promosi papan digital, penyimpanan order transaksi, serta pengelolaan kupon/voucher loyalitas poin disimpan terpusat di server database Web Admin MySQL.
    *   Kiosk dan Web Mobile Pelanggan melakukan pemanggilan API HTTP ke Web Admin sebagai *Single Source of Truth*.

---

## 2. Diagram PlantUML

### A. Class Diagram
Diagram ini mendefinisikan struktur kelas, hook, dan relasi data di dalam kode React.

```plantuml
@startuml
title Class Diagram - Kiosk Pemesanan Mandiri

class App {
    + menuItems: Product[]
    + promoMedia: DigitalBoardMedia[]
    + cart: CartItem[]
    + activeCategory: string
    + isIdle: boolean
    + isCheckoutOpen: boolean
    + checkoutStep: string
    + selectedItem: Product
    + addToCart(item: Product): void
    + removeFromCart(itemId: number): void
    + updateQuantity(itemId: number, change: number): void
    + handleCheckout(): void
    + confirmOrder(): void
    + closeOrder(): void
}

class Product {
    + id: number
    + name: string
    + category: string
    + price: string
    + description: string
    + image_url: string
}

class CartItem {
    + quantity: number
}

class DigitalBoardMedia {
    + id: number
    + title: string
    + description: string
    + file_url: string
    + file_type: string
    + duration: number
    + is_active: boolean
}

class useHandTracking << (H, #F97316) Hook >> {
    + videoRef: Ref<HTMLVideoElement>
    + canvasRef: Ref<HTMLCanvasElement>
    + cursorRef: Ref<HTMLDivElement>
    + isModelLoaded: boolean
    - initHandTracking(): void
    - predictWebcam(): void
}

class ApiService << (S, #93C5FD) Static >> {
    + getMenus(): Promise<Product[]>
    + getActiveMedia(): Promise<DigitalBoardMedia[]>
    + createOrder(payload: any): Promise<any>
}

Product <|-- CartItem : extends
App o-- useHandTracking : uses
App o-- ApiService : uses
App "1" *-- "0..*" Product : displays
App "1" *-- "0..*" CartItem : manages
App "1" *-- "0..*" DigitalBoardMedia : displays
@enduml
```

---

### B. Sequence Diagram (Alur Interaksi & Transaksi Utama)
Diagram ini menjelaskan interaksi real-time dari input sensor tangan pengguna hingga pengiriman data pesanan ke backend.

```plantuml
@startuml
title Sequence Diagram - Alur Pemesanan & Gesture

actor Pelanggan
participant "Webcam" as Camera
participant "useHandTracking (Hook)" as Tracker
participant "Kiosk App (Frontend)" as Kiosk
database "Database Admin (API)" as Backend

== Inisialisasi ==
Kiosk -> Backend: Mengambil data menu & media promo
Backend --> Kiosk: Mengembalikan daftar menu & promo
Kiosk -> Tracker: Mengaktifkan kamera & memuat model MediaPipe
Tracker -> Camera: Mengambil video feed
Camera --> Tracker: Frame video raw

== Interaksi Navigasi & Memilih Menu ==
loop Setiap Frame Video
    Tracker -> Tracker: Deteksi koordinat tangan (Landmarks)
    alt Tangan terdeteksi
        Tracker -> Tracker: Terapkan EMA Smoothing pada Landmark 9
        Tracker -> Kiosk: Update posisi Kursor Kustom di layar
        
        alt Pengguna Menggenggam Tangan (Fist Gesture)
            Tracker -> Tracker: Hitung jarak jari menekuk
            Tracker -> Kiosk: Trigger event click() secara programmatic pada elemen di bawah kursor
            Kiosk -> Kiosk: Tambahkan item menu terpilih ke keranjang belanja
        end
        
        alt Pengguna Melakukan Gesture Jempol (Thumbs Up)
            Tracker -> Tracker: Deteksi ibu jari tegak & jari lain terlipat
            Tracker -> Kiosk: Dispatchevent('thumbsup')
            Kiosk -> Kiosk: Buka halaman Konfirmasi Checkout (Checkout Screen)
        end
    else Tangan tidak terdeteksi
        Tracker -> Kiosk: Sembunyikan Kursor Kustom
    end
end

== Proses Pembayaran & Transaksi ==
Pelanggan -> Kiosk: Konfirmasi checkout & scan voucher diskon
Kiosk -> Backend: Request verifikasi kode voucher
Backend --> Kiosk: Valid, potong nilai tagihan
Pelanggan -> Kiosk: Bayar via QRIS yang tertera di layar
Kiosk -> Backend: Kirim data transaksi final (POST /api/orders)
Backend -> Backend: Simpan order & status klaim poin = false
Backend --> Kiosk: Konfirmasi sukses dengan order_id
Kiosk -> Kiosk: Tampilkan struk digital & QR Code loyalitas poin (+poin)
Kiosk -> Kiosk: Cetak Struk Fisik
@enduml
```

---

### C. Entity-Relationship Diagram (ERD Konseptual Database)
Diagram ini merepresentasikan struktur penyimpanan data di sisi Web Admin (backend terpusat).

```plantuml
@startuml
title Entity-Relationship Diagram (ERD) - database gesture_eats

' konfigurasi style untuk ERD
!define Table(name,desc) class name as "desc" << (T,#ECECF1) >>
!define pk(x) <b>x <<PK>></b>
!define fk(x) <i>x <<FK>></i>

Table(Product, "products (Tabel Produk)") {
    pk(id) : int
    --
    name : varchar
    category : varchar
    price : decimal
    description : text
    image_url : varchar
    created_at : timestamp
}

Table(Order, "orders (Tabel Transaksi)") {
    pk(id) : int
    --
    total_price : decimal
    payment_method : varchar
    is_points_claimed : boolean
    created_at : timestamp
}

Table(OrderItem, "order_items (Detail Transaksi)") {
    fk(order_id) : int
    fk(product_id) : int
    --
    quantity : int
    price_at_order : decimal
}

Table(DigitalBoardMedia, "digital_board_media (Promosi)") {
    pk(id) : int
    --
    title : varchar
    description : text
    file_url : varchar
    file_type : varchar
    duration : int
    is_active : boolean
}

' Relasi
Order "1" -- "1..*" OrderItem : "mencakup"
Product "1" -- "0..*" OrderItem : "terdaftar dalam"
@enduml
```
