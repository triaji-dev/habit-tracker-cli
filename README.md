# Habit Tracker CLI - Documentation

## Tentang Aplikasi

**Habit Tracker CLI** adalah aplikasi terminal untuk melacak kebiasaan harian dengan sistem multi-profil, pengingat otomatis, dan statistik lengkap.

**Pembuat:** Tri Aji Prabandaru  
**Kelas:** BATCH 3 - REP, WPH-REP-109  
**Tanggal:** 9 November 2025

---

## Cara Menjalankan

```bash
# Install dependencies (jika diperlukan)
npm install

# Jalankan aplikasi
node index.js
```

---

## Fitur Utama

### 1. **Multi-Profil**
- Kelola beberapa profil pengguna
- Setiap profil memiliki kebiasaan terpisah
- Ganti profil dengan mudah

### 2. **Manajemen Kebiasaan**
- Tambah, edit, dan hapus kebiasaan
- Kategori: Kesehatan, Produktivitas, Hobi, atau Custom
- Target frekuensi per minggu (1-7 hari)

### 3. **Tracking & Progress**
- Progress bar visual untuk setiap kebiasaan
- Streak counter (hari berturut-turut)
- Riwayat 7 hari terakhir
- Statistik lengkap

### 4. **Pengingat Otomatis**
- Notifikasi setiap 10 detik
- Countdown visual
- Dapat diaktifkan/dinonaktifkan

### 5. **Ekspor Data**
- Ekspor ke file `habits-export.txt`
- Data disimpan otomatis di `habits-data.json`

---

## 📋 Menu Aplikasi

### **Menu Utama**
```
1. Kelola Profil
2. Kelola Kebiasaan
3. Lihat Semua Kebiasaan
4. Tambah Kebiasaan Baru
5. Tandai Kebiasaan Selesai
6. Demo Loop
7. Ekspor Data
8. Generate Demo Kebiasaan
9. Reminder (AKTIF/NONAKTIF)
0. Keluar
```

### **Kelola Profil**
- Lihat profil saya
- Ganti profil
- Buat profil baru
- Hapus profil

### **Kelola Kebiasaan**
- Tampilan (semua/kategori/aktif/selesai)
- Analisis (statistik/riwayat)
- Aksi (tambah/tandai selesai/edit/hapus)

---

## Struktur Kode

### **Class Utama**

#### `UserProfile`
- `name`: Nama pengguna
- `joinDate`: Tanggal bergabung
- `currentStreak`: Streak saat ini
- `longestStreak`: Streak terpanjang

#### `Habit`
- `name`: Nama kebiasaan
- `targetFrequency`: Target per minggu
- `category`: Kategori kebiasaan
- `completions`: Array tanggal penyelesaian
- `getCurrentStreak()`: Hitung streak
- `getProgressPercentage()`: Hitung progress
- `getProgressBar()`: Tampilkan progress bar

#### `HabitTracker`
- `profiles`: Array profil pengguna
- `currentProfile`: Profil aktif
- `habits`: Array kebiasaan
- `addHabit()`: Tambah kebiasaan
- `completeHabit()`: Tandai selesai
- `startReminder()`: Aktifkan pengingat
- `exportData()`: Ekspor data

### **Utility Objects**

#### `UI`
- `header()`: Tampilkan header
- `success()`: Pesan sukses
- `error()`: Pesan error
- `info()`: Pesan info

#### `DateUtils`
- `today()`: Tanggal hari ini
- `weekStart()`: Awal minggu
- `isSameDay()`: Bandingkan tanggal
- `getDaysDiff()`: Selisih hari

#### `FileManager`
- `read()`: Baca file JSON
- `write()`: Tulis file JSON

---

## Penyimpanan Data

Data disimpan di `habits-data.json` dengan struktur:

```json
{
  "profiles": [
    {
      "id": 123456789,
      "name": "User",
      "joinDate": "2025-11-09",
      "currentStreak": 5,
      "longestStreak": 10
    }
  ],
  "currentProfileId": 123456789,
  "profileHabits": {
    "123456789": [
      {
        "id": 987654321,
        "name": "Olahraga",
        "targetFrequency": 5,
        "category": "Kesehatan",
        "completions": ["2025-11-09"],
        "createdAt": "2025-11-01"
      }
    ]
  }
}
```

---

## Tips Penggunaan

1. **Mulai dengan demo**: Gunakan menu "Generate Demo Kebiasaan" untuk mencoba fitur
2. **Set target realistis**: Mulai dengan target 3-5x per minggu
3. **Aktifkan reminder**: Gunakan fitur pengingat agar tidak lupa
4. **Cek statistik**: Pantau progress mingguan untuk motivasi
5. **Ekspor data**: Backup data secara berkala

---

## Troubleshooting

**Q: Data hilang setelah restart?**  
A: Pastikan file `habits-data.json` tidak dihapus

**Q: Reminder tidak muncul?**  
A: Tekan menu 9 untuk mengaktifkan reminder

**Q: Tidak bisa tambah kebiasaan?**  
A: Pastikan sudah ada profil aktif

---

## 📝 Lisensi

Aplikasi ini dibuat untuk tujuan pembelajaran.

---
