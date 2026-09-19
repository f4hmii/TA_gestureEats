# Sequence Diagrams - Gesture-Eats

## 1. Proses Layar Menganggur (Idle Mode)
```plantuml
@startuml
title 1. Sequence Diagram - Proses Layar Menganggur (Idle Mode)
autonumber

actor "Pelanggan" as user
participant "Layar UI Kiosk" as ui
participant "MediaPipe AI (Kamera)" as ai
participant "DigitalBoard API" as api
database "Database Server" as db

ui -> api : Request getActiveMedia()
activate api
api -> db : Query promo yang statusnya aktif
activate db
db --> api : Return data (file_url, tipe, durasi)
deactivate db
api --> ui : Array DigitalBoardMedia[]
deactivate api

ui -> ui : Render tayangan layar bergulir (Carousel)
ui -> ai : initHandTracking() (Mulai rekam kamera)
activate ai

user -> ai : Mendekat & melambaikan tangan
ai -> ui : Trigger sinyal "Hand Detected"
deactivate ai

ui -> ui : setIsIdle(false)
ui --> user : Menutup layar promo, membuka Menu Utama
@enduml
```

## 2. Proses Menampilkan Menu Utama (Browsing)
```plantuml
@startuml
title 2. Sequence Diagram - Proses Menampilkan Menu Utama
autonumber

actor "Pelanggan" as user
participant "Layar UI Kiosk" as ui
participant "Menu API" as api
database "Database Server" as db

ui -> api : Request getActiveMenus()
activate api
api -> db : Query seluruh stok menu makanan & minuman
activate db
db --> api : Return data produk
deactivate db
api --> ui : Array Product[]
deactivate api

ui --> user : Menampilkan grid menu secara keseluruhan

user -> ui : Memilih tab Kategori (contoh: "Minuman")
ui -> ui : filterByCategory("Minuman")
ui --> user : Merender ulang grid, hanya menampilkan Minuman
@enduml
```

## 3. Proses Tambah Pesanan (Air Gesture)
```plantuml
@startuml
title 3. Sequence Diagram - Proses Tambah Pesanan (Air Gesture)
autonumber

actor "Pelanggan" as user
participant "MediaPipe AI (Kamera)" as ai
participant "Layar UI Kiosk" as ui

activate ui
user -> ai : Menggerakkan telapak tangan di udara
activate ai
ai -> ui : Update koordinat (cursor_x, cursor_y)
ui -> ui : Pindahkan ikon kursor di layar mengikuti tangan

user -> ai : Mengepalkan tangan (Fist Gesture) di atas kartu menu
ai -> ui : triggerClick() (Kirim event klik virtual)
deactivate ai

ui -> ui : addToCart(Product)
ui -> ui : Update Cart State (Kuantitas +1)
ui --> user : Munculkan menu di bilah keranjang (Cart) bagian bawah
deactivate ui
@enduml
```

## 4. Proses Klaim Voucher / Poin
```plantuml
@startuml
title 4. Sequence Diagram - Proses Klaim Voucher / Poin
autonumber

actor "Pelanggan" as user
participant "Layar UI Kiosk" as ui
participant "Html5Qrcode (Scanner)" as scanner
participant "Tangolab API" as api
database "Database Server" as db

user -> ui : Klik tombol "Gunakan Voucher / Poin"
ui -> scanner : Hidupkan kamera pemindai QR
activate scanner

user -> scanner : Mengarahkan QR Code dari HP ke kamera
scanner -> ui : Return String QR Code (Berhasil dibaca)
deactivate scanner
ui -> scanner : Matikan kamera pemindai

ui -> api : Request scanTag(qr_string)
activate api
api -> db : Validasi kode voucher / ID user
activate db
db --> api : Return data diskon / saldo poin
deactivate db
api --> ui : Response sukses (Nilai Potongan Harga)
deactivate api

ui -> ui : Hitung ulang Total Harga (Total - Diskon)
ui --> user : Tampilkan notifikasi "Diskon Berhasil Diterapkan!"
@enduml
```

## 5. Proses Checkout & Pembayaran QRIS
```plantuml
@startuml
title 5. Sequence Diagram - Proses Checkout & Pembayaran QRIS
autonumber

actor "Pelanggan" as user
participant "Layar UI Kiosk" as ui

user -> ui : Klik "Selesaikan Pesanan"
ui -> ui : Set isCheckoutOpen = true
ui --> user : Tampilkan Rincian Keranjang & Total Tagihan

user -> ui : Klik "Lanjut Bayar"
ui -> ui : Render gambar statis Barcode QRIS
ui --> user : Tampilkan Instruksi Pembayaran QRIS

user -> user : Membuka m-Banking & Scan Barcode QRIS di layar
note right of user : Proses pembayaran terjadi di luar sistem Kiosk (HP Pelanggan)

user -> ui : Klik tombol konfirmasi "Sudah Bayar"
@enduml
```

## 6. Pencatatan Transaksi & Cetak Struk
```plantuml
@startuml
title 6. Sequence Diagram - Pencatatan Transaksi & Cetak Struk
autonumber

participant "Layar UI Kiosk" as ui
participant "Order API (Routing)" as api
database "Database Ngolab / Coworking" as db
participant "Printer Kiosk" as printer

ui -> ui : Susun array keranjang menjadi JSON OrderPayload
ui -> ui : Cek item terbanyak (Routing ke Ngolab / Coworking)

ui -> api : POST createOrder(OrderPayload)
activate api
api -> db : INSERT data ke tabel Orders & OrderItems
activate db
db --> api : Return sukses (Nomor Invoice Generated)
deactivate db
api --> ui : Response (Invoice Data)
deactivate api

ui -> ui : Render layar Struk Digital / Resi Sukses
ui -> printer : Panggil fungsi window.print()
activate printer
printer --> ui : Kertas struk tercetak keluar
deactivate printer

ui -> ui : Kosongkan keranjang (Cart = 0)
ui -> ui : startIdleMode() (Kembali ke proses awal)
@enduml
```
