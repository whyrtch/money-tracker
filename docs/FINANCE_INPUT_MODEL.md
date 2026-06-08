# Money Tracker - Finance Input Model

Status: Draft awal
Tanggal: 2026-06-08

Dokumen ini memperjelas jenis input keuangan yang harus didukung. Tujuannya agar app tidak hanya mencatat pemasukan dan pengeluaran biasa, tetapi juga bisa menangani hutang biasa, hutang cicilan, piutang, pembayaran cicilan, denda, transfer antar akun, dan input cepat dari Telegram.

## 1. Temuan Dari Referensi Gambar

### Beranda

Gambar Beranda menunjukkan:

- Ringkasan surplus bulan aktif.
- Total uang masuk.
- Total uang keluar.
- Jumlah transaksi bulan ini.
- Transaksi terbaru.
- Pengeluaran per kategori.
- Shortcut catat, budget, laporan.
- Banner input lewat chat yang akan diganti menjadi Telegram.

Implikasi logic:

- Semua transaksi harus punya tipe masuk atau keluar.
- Transaksi harus punya kategori, akun, tanggal, nominal, dan kode transaksi.
- Kategori pengeluaran perlu diringkas berdasarkan persentase.
- Summary bulanan harus realtime dari transaksi.

### Transaksi

Gambar Transaksi menunjukkan:

- Total entri.
- Export CSV.
- Tambah transaksi manual.
- Ringkasan masuk, keluar, dan netto.
- Filter bulan.

Implikasi logic:

- Input transaksi manual harus lengkap.
- Export harus membawa semua field penting.
- Pemasukan dan pengeluaran harus bisa dibandingkan dengan periode sebelumnya.

### Laporan

Gambar Laporan menunjukkan:

- Chart arus harian masuk vs keluar.
- Pengeluaran per kategori.

Implikasi logic:

- App perlu agregasi harian.
- App perlu agregasi kategori.
- Tipe transaksi harus konsisten agar chart benar.

### Hutang

Gambar Hutang menunjukkan:

- Total hutang aktif.
- Hutang bisa berupa akun seperti `Motor`.
- Ada total hutang awal, sisa hutang, cicilan per bulan, jumlah cicilan, denda terbayar, jatuh tempo berikutnya, progress pelunasan.
- Ada tombol bayar, edit, hapus.
- Ada daftar cicilan dengan status `Lunas` atau `Belum`.

Implikasi logic:

- Hutang tidak cukup dicatat sebagai expense biasa.
- Hutang perlu entity sendiri.
- Cicilan perlu jadwal sendiri.
- Pembayaran cicilan harus bisa membuat transaksi pengeluaran otomatis.
- Denda harus dicatat terpisah dari pokok cicilan.

### Telegram

Gambar chat menunjukkan:

- User meminta laporan mingguan.
- Bot membalas ringkasan masuk, keluar, sisa, jumlah transaksi, kategori keluar, kategori masuk, dan transaksi terbesar.

Implikasi logic:

- Telegram tidak hanya untuk input transaksi, tetapi juga query laporan.
- Bot harus bisa membaca periode: minggu ini, bulan ini, tanggal tertentu.
- Format laporan harus ringkas dan mudah dibaca di chat.

## 2. Jenis Input Yang Wajib Didukung

### 2.1 Pemasukan

Contoh:

```text
masuk transfer project 5jt
gaji 8500000
terima refund kecil 40000
income komisi 750rb
```

Field:

- Tanggal.
- Judul.
- Nominal.
- Kategori pemasukan.
- Akun tujuan.
- Catatan.
- Source: web atau telegram.

Efek:

- Menambah total masuk.
- Menambah saldo akun tujuan jika saldo akun diaktifkan.
- Masuk ke laporan pemasukan dan netto.

### 2.2 Pengeluaran

Contoh:

```text
jajan 10rb
keluar cabut gigi 250000 kesehatan
domain wafin.id 248.049 tagihan
bensin 42rb transport
```

Field:

- Tanggal.
- Judul.
- Nominal.
- Kategori pengeluaran.
- Akun sumber.
- Catatan.
- Source.

Efek:

- Menambah total keluar.
- Mengurangi saldo akun sumber jika saldo akun diaktifkan.
- Mengurangi sisa budget kategori.
- Masuk ke laporan pengeluaran.

### 2.3 Transfer Antar Akun

Contoh:

```text
transfer dana ke bank 500rb
pindah cash ke dana 100000
```

Field:

- Tanggal.
- Judul.
- Nominal.
- Akun sumber.
- Akun tujuan.
- Biaya admin opsional.
- Catatan.

Efek:

- Tidak dihitung sebagai income.
- Tidak dihitung sebagai expense, kecuali biaya admin.
- Mengurangi saldo akun sumber.
- Menambah saldo akun tujuan.
- Jika ada biaya admin, buat transaksi expense kategori `Tagihan & Utilitas` atau `Lain-lain`.

Catatan:

- Pada MVP, transfer bisa disimpan sebagai tipe khusus `transfer`.
- Jika app belum memakai saldo akun, transfer tetap dicatat untuk histori tetapi tidak mempengaruhi laporan income/expense.

### 2.4 Hutang Biasa

Hutang biasa adalah hutang tanpa jadwal cicilan tetap.

Contoh:

```text
tambah hutang ke budi 500rb
hutang warung 75000 jatuh tempo 15 juni
```

Field:

- Nama pihak atau nama hutang.
- Tipe: hutang.
- Nominal awal.
- Sisa.
- Tanggal mulai.
- Tanggal jatuh tempo opsional.
- Catatan.
- Status: aktif, lunas, arsip.

Efek:

- Menambah total hutang aktif.
- Tidak otomatis menjadi expense saat dibuat, kecuali user memilih "catat uang diterima/dipakai".
- Saat bayar hutang, baru bisa membuat transaksi expense.

Pembayaran:

```text
bayar hutang budi 100rb
```

Efek pembayaran:

- Mengurangi sisa hutang.
- Membuat transaksi expense dengan kategori `Pembayaran Hutang` atau `Lain-lain`.
- Jika sisa menjadi 0, status menjadi lunas.

### 2.5 Piutang Biasa

Piutang adalah uang yang orang lain pinjam dari user.

Contoh:

```text
tambah piutang andi 300rb
andi bayar piutang 100rb
```

Field:

- Nama pihak.
- Tipe: piutang.
- Nominal awal.
- Sisa.
- Tanggal mulai.
- Tanggal jatuh tempo opsional.
- Catatan.
- Status.

Efek:

- Menambah total piutang aktif.
- Saat piutang dibayar, bisa membuat transaksi income.
- Jika sisa menjadi 0, status menjadi lunas.

### 2.6 Hutang Cicilan

Hutang cicilan adalah hutang dengan jadwal pembayaran berulang, seperti motor pada gambar.

Contoh web input:

- Nama: Motor.
- Total hutang: Rp3.079.700.
- Cicilan per bulan: Rp133.900.
- Jumlah cicilan: 14.
- Tanggal mulai: 12 Mei 2026.
- Tanggal jatuh tempo tiap bulan: 12.
- Denda awal terbayar: Rp111.000.

Contoh Telegram:

```text
tambah cicilan motor total 3079700 cicilan 133900 14x mulai 12 mei 2026
cicilan motor 133900 x14 jatuh tempo tanggal 12
```

Field debt:

- Nama.
- Tipe: hutang.
- Mode: installment.
- Total awal.
- Sisa.
- Nominal cicilan.
- Jumlah cicilan.
- Tanggal mulai.
- Hari jatuh tempo.
- Denda terbayar total.
- Status.

Field installment:

- Nomor cicilan.
- Tanggal jatuh tempo.
- Nominal pokok/cicilan.
- Denda.
- Status lunas/belum.
- Tanggal bayar.
- Sisa setelah pembayaran.

Efek saat dibuat:

- Membuat entity hutang.
- Generate jadwal cicilan.
- Tidak otomatis membuat transaksi expense.

Efek saat bayar cicilan:

- Tandai cicilan lunas.
- Kurangi sisa hutang.
- Tambahkan denda jika ada.
- Opsional membuat transaksi expense:
  - Pokok cicilan kategori `Pembayaran Hutang`.
  - Denda kategori `Denda`.
- Update progress pelunasan.
- Jika semua cicilan lunas atau sisa 0, status hutang menjadi lunas.

### 2.7 Piutang Cicilan

Piutang cicilan adalah orang lain membayar balik ke user secara berkala.

Contoh:

```text
tambah piutang cicilan andi total 1200000 cicilan 200rb 6x
andi bayar cicilan 200rb
```

Efek:

- Jadwal cicilan dibuat seperti hutang cicilan.
- Pembayaran cicilan membuat transaksi income.
- Sisa piutang berkurang.

### 2.8 Denda dan Biaya Tambahan

Denda bisa muncul pada hutang atau cicilan.

Contoh:

```text
bayar cicilan motor 133900 denda 10000
denda motor 111000
```

Aturan:

- Denda tidak mengurangi pokok hutang kecuali user memilih begitu.
- Denda masuk ke `finePaid`.
- Jika dicatat sebagai transaksi, tipe default adalah expense.
- Denda harus muncul di kartu hutang seperti referensi `Denda terbayar Rp111.000`.

### 2.9 Recurring Bill dan Kewajiban Rutin

Contoh:

```text
tagihan internet 300rb tiap bulan tanggal 5
langganan app 99000 bulanan
```

Fase MVP:

- Bisa dicatat sebagai transaksi manual.

Fase berikutnya:

- Buat template recurring.
- Reminder sebelum jatuh tempo.
- Generate transaksi saat dikonfirmasi user.

## 3. Tipe Transaksi Internal

Untuk menghindari logic campur, tipe internal direkomendasikan:

```ts
type MoneyMovementType =
  | "income"
  | "expense"
  | "transfer"
  | "debt_principal_received"
  | "debt_payment"
  | "receivable_created"
  | "receivable_payment"
  | "installment_payment"
  | "fine_payment";
```

Untuk UI sederhana, user tetap melihat:

- Masuk.
- Keluar.
- Transfer.
- Hutang.
- Piutang.
- Cicilan.

## 4. Form Input Web

Tombol `Tambah` atau `Catat` membuka form dengan mode:

- Pengeluaran.
- Pemasukan.
- Transfer.
- Hutang biasa.
- Piutang biasa.
- Hutang cicilan.
- Piutang cicilan.
- Bayar hutang/cicilan.

### Field Per Mode

Pengeluaran:

- Nominal, judul, tanggal, kategori, akun, catatan.

Pemasukan:

- Nominal, judul, tanggal, kategori, akun, catatan.

Transfer:

- Nominal, dari akun, ke akun, tanggal, biaya admin, catatan.

Hutang biasa:

- Nama, nominal, tanggal mulai, jatuh tempo opsional, catatan.

Piutang biasa:

- Nama, nominal, tanggal mulai, jatuh tempo opsional, catatan.

Hutang cicilan:

- Nama, total, cicilan per periode, jumlah cicilan, tanggal mulai, tanggal jatuh tempo, denda awal opsional, catatan.

Piutang cicilan:

- Nama, total, cicilan per periode, jumlah cicilan, tanggal mulai, tanggal jatuh tempo, catatan.

Bayar hutang/cicilan:

- Pilih hutang/piutang.
- Pilih cicilan jika ada.
- Nominal bayar.
- Denda opsional.
- Tanggal bayar.
- Akun.
- Toggle buat transaksi otomatis.

## 5. Parser Telegram

Parser perlu mendeteksi intent sebelum membuat transaksi.

Urutan intent:

1. Laporan: `minggu ini`, `bulan ini`, `laporan`.
2. Tambah hutang/piutang.
3. Bayar hutang/cicilan/piutang.
4. Transfer antar akun.
5. Pemasukan.
6. Pengeluaran default.

Contoh intent:

```ts
type TelegramIntent =
  | { kind: "report"; period: "this_week" | "this_month" | "custom" }
  | { kind: "create_transaction"; type: "income" | "expense" }
  | { kind: "create_transfer" }
  | { kind: "create_debt"; debtType: "debt" | "receivable"; mode: "simple" | "installment" }
  | { kind: "pay_debt"; debtType: "debt" | "receivable"; mode?: "simple" | "installment" };
```

## 6. Kategori Tambahan Yang Dibutuhkan

Kategori dari seed awal sudah bagus, tetapi untuk logic hutang perlu tambahan:

- Pembayaran Hutang.
- Pembayaran Cicilan.
- Penerimaan Piutang.
- Denda.
- Biaya Admin.
- Subscriptions atau Langganan.

Kategori ini bisa default hidden sampai fitur terkait dipakai.

## 7. Rule Finansial Penting

- Membuat hutang tidak selalu sama dengan pengeluaran.
- Membayar hutang adalah pengeluaran kas.
- Membuat piutang tidak selalu sama dengan pengeluaran, kecuali uang benar-benar keluar saat memberi pinjaman.
- Menerima pembayaran piutang adalah pemasukan kas.
- Transfer antar akun tidak mempengaruhi surplus/netto.
- Denda adalah biaya tambahan dan harus dipisahkan dari pokok.
- Cicilan harus punya jadwal agar bisa menampilkan jatuh tempo berikutnya.
- Laporan bulanan hanya menghitung transaksi kas, bukan total hutang yang belum dibayar.
- Kartu hutang menghitung outstanding balance dari debt entity, bukan dari laporan bulanan.

## 8. Prioritas MVP

Wajib:

- Input pemasukan.
- Input pengeluaran.
- Input hutang biasa.
- Input piutang biasa.
- Input hutang cicilan.
- Bayar hutang/cicilan.
- Denda pada cicilan.
- Laporan dari transaksi kas.
- Telegram untuk pemasukan, pengeluaran, laporan, dan bayar cicilan sederhana.

Setelah MVP:

- Piutang cicilan.
- Transfer antar akun dengan saldo.
- Recurring bill.
- Reminder Telegram untuk jatuh tempo.
- Debt payoff strategy.

