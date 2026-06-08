# Money Tracker Web App - Product & Technical Spec

Status: Draft awal
Tanggal: 2026-06-08
Stack awal: React, TypeScript, Vite, Firebase Auth, Firestore, Cloud Functions, Telegram Bot API

Dokumen pendamping:

- `docs/FINANCE_INPUT_MODEL.md` untuk detail jenis input finansial, termasuk pemasukan, pengeluaran, transfer, hutang biasa, piutang, hutang cicilan, pembayaran cicilan, dan denda.

## 1. Tujuan Produk

Money Tracker adalah web app keuangan personal atau bisnis kecil untuk mencatat pemasukan, pengeluaran, budget, laporan, dan hutang/piutang. Aplikasi dibuat dengan tampilan mobile-first seperti referensi gambar, tetapi tetap nyaman digunakan di desktop.

Input cepat yang pada referensi menggunakan WhatsApp diganti menjadi Telegram. User bisa mencatat transaksi lewat web app atau mengirim perintah ke bot Telegram.

Login utama menggunakan Google Sign-In dari Firebase Authentication.

## 2. Target Pengguna

- Freelancer, studio kecil, atau pemilik bisnis yang ingin melihat arus kas bulanan dengan cepat.
- Pengguna yang sering mencatat transaksi kecil dari HP.
- Pengguna yang ingin input transaksi tanpa membuka app, cukup via Telegram.
- Pengguna yang punya cicilan, hutang, denda, atau piutang yang perlu dipantau.

## 3. Prinsip Desain

- Mobile-first, mengikuti feel aplikasi keuangan modern.
- Navigasi bawah tetap terlihat di mobile.
- Kartu ringkasan dibuat besar dan mudah dipindai.
- Warna hijau untuk pemasukan/surplus/aksi utama.
- Warna merah atau pink tua untuk pengeluaran, hutang, dan risiko.
- Tampilan tidak terlalu dekoratif. Fokus pada angka, status, dan aksi.
- Semua angka rupiah harus memakai format Indonesia, contoh `Rp23.300.451`.
- UI tetap harus bisa dipakai tanpa data nyata dengan demo seed data.

## 4. Modul Utama

### 4.1 Authentication

Fitur:

- Login dengan Google via Firebase Auth.
- Logout.
- Session persistence menggunakan Firebase Auth state.
- Jika env Firebase belum tersedia di development, app boleh memakai mode demo lokal.

Data user minimal:

- `uid`
- `displayName`
- `email`
- `photoURL`
- `createdAt`
- `lastLoginAt`

Aturan:

- Semua data finansial disimpan per user.
- User tidak boleh membaca atau menulis data user lain.
- Setelah login pertama, sistem membuat workspace default.

### 4.2 Workspace

Workspace adalah ruang data seperti contoh `Tiga Awan Studio`.

Fitur:

- Workspace default dibuat otomatis.
- Nama workspace bisa diubah.
- Bulan aktif bisa dipilih.
- Semua ringkasan memakai workspace dan bulan aktif.

Data:

```ts
type Workspace = {
  id: string;
  ownerUid: string;
  name: string;
  currency: "IDR";
  monthStartDay: number;
  telegramChatIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

### 4.3 Beranda

Mengikuti referensi gambar 1 dan 2.

Konten:

- Header: logo, judul `Beranda`, bulan aktif, nama workspace, tombol tambah, avatar user.
- Kartu surplus:
  - Status `SURPLUS` jika netto >= 0, `DEFISIT` jika netto < 0.
  - Nilai netto bulan ini.
  - Label `Surplus bulan ini` atau `Defisit bulan ini`.
  - Persentase perbandingan pemasukan terhadap pengeluaran.
  - Total `Masuk`.
  - Total `Keluar`.
  - Progress ratio masuk vs keluar.
  - Tombol/link ke daftar transaksi bulan ini.
- Shortcut:
  - `Catat`
  - `Budget`
  - `Laporan`
- Banner Telegram:
  - `Catat lewat Telegram - lihat contoh perintah`
  - Membuka halaman panduan Telegram.
- Transaksi terbaru:
  - Grup tanggal.
  - Icon kategori.
  - Judul transaksi.
  - ID transaksi.
  - Nama kategori.
  - Amount dengan warna sesuai tipe.
- Pengeluaran per kategori:
  - Total keluar.
  - List kategori terbesar.
  - Progress bar per kategori.
  - Persentase dari total keluar.

Logic:

- `incomeTotal = sum(transactions where type == income and in active month)`
- `expenseTotal = sum(transactions where type == expense and in active month)`
- `netTotal = incomeTotal - expenseTotal`
- `incomePercent = incomeTotal / (incomeTotal + expenseTotal)`
- `expensePercent = expenseTotal / (incomeTotal + expenseTotal)`
- `expenseCategoryPercent = categoryExpense / expenseTotal`
- Transaksi terbaru default menampilkan 5 sampai 8 item.

### 4.4 Transaksi

Mengikuti referensi gambar 6.

Fitur:

- Judul `Transaksi`.
- Jumlah entri.
- Mode pilih untuk bulk action.
- Export CSV.
- Tambah transaksi manual.
- Ringkasan keuangan berdasarkan bulan aktif.
- Filter:
  - Bulan.
  - Tipe: semua, masuk, keluar.
  - Kategori.
  - Akun.
  - Source: web, telegram, import.
- List transaksi lengkap.
- Detail transaksi.
- Edit transaksi.
- Hapus transaksi.

Data transaksi:

```ts
type Transaction = {
  id: string;
  workspaceId: string;
  userId: string;
  code: string;
  date: string;
  title: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string;
  accountId: string;
  source: "web" | "telegram" | "import";
  note?: string;
  telegramMessageId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Aturan ID:

- Kode transaksi memakai format `TX-000001`.
- Nomor bertambah per workspace.
- Pembuatan kode harus atomic untuk menghindari duplikat saat input Telegram dan web bersamaan.

CSV export columns:

- code
- date
- title
- type
- amount
- category
- account
- source
- note
- createdAt

### 4.5 Tambah/Edit Transaksi

Field:

- Tipe: masuk / keluar.
- Nominal.
- Judul.
- Tanggal.
- Kategori.
- Akun.
- Catatan.

Mode input dari tombol `Catat` atau `Tambah`:

- Pengeluaran.
- Pemasukan.
- Transfer antar akun.
- Hutang biasa.
- Piutang biasa.
- Hutang cicilan.
- Piutang cicilan.
- Bayar hutang atau cicilan.

Detail field dan rule per mode mengikuti `docs/FINANCE_INPUT_MODEL.md`.

Validasi:

- Nominal wajib > 0.
- Judul wajib.
- Tanggal wajib.
- Kategori harus sesuai tipe transaksi, kecuali kategori `both`.
- Akun wajib.

Setelah simpan:

- Update Firestore.
- Recompute summary di client dari data terbaru.
- Jika transaksi dibuat dari Telegram, tampilkan sumber Telegram di detail.

### 4.6 Budget

Fitur:

- Budget bulanan per kategori pengeluaran.
- Total budget.
- Terpakai.
- Sisa budget.
- Status kategori:
  - Aman jika pemakaian < 80%.
  - Waspada jika 80%-99%.
  - Lewat budget jika >= 100%.
- Progress bar per kategori.
- Edit budget kategori.

Data:

```ts
type Budget = {
  id: string;
  workspaceId: string;
  month: string;
  categoryId: string;
  amount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Logic:

- `spent = sum(expense by category in month)`
- `remaining = budget.amount - spent`
- `usedPercent = spent / budget.amount`

### 4.7 Laporan

Mengikuti referensi gambar 7.

Fitur:

- Arus harian per bulan:
  - Line chart masuk.
  - Line chart keluar.
- Pengeluaran per kategori.
- Pemasukan per kategori.
- Transaksi terbesar keluar.
- Transaksi terbesar masuk.
- Laporan mingguan dan bulanan.
- Export laporan sebagai CSV atau teks ringkasan.

Logic chart:

- Untuk setiap tanggal pada bulan aktif:
  - `Masuk = sum(income on date)`
  - `Keluar = sum(expense on date)`
- Sumbu Y memakai format compact:
  - `6jt`
  - `11jt`
  - `17jt`
  - `22jt`

### 4.8 Hutang dan Piutang

Mengikuti referensi gambar 3 dan 5.

Fitur:

- Halaman `Hutang`.
- Tambah hutang biasa.
- Tambah piutang biasa.
- Tambah hutang cicilan.
- Tambah piutang cicilan.
- Total hutang aktif.
- Total piutang aktif.
- Kewajiban 7 hari ke depan.
- Jumlah akun aktif.
- Kartu hutang:
  - Nama, contoh `Motor`.
  - Status `Hutang` atau `Piutang`.
  - Total hutang awal.
  - Sisa.
  - Cicilan per bulan.
  - Jumlah cicilan.
  - Denda terbayar.
  - Jatuh tempo berikutnya.
  - Progress pelunasan.
  - Tombol bayar.
  - Tombol edit.
  - Expand/collapse daftar cicilan.
  - Hapus catatan.
- Daftar cicilan:
  - Nomor cicilan.
  - Tanggal jatuh tempo.
  - Sisa.
  - Nominal cicilan.
  - Status `Lunas` atau `Belum`.

Data:

```ts
type DebtMode = "simple" | "installment";

type Debt = {
  id: string;
  workspaceId: string;
  name: string;
  type: "debt" | "receivable";
  mode: DebtMode;
  originalAmount: number;
  remainingAmount: number;
  monthlyAmount: number;
  finePaid: number;
  startDate: string;
  dueDay: number;
  status: "active" | "paid" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type DebtInstallment = {
  id: string;
  debtId: string;
  sequence: number;
  dueDate: string;
  amount: number;
  remainingAfterPayment: number;
  finePaid: number;
  paid: boolean;
  paidAt?: Timestamp;
};
```

Logic:

- `progress = (originalAmount - remainingAmount) / originalAmount`
- `nextDue = first unpaid installment sorted by dueDate`
- `dueIn7Days = unpaid installments where dueDate <= today + 7 days`
- Hutang biasa boleh tidak punya daftar cicilan.
- Hutang cicilan wajib punya jadwal cicilan.
- Piutang biasa berkurang saat pembayaran diterima.
- Piutang cicilan memakai jadwal seperti hutang cicilan, tetapi pembayaran membuat transaksi income.
- Saat bayar cicilan:
  - Tandai installment `paid`.
  - Kurangi `remainingAmount`.
  - Tambahkan `finePaid` jika ada.
  - Jika remaining <= 0, debt menjadi `paid`.
  - Opsional membuat transaksi expense/income otomatis.

### 4.9 Lainnya

Menu `Lainnya` memuat:

- Hutang/Piutang.
- Kategori.
- Akun.
- Telegram.
- Workspace settings.
- Export data.
- Logout.

### 4.10 Telegram Input

Telegram menggantikan WhatsApp pada referensi gambar 4.

Fitur:

- Halaman panduan koneksi Telegram.
- User menghubungkan Telegram chat ke workspace.
- Bot menerima command catat transaksi.
- Bot membalas ringkasan transaksi yang berhasil dibuat.
- Bot bisa mengirim laporan mingguan dan bulanan.
- Bot hanya menerima pesan dari chat yang sudah terhubung.

Contoh command transaksi:

```text
jajan 10rb
keluar jajan 16000 makanan
masuk transfer project 5jt
income refund kecil 40000
domain wafin.id 248.049 tagihan
bensin 42rb transport
```

Format yang didukung:

- Nominal:
  - `10000`
  - `10rb`
  - `10 ribu`
  - `1,5jt`
  - `1.500.000`
- Tipe:
  - Income: `masuk`, `income`, `terima`, `gaji`.
  - Expense: default jika tidak ada keyword income.
- Kategori otomatis:
  - Food: makan, jajan, kopi, minum, sarapan, siang, malam.
  - Utilities: listrik, domain, internet, tagihan, wifi, pulsa.
  - Transport: bensin, parkir, gojek, grab, transport.
  - Health: obat, dokter, gigi, suntik, sehat.
  - Income: pemasukan default.
  - Other: fallback.

Command laporan:

```text
minggu ini
bulan ini
laporan minggu ini
laporan juni 2026
ringkasan
```

Format balasan laporan mingguan:

```text
Laporan minggu ini
1 Jun - 6 Jun

Dari Senin sampai hari ini, begini kondisinya:

Uang masuk & keluar

Masuk    Rp 24.887.000
Keluar   Rp  1.586.549
-----------------------
Sisa     Rp 23.300.451

9 masuk - 27 keluar

Keluar per kategori

Kesehatan (38%)          Rp 596.000
Tagihan & Utilitas (22%) Rp 348.049
Makanan & Minuman (18%)  Rp 284.000
Hiburan (10%)            Rp 155.000
Lain-lain (6%)           Rp  91.500

... +2 kategori lain

Masuk per kategori

Transfer (100%) Rp 24.847.000
Income (0%)     Rp     40.000

Terbesar keluar

1. Suntik          Rp 265.000
2. Cabut gigi      Rp 250.000
3. domain wafin.id Rp 248.049
```

Telegram architecture:

1. User login di web.
2. User membuka halaman Telegram.
3. App membuat `linkToken` sementara.
4. User klik link `https://t.me/<bot>?start=<linkToken>`.
5. Bot menerima `/start`.
6. Cloud Function menautkan `chatId` ke workspace.
7. User bisa kirim command transaksi/laporan.
8. Cloud Function validasi chatId.
9. Function parsing command.
10. Function menulis transaksi ke Firestore.
11. Function balas konfirmasi.

Konfirmasi transaksi:

```text
Tercatat:
Keluar - jajan
Rp10.000
Kategori: Makanan & Minuman
Kode: TX-000042
```

Error handling:

- Jika nominal tidak ditemukan, bot minta format yang benar.
- Jika chat belum terhubung, bot minta login dari web dan hubungkan Telegram.
- Jika kategori tidak yakin, tetap catat ke `Lain-lain` dan sebutkan di balasan.
- Jika Firestore gagal, bot membalas bahwa transaksi belum tersimpan.

### 4.11 Kategori

Default kategori:

- Transfer
- Income
- Kesehatan
- Tagihan & Utilitas
- Makanan & Minuman
- Hiburan
- Transportasi
- Belanja
- Lain-lain
- Tabungan

Fitur:

- Tambah kategori.
- Edit nama, warna, ikon, tipe.
- Arsip kategori.
- Kategori yang sudah dipakai tidak boleh dihapus permanen.

### 4.12 Akun

Default akun:

- cash
- bank
- dana
- gopay
- ovo
- telegram

Fitur:

- Tambah akun.
- Edit akun.
- Arsip akun.
- Filter transaksi berdasarkan akun.

## 5. Struktur Data Firestore

Rekomendasi koleksi:

```text
users/{uid}
workspaces/{workspaceId}
workspaces/{workspaceId}/members/{uid}
workspaces/{workspaceId}/transactions/{transactionId}
workspaces/{workspaceId}/categories/{categoryId}
workspaces/{workspaceId}/accounts/{accountId}
workspaces/{workspaceId}/budgets/{budgetId}
workspaces/{workspaceId}/debts/{debtId}
workspaces/{workspaceId}/debts/{debtId}/installments/{installmentId}
workspaces/{workspaceId}/telegramLinks/{linkId}
workspaces/{workspaceId}/counters/transactions
```

Counter transaksi:

```ts
type TransactionCounter = {
  nextNumber: number;
  updatedAt: Timestamp;
};
```

Pembuatan transaksi harus memakai Firestore transaction:

1. Read counter.
2. Generate code `TX-000001`.
3. Create transaction.
4. Increment counter.

## 6. Security Rules Draft

Prinsip:

- User harus authenticated.
- User hanya bisa akses workspace jika ada dokumen member.
- Telegram write dilakukan oleh Cloud Functions Admin SDK, bukan langsung dari client.

Draft konseptual:

```text
allow read, write: if request.auth != null
  && exists(/databases/$(database)/documents/workspaces/$(workspaceId)/members/$(request.auth.uid));
```

Detail rules akan dibuat saat implementasi Firestore dimulai.

## 7. Environment Variables

Web:

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Cloud Functions:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
APP_BASE_URL=
```

## 8. Halaman dan Routing

Tanpa router eksternal pada fase awal, app bisa memakai state `AppView`.

Views:

- `home`
- `transactions`
- `budget`
- `reports`
- `more`
- `debts`
- `telegram`
- `settings`

Jika nanti memakai router:

```text
/login
/
/transactions
/budget
/reports
/more
/debts
/telegram
/settings
```

## 9. Komponen UI Utama

- `AppShell`
- `TopBar`
- `BottomNav`
- `SummaryHero`
- `TransactionList`
- `TransactionItem`
- `CategoryBreakdown`
- `DailyFlowChart`
- `BudgetList`
- `DebtSummaryCard`
- `DebtCard`
- `InstallmentList`
- `TransactionForm`
- `TelegramGuide`
- `UserMenu`

## 10. Perhitungan Finansial

Semua perhitungan harus berasal dari data transaksi, bukan angka hardcoded.

Summary bulanan:

```ts
incomeTotal = sum(income)
expenseTotal = sum(expense)
netTotal = incomeTotal - expenseTotal
transactionCount = transactions.length
incomeCount = count(income)
expenseCount = count(expense)
```

Kategori:

```ts
categoryAmount = sum(transactions by category and type)
categoryPercent = categoryAmount / totalByType
```

Budget:

```ts
spent = sum(expense by category)
remaining = budget - spent
usedPercent = spent / budget
```

Hutang:

```ts
paidAmount = originalAmount - remainingAmount
progress = paidAmount / originalAmount
activeDebtTotal = sum(remainingAmount where type == debt and active)
activeReceivableTotal = sum(remainingAmount where type == receivable and active)
dueSoon = unpaid installments due within 7 days
```

## 11. Offline dan Loading State

Fase awal:

- Loading skeleton untuk halaman utama.
- Empty state untuk transaksi, budget, hutang, dan laporan.
- Error state jika Firestore gagal.
- Mode demo jika Firebase env tidak tersedia.

Fase berikutnya:

- Firestore offline persistence.
- Queue input Telegram tidak perlu di client karena Telegram diproses server-side.

## 12. Testing Plan

Unit tests:

- Format rupiah.
- Parser command Telegram.
- Summary transaksi.
- Category breakdown.
- Budget status.
- Debt progress dan due soon.

Integration tests:

- Login demo/Firebase.
- Tambah transaksi.
- Edit transaksi.
- Hapus transaksi.
- Export CSV.
- Bayar cicilan.

Manual QA:

- Mobile 390px width.
- Desktop responsive.
- Long transaction title.
- Nominal besar.
- Empty data.
- Firebase env kosong.
- Telegram command invalid.

## 13. Roadmap Implementasi

### Fase 1 - Dokumen dan fondasi

- Buat dokumen product spec.
- Rapikan struktur komponen.
- Pastikan app bisa build.
- Buat data demo yang mereplikasi referensi.

### Fase 2 - UI web app

- Implement login screen.
- Implement app shell.
- Implement Beranda.
- Implement Transaksi.
- Implement Budget.
- Implement Laporan.
- Implement Hutang.
- Implement Lainnya.
- Implement Telegram guide.

### Fase 3 - State dan CRUD lokal

- Tambah/edit/hapus transaksi.
- CRUD budget.
- CRUD hutang dan bayar cicilan.
- Export CSV.
- Parser Telegram di client untuk preview.

### Fase 4 - Firebase

- Firebase Auth Google.
- Firestore data per user/workspace.
- Security rules.
- Atomic transaction counter.
- Migration dari demo state ke Firestore.

### Fase 5 - Telegram bot

- Cloud Functions webhook.
- Link Telegram chat ke workspace.
- Parse command.
- Simpan transaksi dari Telegram.
- Laporan mingguan/bulanan via bot.

### Fase 6 - Polish dan deploy

- Responsive QA.
- Accessibility.
- Error handling.
- Deploy hosting.
- Setup webhook Telegram production.

## 14. Definition of Done MVP

MVP dianggap selesai jika:

- User bisa login dengan Google.
- User punya workspace.
- User bisa melihat Beranda seperti referensi.
- User bisa menambah, edit, hapus transaksi.
- User bisa melihat ringkasan transaksi dan laporan.
- User bisa membuat budget per kategori.
- User bisa mencatat dan membayar hutang/cicilan.
- User bisa menghubungkan Telegram.
- User bisa mencatat transaksi dari Telegram.
- Data tersimpan di Firestore dan aman per user.
- App bisa build tanpa error.
