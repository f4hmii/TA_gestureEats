# Use Case Scenario – Sistem Kiosk Gesture-Eats

---

## 1. Scenario Menampilkan Daftar Menu

**Nama Use Case** : Menampilkan Daftar Menu  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses sistem saat pertama kali dimuat, yaitu mengambil seluruh data menu aktif dari server API dan menampilkannya kepada pelanggan dalam bentuk grid kartu menu yang dapat difilter berdasarkan kategori.  
**Pre-Condition** : Aplikasi KiosK berhasil dijalankan dan dapat terhubung ke Menu API serta Database Server.  
**Post-Condition** : Seluruh daftar menu aktif berhasil ditampilkan di layar; pelanggan dapat melihat dan memfilter menu berdasarkan kategori yang diinginkan.

**Skenario Normal/*Basic Flow:***

*Tabel 1. Scenario Menampilkan Daftar Menu*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| | 1. Layar UI KiosK secara otomatis mengirim request `getActiveMenus()` ke Menu API saat aplikasi pertama kali dimuat. |
| | 2. Menu API melakukan query seluruh stok menu makanan & minuman ke Database Server. |
| | 3. Database Server mengembalikan data produk ke Menu API. |
| | 4. Menu API mengembalikan `Array Product[]` ke Layar UI KiosK. |
| | 5. Layar UI KiosK menampilkan grid menu secara keseluruhan kepada pelanggan. |
| 6. Pelanggan memilih tab kategori (contoh: "Minuman"). | |
| | 7. Layar UI KiosK menjalankan fungsi `filterByCategory("Minuman")` secara internal. |
| | 8. Layar UI KiosK merender ulang grid dan hanya menampilkan menu dengan kategori "Minuman". |

---

## 2. Scenario Menampilkan Layar Idle (Promosi Digital)

**Nama Use Case** : Menampilkan Layar Idle / Promosi Digital  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses sistem saat tidak mendeteksi adanya aktivitas pengguna, yaitu beralih ke mode idle dengan menayangkan konten promosi dalam bentuk carousel. Sistem akan kembali ke halaman menu utama secara otomatis ketika kamera mendeteksi kehadiran tangan pelanggan.  
**Pre-Condition** : Tidak ada interaksi pengguna dalam jangka waktu tertentu; Digital Board API aktif dan memiliki data media promosi yang berstatus aktif.  
**Post-Condition** : Layar promosi menutup dan halaman Menu Utama ditampilkan kembali kepada pelanggan setelah tangan terdeteksi oleh kamera.

**Skenario Normal/*Basic Flow:***

*Tabel 2. Scenario Menampilkan Layar Idle (Promosi Digital)*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| | 1. Layar UI KiosK mengirim request `getActiveMedia()` ke Digital Board API. |
| | 2. Digital Board API melakukan query media promosi yang statusnya aktif ke Database Server. |
| | 3. Database Server mengembalikan data media (file_url, tipe, durasi) ke Digital Board API. |
| | 4. Digital Board API mengembalikan `Array DigitalBoardMedia[]` ke Layar UI KiosK. |
| | 5. Layar UI KiosK melakukan render tayangan layar bergulir (Carousel) berisi konten promosi. |
| | 6. Layar UI KiosK memanggil `initHandTracking()` untuk mulai merekam dan memantau kamera. |
| 7. Pelanggan mendekat dan melambaikan tangan ke arah kamera. | |
| | 8. MediaPipe AI mendeteksi keberadaan tangan dan memicu sinyal "Hand Detected". |
| | 9. Layar UI KiosK memanggil `setIsIdle(false)` untuk menghentikan mode idle. |
| | 10. Layar UI KiosK menutup layar promo dan membuka Menu Utama untuk pelanggan. |

---

## 3. Scenario Menambah Item ke Keranjang via Gestur Tangan

**Nama Use Case** : Menambah Item ke Keranjang Menggunakan Gestur Tangan  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses pelanggan saat memilih dan memasukkan item menu ke dalam keranjang belanja tanpa menyentuh layar, yaitu dengan menggerakkan telapak tangan di udara untuk mengarahkan kursor virtual, kemudian mengepalkan tangan (*Fist Gesture*) sebagai instruksi konfirmasi pilihan.  
**Pre-Condition** : Halaman daftar menu sudah tampil di layar; model MediaPipe AI sudah berhasil dimuat dan kamera aktif merekam.  
**Post-Condition** : Item menu yang dipilih masuk ke dalam keranjang belanja; bilah keranjang di bagian bawah layar diperbarui dengan kuantitas dan total harga yang benar.

**Skenario Normal/*Basic Flow:***

*Tabel 3. Scenario Menambah Item ke Keranjang via Gestur Tangan*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| 1. Pelanggan menggerakkan telapak tangan di udara mengarah ke layar. | |
| | 2. MediaPipe AI menghitung dan memperbarui koordinat kursor `(cursor_x, cursor_y)` secara real-time. |
| | 3. Layar UI KiosK memindahkan ikon kursor virtual di layar mengikuti pergerakan tangan. |
| 4. Pelanggan mengepalkan tangan (*Fist Gesture*) di atas kartu menu yang diinginkan. | |
| | 5. MediaPipe AI mendeteksi gestur kepalan dan memanggil `triggerClick()` untuk mengirim event klik virtual ke elemen di bawah kursor. |
| | 6. Layar UI KiosK menjalankan fungsi `addToCart(Product)`. |
| | 7. Layar UI KiosK memperbarui *Cart State* dengan menambah kuantitas item sebesar +1. |
| 8. Pelanggan melihat keranjang di bagian bawah layar bertambah. | 9. Layar UI KiosK menampilkan dan memperbarui bilah keranjang (Cart Bar) di bagian bawah layar. |

---

## 4. Scenario Mengelola Item di Keranjang (Tambah / Kurangi Kuantitas)

**Nama Use Case** : Mengelola Item di Keranjang (Tambah / Kurangi Kuantitas)  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses pelanggan saat membuka panel keranjang dan mengubah kuantitas item yang sudah ada di dalamnya, baik menambah maupun mengurangi, menggunakan gestur tangan sebagai pengganti sentuhan layar. Apabila kuantitas item berkurang menjadi nol, item tersebut otomatis dihapus dari daftar keranjang.  
**Pre-Condition** : Keranjang belanja memiliki minimal satu item; kamera aktif merekam dan sistem siap menerima input gestur tangan.  
**Post-Condition** : Kuantitas item di keranjang diperbarui sesuai aksi pelanggan; total harga dikalkulasi ulang secara otomatis dan ditampilkan.

**Skenario Normal/*Basic Flow:***

*Tabel 4. Scenario Mengelola Item di Keranjang*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| 1. Pelanggan menggerakkan telapak tangan di udara mengarah ke layar KiosK. | |
| | 2. Layar UI KiosK memperbarui koordinat `(cursor_x, cursor_y)` secara real-time. |
| | 3. Layar UI KiosK memindahkan ikon kursor virtual di layar mengikuti koordinat tangan. |
| 4. Pelanggan mengepalkan tangan (*Fist Gesture*) di atas tombol `+` atau `–` pada item di panel keranjang. | |
| | 5. Layar UI KiosK menerima `triggerClick()` (Kirim event klik virtual). |
| | 6. Layar UI KiosK menjalankan fungsi `addToCart(Product)`. |
| | 7. Layar UI KiosK memperbarui *Cart State* (Kuantitas +1). |
| 8. Pelanggan melihat perubahan kuantitas dan total harga di bilah keranjang. | 9. Layar UI KiosK merender ulang tampilan bilah keranjang (Cart) di bagian bawah layar. |

---

## 5. Scenario Klaim Voucher / Promo via Scan QR Code

**Nama Use Case** : Klaim Voucher / Promo Menggunakan Scan QR Code  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses pelanggan saat menukarkan voucher diskon yang dimilikinya dengan cara memindai QR Code dari layar ponsel menggunakan kamera scanner KiosK. Sistem akan memvalidasi kode tersebut ke server dan menerapkan diskon secara otomatis pada total tagihan apabila voucher dinyatakan valid.  
**Pre-Condition** : Keranjang belanja tidak kosong; pelanggan memiliki QR Code voucher yang valid di ponselnya; fitur kamera scanner KiosK tersedia dan berfungsi.  
**Post-Condition** : Diskon berhasil diterapkan dan total harga pesanan diperbarui; atau muncul pesan error yang informatif jika voucher tidak memenuhi syarat validasi.

**Skenario Normal/*Basic Flow:***

*Tabel 5. Scenario Klaim Voucher / Promo via Scan QR Code*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| 1. Pelanggan mengklik tombol **"Gunakan Voucher / Poin"** di panel keranjang. | |
| | 2. Layar UI KiosK menghidupkan kamera pemindai QR (Scanner). |
| 3. Pelanggan mengarahkan QR Code dari layar HP ke arah kamera. | |
| | 4. Scanner berhasil membaca dan mengembalikan String QR Code. |
| | 5. Layar UI KiosK mematikan kamera pemindai setelah QR Code berhasil terbaca. |
| | 6. Layar UI KiosK mengirim request `scanTag(qr_string)` ke API Pengelola. |
| | 7. API Pengelola melakukan validasi kode voucher ke Database Server. |
| | 8. Database Server mengembalikan data diskon yang valid ke API Pengelola. |
| | 9. API Pengelola mengirimkan response sukses ke Layar UI KiosK. |
| | 10. Layar UI KiosK menghitung ulang Total Harga setelah dipotong nilai diskon. |
| 11. Pelanggan melihat konfirmasi diskon berhasil diterapkan. | 12. Layar UI KiosK menampilkan notifikasi **"Diskon Berhasil Diterapkan!"** dan memperbarui tampilan total tagihan. |

---

## 6. Scenario Konfirmasi Pembayaran & Cetak Struk

**Nama Use Case** : Konfirmasi Pembayaran dan Cetak Struk  
**Aktor** : Pelanggan  
**Deskripsi** : Use case ini mendeskripsikan proses akhir transaksi setelah pelanggan selesai melakukan pembayaran melalui QRIS di ponselnya. Pelanggan mengkonfirmasi pembayaran di KiosK, sistem kemudian menyimpan data pesanan ke database, mencetak struk fisik melalui printer thermal, menampilkan struk digital di layar, dan me-reset sistem ke kondisi awal untuk melayani pelanggan berikutnya.  
**Pre-Condition** : Pelanggan telah menyelesaikan pembayaran melalui QRIS di ponselnya; halaman konfirmasi pembayaran (halaman QRIS) sedang tampil di layar KiosK.  
**Post-Condition** : Data pesanan tersimpan di database dengan nomor invoice; struk digital tampil di layar dan struk fisik berhasil dicetak oleh printer thermal; keranjang dikosongkan dan sistem kembali ke mode idle.

**Skenario Normal/*Basic Flow:***

*Tabel 6. Scenario Konfirmasi Pembayaran & Cetak Struk*

| **Aksi Aktor** | **Reaksi Sistem** |
|---|---|
| 1. Pelanggan mengklik tombol **"Sudah Bayar"** sebagai konfirmasi pembayaran. | |
| | 2. Layar UI KiosK menyusun data keranjang menjadi **JSON OrderPayload**. |
| | 3. Layar UI KiosK melakukan pengecekan item terbanyak untuk menentukan routing pesanan (Ngolab / Coworking). |
| | 4. Layar UI KiosK mengirim request `POST createOrder(OrderPayload)` ke Order API. |
| | 5. Order API melakukan `INSERT` data ke tabel **Orders** & **OrderItems** di Database Server. |
| | 6. Database Server mengembalikan konfirmasi sukses beserta **Nomor Invoice** yang di-generate. |
| | 7. Order API mengirimkan **Response (Invoice Data)** ke Layar UI KiosK. |
| | 8. Layar UI KiosK merender **Layar Struk Digital / Resi Sukses** lengkap dengan nomor invoice dan antrean. |
| | 9. Layar UI KiosK memanggil fungsi `window.print()` untuk mengirim perintah cetak ke Printer Thermal. |
| | 10. Printer Thermal mencetak struk dan kertas struk fisik terkeluar. |
| | 11. Layar UI KiosK menampilkan struk digital di layar dan memberikan struk fisik kepada pelanggan. |
| | 12. Layar UI KiosK mengosongkan keranjang (`Cart = 0`). |
| | 13. Layar UI KiosK memanggil `startIdleMode()` untuk kembali ke proses awal dan siap melayani pelanggan berikutnya. |
