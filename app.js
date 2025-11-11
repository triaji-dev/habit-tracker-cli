// ╔════════════════════════════════════════════╗
// ║ HABIT TRACKER CLI - OPTIMIZED VERSION      ║
// ╠════════════════════════════════════════════╣
// ║ NAMA: Tri Aji Prabandaru                   ║
// ║ KELAS: BATCH 3 - REP, WPH-REP-109          ║
// ║ TANGGAL: 9 November 2025                   ║
// ╚════════════════════════════════════════════╝

// IMPORT MODULES

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ╔════════════════════════════════════════════╗
// ║           CONSTANTS & CONFIGURATION        ║
// ╚════════════════════════════════════════════╝

const DATA_FILE = path.join(__dirname, 'habits-data.json');
const REMINDER_INTERVAL = 10000;
const DAYS_IN_WEEK = 7;
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    darkgray: '\x1b[90m'
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ╔════════════════════════════════════════════╗
// ║               UTILITY OBJECTS              ║
// ╚════════════════════════════════════════════╝

// Objects: 
//    - UI           --->  Untuk tampilan antarmuka pengguna
//    - DateUtils    --->  Untuk operasi tanggal
//    - FileManager  --->  Untuk operasi file

const UI = {
    header: (title) => {
        console.log('\n' + '═'.repeat(60));
        console.log(colors.cyan + title + colors.reset);
        console.log('═'.repeat(60));
    },
    separator: () => console.log('─'.repeat(60)),
    success: (msg) => console.log(`\n${colors.green}[OK] ${msg}${colors.reset}`),
    error: (msg) => console.log(`\n${colors.red}[X] ${msg}${colors.reset}`),
    info: (msg) => console.log(`\n${colors.red}[!] ${msg}${colors.reset}`)
};

const DateUtils = {
    today: () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    },
    weekStart: () => {
        const today = DateUtils.today();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return weekStart;
    },
    isSameDay: (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        return d1.getTime() === d2.getTime();
    },
    getDaysDiff: (date1, date2) => {
        const diffTime = Math.abs(new Date(date2) - new Date(date1));
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
};

const FileManager = {
    read: () => {
        try {
            if (!fs.existsSync(DATA_FILE)) return null;
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } catch (error) {
            console.error('[X] Error reading file:', error.message);
            return null;
        }
    },
    write: (data) => {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('[X] Error writing file:', error.message);
            return false;
        }
    }
};

// ╔════════════════════════════════════════════╗
// ║              QUESTION FUNCTIONS            ║
// ╚════════════════════════════════════════════╝

// Functions: 
//   - askQuestion  --->  Untuk menanyakan input pengguna
//   - askCategor   --->  Untuk menanyakan kategori habit


// Flow: Pause Reminder -> Ask Question -> Resume Reminder -> Reset Reminder -> Return Answer
// @param {string} question - Pertanyaan yang diajukan
// @param {HabitTracker|null} tracker - Instance HabitTracker untuk mengelola pengingat
// @param {boolean} skipPause - Apakah melewati jeda pengingat
// @return {Promise<string>} Jawaban pengguna
function askQuestion(question, tracker = null, skipPause = false) {
    return new Promise((resolve) => {
        if (tracker && !skipPause) tracker.pauseReminder?.();
        
        rl.question(question, (answer) => {
            if (tracker && !skipPause) tracker.resumeReminder?.();
            tracker?.resetReminder?.();
            resolve(answer.trim());
        });
    });
}

// Flow: Display Category Options -> Ask for Choice -> Map Choice to Category -> Return Category
// @param {HabitTracker|null} tracker - Instance HabitTracker untuk mengelola pengingat
// @return {Promise<string>} Kategori yang dipilih
async function askCategory(tracker) {
    const categoryMap = {
        'K': 'Kesehatan', 'k': 'Kesehatan',
        'P': 'Produktivitas', 'p': 'Produktivitas',
        'H': 'Hobi', 'h': 'Hobi',
        'U': 'Umum', 'u': 'Umum'
    };
    
    console.log('\nKategori: K-Kesehatan | P-Produktivitas | H-Hobi | U-Umum | L-Custom');
    const choice = await askQuestion('Pilihan (K/P/H/U/L): ', tracker);
    
    if (choice.toUpperCase() === 'L') {
        return (await askQuestion('Nama kategori: ', tracker)) || 'Umum';
    }
    return categoryMap[choice] || 'Umum';
}

// ╔════════════════════════════════════════════╗
// ║              CLASS : USER PROFILE          ║
// ╚════════════════════════════════════════════╝

// Properties [5]: 
//   - id                   --->  ID unik profil
//   - name                 --->  Nama pengguna
//   - joinDate             --->  Tanggal bergabung
//   - currentStreak        --->  Streak saat ini
//   - longestStreak        --->  Streak terpanjang

// Methods [3]: 
//   - updateStats          --->  Memperbarui statistik profil
//   - getDaysJoined        --->  Mendapatkan jumlah hari sejak bergabung
//   - getCompletedThisWeek --->  Mendapatkan jumlah kebiasaan yang diselesaikan minggu ini

class UserProfile {
    constructor(name, id = null) {
        this.id = id || Date.now() + Math.random();
        this.name = name;
        this.joinDate = new Date();
        this.currentStreak = 0;
        this.longestStreak = 0;
    }
    
    // @param {Array<Habit>} habits - Daftar kebiasaan pengguna
    // @return {void}
    updateStats(habits) {
        const maxStreak = Math.max(0, ...habits.map(h => h.getCurrentStreak()));
        this.currentStreak = maxStreak;
        if (maxStreak > this.longestStreak) this.longestStreak = maxStreak;
    }
    
    // @return {number} Jumlah hari sejak bergabung
    getDaysJoined() {
        return DateUtils.getDaysDiff(this.joinDate, new Date());
    }
    
    // @param {Array<Habit>} habits - Daftar kebiasaan pengguna
    // @return {number} Jumlah kebiasaan yang diselesaikan minggu ini
    getCompletedThisWeek(habits) {
        return habits.filter(h => h.isCompletedThisWeek()).length;
    }
}

// ╔════════════════════════════════════════════╗
// ║                CLASS : HABIT               ║
// ╚════════════════════════════════════════════╝

// Properties [6]: 
//   - id                         --->  ID unik kebiasaan
//   - name                       --->  Nama kebiasaan
//   - targetFrequency            --->  Frekuensi target per minggu
//   - category                   --->  Kategori kebiasaan
//   - completions                --->  Daftar tanggal penyelesaian
//   - createdAt                  --->  Tanggal pembuatan

// Methods [8]: 
//   - markComplete               --->  Menandai kebiasaan sebagai selesai hari ini
//   - getThisWeekCompletions     --->  Mendapatkan jumlah penyelesaian minggu ini
//   - isCompletedThisWeek        --->  Memeriksa apakah target minggu ini tercapai
//   - isCompletedToday           --->  Memeriksa apakah selesai hari ini
//   - getProgressPercentage      --->  Mendapatkan persentase kemajuan minggu ini
//   - getProgressBar             --->  Mendapatkan tampilan progress bar
//   - getCurrentStreak           --->  Mendapatkan streak saat ini
//   - getStatusIcon              --->  Mendapatkan ikon status

class Habit {
    constructor(name, targetFrequency, category = 'Umum') {
        this.id = Date.now() + Math.random();
        this.name = name;
        this.targetFrequency = targetFrequency;
        this.completions = [];
        this.createdAt = new Date();
        this.category = category;
    }
    
    // Flow: Check Today Completion -> Add Today Date -> Return Success Status
    // @param {Array<Habit>} habits - Daftar kebiasaan pengguna
    // @return {void}
    markComplete() {
        const today = DateUtils.today();
        const alreadyCompleted = this.completions.some(date => 
            DateUtils.isSameDay(date, today)
        );
        
        if (alreadyCompleted) return false;
        
        this.completions.push(today.toISOString());
        return true;
    }
    
    // @return {number} Jumlah penyelesaian minggu ini
        getThisWeekCompletions() {
        const weekStart = DateUtils.weekStart();
        return this.completions.filter(date => new Date(date) >= weekStart).length;
    }
    
    // @return {boolean} Apakah target minggu ini tercapai
    isCompletedThisWeek() {
        return this.getThisWeekCompletions() >= this.targetFrequency;
    }
    
    // @return {boolean} Apakah selesai hari ini
    isCompletedToday() {
        const today = DateUtils.today();
        return this.completions.some(date => DateUtils.isSameDay(date, today));
    }
    
    // @return {number} Persentase kemajuan minggu ini
    getProgressPercentage() {
        return Math.min((this.getThisWeekCompletions() / this.targetFrequency) * 100, 100);
    }
    
    // Flow: Calculate Filled Segments -> Build Bar String -> Return Bar with Percentage
    // @return {string} Tampilan progress bar
    getProgressBar() {
        const percentage = this.getProgressPercentage();
        const filled = Math.floor(percentage / 3.33);
        const bar = '█'.repeat(filled) + '▒'.repeat(30 - filled);
        return `${bar} ${percentage.toFixed(0)}%`;
    }
    
    // Flow: Sort Completions -> Count Consecutive Days from Today -> Return Streak
    // @return {number} Streak saat ini
    getCurrentStreak() {
        if (this.completions.length === 0) return 0;
        
        const sorted = this.completions.map(d => new Date(d)).sort((a, b) => b - a);
        const today = DateUtils.today();
        let streak = 0;
        
        for (const completion of sorted) {
            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - streak);
            expectedDate.setHours(0, 0, 0, 0);
            
            if (DateUtils.isSameDay(completion, expectedDate)) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }
    
    // @return {string} Ikon status kebiasaan
    getStatusIcon() {
        if (this.isCompletedThisWeek()) return '[X]';
        if (this.isCompletedToday()) return '[~]';
        return '[ ]';
    }
}

// ╔════════════════════════════════════════════╗
// ║             CLASS : HABIT TRACKER          ║
// ╚════════════════════════════════════════════╝

// Properties [9]: 
//   - profiles                 --->  Daftar profil pengguna
//   - currentProfile           --->  Profil pengguna saat ini
//   - habits                   --->  Daftar kebiasaan
//   - reminderTimer            --->  Timer pengingat
//   - reminderEnabled          --->  Status pengingat aktif
//   - reminderDotTimer         --->  Timer titik pengingat
//   - reminderDots             --->  Jumlah titik pengingat
//   - reminderCount            --->  Hitungan pengingat
//   - reminderShown            --->  Status pengingat ditampilkan

// ██ Habit Tracker Class
class HabitTracker {
    constructor() {
        this.profiles = [];
        this.currentProfile = null;
        this.habits = [];
        this.reminderTimer = null;
        this.reminderEnabled = false;
        this.reminderDotTimer = null;
        this.reminderDots = 0;
        this.reminderCount = 0;
        this.reminderShown = false;
        this.loadFromFile();
    }
    
    // ██ HABIT MANAGEMENT 
    // ═══════════════════════════════════════════════════════════════
    // Methods [4]: 
    //   - addHabit            --->  Menambahkan kebiasaan baru
    //   - editHabit           --->  Mengedit kebiasaan yang ada
    //   - completeHabit       --->  Menandai kebiasaan sebagai selesai
    //   - deleteHabit         --->  Menghapus kebiasaan
    
    // Flow: Create Habit -> Add to Array -> Save to File -> Return Habit
    // @param {string} name - Nama kebiasaan
    // @param {number} frequency - Frekuensi target kebiasaan
    // @param {string} category - Kategori kebiasaan
    // @return {Habit} Kebiasaan yang ditambahkan
    addHabit(name, frequency, category = 'Umum') {
        const habit = new Habit(name, frequency, category);
        this.habits.push(habit);
        this.saveToFile();
        return habit;
    }
    
    // Flow: Find Habit -> Update Properties -> Save to File -> Show Success Message
    // @param {number} index - Indeks kebiasaan
    // @param {string} newName - Nama baru kebiasaan
    // @param {number} newFrequency - Frekuensi baru kebiasaan
    // @param {string} newCategory - Kategori baru kebiasaan
    editHabit(index, newName, newFrequency, newCategory) {
        const habit = this.habits[index - 1];
        if (!habit) return UI.error('Kebiasaan tidak ditemukan.');
        
        if (newName) habit.name = newName;
        if (newFrequency) habit.targetFrequency = newFrequency;
        if (newCategory) habit.category = newCategory;
        
        this.saveToFile();
        UI.success(`Kebiasaan "${habit.name}" berhasil diperbarui.`);
    }
    
    // Flow: Find Habit -> Mark as Complete -> Save to File -> Show Success Message
    // @param {number} index - Indeks kebiasaan
    // @return {void}
    completeHabit(index) {
        const habit = this.habits[index - 1];
        if (!habit) return UI.error('Kebiasaan tidak ditemukan.');
        
        if (habit.markComplete()) {
            this.saveToFile();
            UI.success(`"${habit.name}" berhasil diselesaikan!`);
        } else {
            UI.info(`"${habit.name}" sudah diselesaikan hari ini.`);
        }
    }
    
    // Flow: Find Habit -> Remove from Array -> Save to File -> Show Success Message
    // @param {number} index - Indeks kebiasaan
    // @return {void}
    deleteHabit(index) {
        const habit = this.habits[index - 1];
        if (!habit) return UI.error('Kebiasaan tidak ditemukan.');
        
        const name = habit.name;
        this.habits.splice(index - 1, 1);
        this.saveToFile();
        UI.success(`Kebiasaan "${name}" berhasil dihapus.`);
    }
    
    // ██ PROFILE MANAGEMENT 
    // ═══════════════════════════════════════════════════════════════
    // Methods [7]: 
    //   - createNewProfile         --->  Membuat profil baru
    //   - selectProfile            --->  Memilih profil pengguna
    //   - deleteProfile            --->  Menghapus profil pengguna
    //   - switchProfile            --->  Berpindah profil pengguna
    //   - loadHabitsForProfile     --->  Memuat kebiasaan untuk profil tertentu
    //   - saveCurrentProfileHabits --->  Menyimpan kebiasaan profil saat ini
    //   - getProfileHabitsCount    --->  Mendapatkan jumlah kebiasaan untuk profil tertentu

    // Flow: Question -> Create Profile -> Save Profile -> Switch Profile
    // @return {Promise<void>}
    async createNewProfile() {
        UI.header('BUAT PROFIL BARU');
        const name = await askQuestion('Nama profil: ', this);
        
        if (!name) return UI.error('Nama tidak boleh kosong.');
        
        if (this.currentProfile) this.saveCurrentProfileHabits();
        
        const newProfile = new UserProfile(name);
        this.profiles.push(newProfile);
        this.currentProfile = newProfile;
        this.habits = [];
        this.saveToFile();
        
        UI.success(`Profil "${name}" berhasil dibuat dan diaktifkan!`);
    }
    
    // Flow: Display Profiles -> Select Profile -> Switch Profile
    // @return {Promise<void>}
    async selectProfile() {
        this.displayProfiles();
        if (this.profiles.length === 0) return UI.info('Tidak ada profil tersedia.');
        
        const choice = await askQuestion(`Pilih nomor (1-${this.profiles.length}, 0=batal): `, this);
        if (choice === '0') return UI.info('Dibatalkan.');
        
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < this.profiles.length) {
            this.switchProfile(this.profiles[index].id);
            UI.success(`Profil "${this.profiles[index].name}" dipilih.`);
            console.log(`[INFO] ${this.habits.length} kebiasaan dimuat.`);
        } else {
            UI.error('Nomor tidak valid.');
        }
    }
    
    // Flow: Display Profiles -> Select Profile to Delete -> Confirm Deletion -> Delete Profile
    // @return {Promise<void>}
    async deleteProfile() {
        this.displayProfiles();
        if (this.profiles.length === 0) return UI.info('Tidak ada profil.');
        if (this.profiles.length === 1) return UI.info('Tidak dapat menghapus profil terakhir.');
        
        const choice = await askQuestion(`Pilih nomor untuk dihapus (1-${this.profiles.length}, 0=batal): `, this);
        if (choice === '0' || choice === '') return UI.info('Dibatalkan.');
        
        const index = parseInt(choice) - 1;
        if (index < 0 || index >= this.profiles.length) return UI.error('Nomor tidak valid.');
        
        const profile = this.profiles[index];
        const confirm = await askQuestion(`Yakin hapus "${profile.name}"? (y/n): `, this);
        
        if (confirm.toLowerCase() === 'y') {
            const deletedId = profile.id;
            this.profiles.splice(index, 1);
            
            if (this.currentProfile?.id === deletedId) {
                this.currentProfile = this.profiles[0] || null;
                if (this.currentProfile) this.loadHabitsForProfile(this.currentProfile.id);
                else this.habits = [];
            }
            
            const data = FileManager.read() || {};
            if (data.profileHabits?.[deletedId]) delete data.profileHabits[deletedId];
            data.profiles = this.profiles;
            data.currentProfileId = this.currentProfile?.id || null;
            FileManager.write(data);
            
            UI.success(`Profil "${profile.name}" berhasil dihapus.`);
        }
    }
    
    // Flow: Switch Profile -> Save Current Profile Habits -> Load New Profile Habits -> Save to File
    switchProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) return;
        
        if (this.currentProfile) this.saveCurrentProfileHabits();
        this.currentProfile = profile;
        this.loadHabitsForProfile(profileId);
        this.saveToFile();
    }
    
    // Flow: Load Habits for Profile -> Read from File -> Initialize Habits Array
    // @param {number} profileId - ID profil pengguna
    // @return {void}
    loadHabitsForProfile(profileId) {
        const data = FileManager.read();
        this.habits = [];
        
        if (data?.profileHabits?.[profileId]) {
            this.habits = data.profileHabits[profileId].map(hData => {
                const habit = new Habit(
                    hData.name || 'Kebiasaan',
                    hData.targetFrequency || DAYS_IN_WEEK,
                    hData.category || 'Umum'
                );
                habit.id = hData.id;
                habit.completions = hData.completions || [];
                habit.createdAt = hData.createdAt;
                return habit;
            });
        }
    }
    
    // Flow: Save Current Profile Habits -> Read from File -> Update Habits -> Write to File
    // @return {void}
    saveCurrentProfileHabits() {
        if (!this.currentProfile) return;
        
        const data = FileManager.read() || {};
        if (!data.profileHabits) data.profileHabits = {};
        data.profileHabits[this.currentProfile.id] = this.habits;
        FileManager.write(data);
    }

    // @param {number} profileId - ID profil pengguna
    // @return {number} Jumlah kebiasaan untuk profil tertentu
    getProfileHabitsCount(profileId) {
        const data = FileManager.read();
        return data?.profileHabits?.[profileId]?.length || 0;
    }
    
    // ██ DISPLAY METHODS 
    // ═══════════════════════════════════════════════════════════════
    // Methods [6]: 
    //   - displayProfile          --->  Menampilkan profil pengguna saat ini
    //   - displayProfiles         --->  Menampilkan daftar semua profil pengguna
    //   - displayHabits           --->  Menampilkan daftar kebiasaan untuk profil saat ini
    //   - displayHabitsByCategory --->  Menampilkan kebiasaan yang dikelompokkan berdasarkan kategori
    //   - displayStats            --->  Menampilkan statistik kebiasaan
    //   - displayHistory          --->  Menampilkan riwayat penyelesaian kebiasaan
    
    // Flow: Check Current Profile -> Update Stats -> Display Profile Info
    displayProfile() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        this.currentProfile.updateStats(this.habits);
        UI.header('PROFIL PENGGUNA');
        console.log(`Nama             : ${this.currentProfile.name}`);
        console.log(`Bergabung        : ${this.currentProfile.getDaysJoined()} hari lalu`);
        console.log(`Total Kebiasaan  : ${this.habits.length}`);
        console.log(`Selesai Minggu   : ${this.currentProfile.getCompletedThisWeek(this.habits)}`);
        console.log(`Streak Saat Ini  : ${this.currentProfile.currentStreak} hari`);
        console.log(`Streak Terbaik   : ${this.currentProfile.longestStreak} hari`);
        console.log('═'.repeat(60) + '\n');
    }
    
    // Flow: Display Header -> List Profiles with Status and Habit Count
    displayProfiles() {
        UI.header('DAFTAR PROFIL');
        
        if (this.profiles.length === 0) {
            console.log('Belum ada profil.');
        } else {
            this.profiles.forEach((profile, i) => {
                const active = this.currentProfile?.id === profile.id ? 
                    ` ${colors.yellow}(AKTIF)${colors.reset}` : '';
                const count = this.getProfileHabitsCount(profile.id);
                console.log(`${i + 1}. ${colors.bright}${profile.name}${colors.reset}${active} (${count} kebiasaan)`);
                console.log(`   Bergabung: ${new Date(profile.joinDate).toLocaleDateString('id-ID')}`);
            });
        }
        console.log('═'.repeat(60) + '\n');
    }
    
    // Flow: Filter Habits -> Display Header -> List Habits
    // @param {string} filter - Filter untuk menampilkan kebiasaan ('all', 'active', 'completed')
    displayHabits(filter = 'all') {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        let habits = this.habits;
        let title = 'SEMUA KEBIASAAN';
        
        if (filter === 'active') {
            habits = this.habits.filter(h => !h.isCompletedThisWeek());
            title = 'KEBIASAAN AKTIF';
        } else if (filter === 'completed') {
            habits = this.habits.filter(h => h.isCompletedThisWeek());
            title = 'KEBIASAAN SELESAI';
        }
        
        UI.header(title);
        
        if (habits.length === 0) {
            if (this.habits.length === 0) {
                console.log('Belum ada kebiasaan.');
            } else {
                console.log(filter === 'active' ? 
                    colors.green + 'Selamat! Semua kebiasaan selesai! 🎉' + colors.reset :
                    'Belum ada kebiasaan selesai minggu ini.');
            }
        } else {
            habits.forEach(habit => {
                const index = this.habits.indexOf(habit) + 1;
                const todayMark = habit.isCompletedToday() ? ' (Selesai Hari Ini)' : '';
                
                console.log(`\n${index}. ${habit.getStatusIcon()} ${habit.name}${todayMark}`);
                console.log(`   Kategori: ${habit.category}`);
                console.log(`   Target: ${habit.targetFrequency}x/minggu | Progress: ${habit.getThisWeekCompletions()}/${habit.targetFrequency} (${habit.getProgressPercentage().toFixed(0)}%)`);
                console.log(colors.yellow + `   ${habit.getProgressBar()}` + colors.reset);
                console.log(`   Streak: ${habit.getCurrentStreak()} hari berturut-turut`);
            });
        }
        console.log('\n' + '═'.repeat(60) + '\n');
    }
    
    // Flow: Display Header -> List Habits by Category
    displayHabitsByCategory() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        UI.header('KEBIASAAN PER KATEGORI');
        const categories = [...new Set(this.habits.map(h => h.category))];
        
        if (categories.length === 0) {
            console.log('Belum ada kebiasaan.');
        } else {
            categories.forEach(cat => {
                console.log(`\n` + colors.yellow + `[${cat}]` + colors.reset);
                this.habits.filter(h => h.category === cat).forEach(habit => {
                    console.log(`   ${habit.getStatusIcon()} ${habit.name} (${habit.getThisWeekCompletions()}/${habit.targetFrequency})`);
                });
            });
        }
        console.log('\n' + '═'.repeat(60) + '\n');
    }
    
    // Flow: Check Current Profile -> Update Stats -> Display Statistics
    displayStats() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        this.currentProfile.updateStats(this.habits);
        UI.header('STATISTIK KEBIASAAN');
        
        const active = this.habits.filter(h => !h.isCompletedThisWeek()).length;
        const completed = this.habits.filter(h => h.isCompletedThisWeek()).length;
        
        console.log(`Total Kebiasaan         : ${this.habits.length}`);
        console.log(`Aktif                   : ${active}`);
        console.log(`Selesai                 : ${completed}`);
        
        if (this.habits.length > 0) {
            const avgProgress = this.habits.reduce((sum, h) => sum + h.getProgressPercentage(), 0) / this.habits.length;
            const totalCompletions = this.habits.reduce((sum, h) => sum + h.getThisWeekCompletions(), 0);
            
            console.log(`Progress Rata-rata      : ${avgProgress.toFixed(1)}%`);
            console.log(`Total Selesai Minggu Ini: ${totalCompletions} kali`);
            
            const streaks = this.habits
                .map(h => ({ name: h.name, streak: h.getCurrentStreak() }))
                .sort((a, b) => b.streak - a.streak);
            
            if (streaks[0].streak > 0) {
                console.log(`\nStreak Terpanjang:`);
                console.log(`   "${streaks[0].name}" - ${streaks[0].streak} hari`);
            }
        }
        console.log('═'.repeat(60) + '\n');
    }
    
    // Flow: Check Current Profile -> Display Header -> List Completions for Last 7 Days
    displayHistory() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        UI.header('RIWAYAT (7 Hari Terakhir)');
        
        if (this.habits.length === 0) {
            console.log('Belum ada kebiasaan.');
        } else {
            const today = DateUtils.today();
            
            for (let i = DAYS_IN_WEEK - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                
                const dateStr = date.toLocaleDateString('id-ID', {
                    weekday: 'short', day: '2-digit', month: 'short'
                });
                
                console.log(`\n${dateStr}:`);
                
                const completed = this.habits.filter(h => 
                    h.completions.some(comp => DateUtils.isSameDay(comp, date))
                );
                
                if (completed.length === 0) {
                    console.log('   (Tidak ada penyelesaian)');
                } else {
                    completed.forEach(h => console.log(`   [X] ${h.name}`));
                }
            }
        }
        console.log('\n' + '═'.repeat(60) + '\n');
    }
    
    // ██ REMINDER SYSTEM
    // ═══════════════════════════════════════════════════════════════
    // Methods [9]: 
    //   - startReminder          --->  Memulai sistem pengingat
    //   - stopReminder           --->  Menghentikan sistem pengingat
    //   - toggleReminder         --->  Mengaktifkan atau menonaktifkan pengingat
    //   - pauseReminder          --->  Menjeda pengingat sementara
    //   - resumeReminder         --->  Melanjutkan pengingat yang dijeda
    //   - resetReminder          --->  Mereset pengingat ke kondisi awal
    //   - showReminder           --->  Menampilkan pengingat
    //   - updateReminderDisplay  --->  Memperbarui tampilan pengingat
    //   - displayReminderBox     --->  Menampilkan kotak pengingat
    
    // Flow: Clear Existing Timers -> Set New Reminder Timer -> Set Dot Animation Timer -> Show Success Message
    startReminder() {
        this.stopReminder();
        
        this.reminderTimer = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
        this.reminderEnabled = true;
        this.reminderDots = 0;
        this.reminderShown = false;
        
        this.reminderDotTimer = setInterval(() => {
            this.reminderDots = (this.reminderDots + 1) % 11;
            if (this.reminderShown) this.updateReminderDisplay();
        }, 1000);
        
        UI.success('Pengingat diaktifkan (setiap 10 detik).');
    }
    
    // Flow: Clear Timers -> Reset States -> Show Success Message
    stopReminder() {
        if (this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = null;
        }
        if (this.reminderDotTimer) {
            clearInterval(this.reminderDotTimer);
            this.reminderDotTimer = null;
        }
        this.reminderEnabled = false;
        UI.success('Pengingat dinonaktifkan.');
    }
    
    // Flow: Toggle Reminder Based on Current State
    toggleReminder() {
        this.reminderEnabled ? this.stopReminder() : this.startReminder();
    }
    
    // Flow: Pause Reminder -> Ask Question -> Resume Reminder -> Reset Reminder -> Return Answer
    pauseReminder() {
        if (this.reminderEnabled && this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = null;
        }
        if (this.reminderDotTimer) {
            clearInterval(this.reminderDotTimer);
            this.reminderDotTimer = null;
        }
    }
    
    // Flow: Resume Reminder -> Set New Reminder Timer -> Set Dot Animation Timer
    resumeReminder() {
        if (this.reminderEnabled && !this.reminderTimer) {
            this.reminderTimer = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
            this.reminderDots = 0;
            this.reminderShown = false;
            this.reminderDotTimer = setInterval(() => {
                this.reminderDots = (this.reminderDots + 1) % 11;
                if (this.reminderShown) this.updateReminderDisplay();
            }, 1000);
        }
    }
    
    // Flow: Reset Reminder -> Clear Existing Timers -> Set New Timers
    resetReminder() {
        if (this.reminderEnabled && this.reminderTimer) {
            clearInterval(this.reminderTimer);
            this.reminderTimer = setInterval(() => this.showReminder(), REMINDER_INTERVAL);
            this.reminderDots = 0;
            this.reminderShown = false;
            
            if (this.reminderDotTimer) clearInterval(this.reminderDotTimer);
            this.reminderDotTimer = setInterval(() => {
                this.reminderDots = (this.reminderDots + 1) % 11;
                if (this.reminderShown) this.updateReminderDisplay();
            }, 1000);
        }
    }
    
    // Flow: Check Incomplete Habits -> If Any, Show Reminder Box -> Update States
    showReminder() {
        if (!this.currentProfile || this.habits.length === 0) return;
        
        const incomplete = this.habits.filter(h => !h.isCompletedToday());
        if (incomplete.length === 0) return;
        
        this.reminderShown = true;
        this.reminderCount++;
        this.reminderDots = 0;
    }
    
    // Flow: Update Reminder Display -> Check Incomplete Habits -> If Any, Show Reminder Box
    updateReminderDisplay() {
        if (!this.currentProfile || this.habits.length === 0) return;
        
        const incomplete = this.habits.filter(h => !h.isCompletedToday());
        if (incomplete.length === 0) return;
        
        this.displayReminderBox(incomplete);
    }
    
    // Flow: Display Reminder Box with Incomplete Habits
    displayReminderBox(incomplete) {
        console.clear();
        const boxWidth = 58;
        const title = 'PENGINGAT KEBIASAAN HARI INI';
        const titlePadding = Math.floor((boxWidth - title.length) / 2);
        const headerColor = this.reminderCount % 2 === 0 ? colors.yellow : colors.cyan;
        
        console.log('\n' + headerColor + colors.bright + '┌' + '─'.repeat(boxWidth) + '┐');
        console.log('│' + ' '.repeat(titlePadding) + title + ' '.repeat(boxWidth - titlePadding - title.length) + '│');
        console.log('├' + '─'.repeat(boxWidth) + '┤' + colors.reset);
        
        incomplete.forEach((h, i) => {
            const content = `${i + 1}. ${h.name} (${h.getThisWeekCompletions()}/${h.targetFrequency})`;
            const contentPadding = boxWidth - content.length - 2;
            console.log(headerColor + '│' + colors.reset + ' ' + content + ' '.repeat(contentPadding) + ' ' + headerColor + '│' + colors.reset);
        });
        
        console.log(headerColor + colors.bright + '└' + '─'.repeat(boxWidth) + '┘' + colors.reset);
        
        const dots = '•'.repeat(this.reminderDots);
        const remaining = 11 - this.reminderDots;
        const dotsLine = `Countdown: ${headerColor}${dots}${colors.darkgray}${'•'.repeat(remaining)}${colors.reset} ${headerColor}[${remaining}s]${colors.reset}`;
        
        console.log(dotsLine);
        console.log(colors.darkgray + 'Tekan Enter untuk melanjutkan...' + colors.reset);
    }
    
    // ██ FILE OPERATIONS
    // ═══════════════════════════════════════════════════════════════
    // Methods [4]: 
    //   - saveToFile         --->  Menyimpan data ke file
    //   - loadFromFile       --->  Memuat data dari file
    //   - exportData         --->  Mengekspor data ke file teks
    //   - generateDemoHabits --->  Menghasilkan data demo kebiasaan
    
    // Flow: Read Existing Data -> Update Profiles and Current Profile -> Update Habits for Current Profile -> Write Back to File
    saveToFile() {
        const data = FileManager.read() || { profileHabits: {} };
        data.profiles = this.profiles;
        data.currentProfileId = this.currentProfile?.id || null;
        
        if (this.currentProfile) {
            data.profileHabits[this.currentProfile.id] = this.habits;
        }
        
        this.profiles.forEach(p => {
            if (!data.profileHabits[p.id]) data.profileHabits[p.id] = [];
        });
        
        FileManager.write(data);
    }
    
    // Flow: Read Data from File -> Initialize Profiles and Current Profile -> Load Habits for Current Profile
    loadFromFile() {
        const data = FileManager.read();
        if (!data) return;
        
        if (data.profiles) {
            this.profiles = data.profiles.map(pData => {
                const profile = new UserProfile(pData.name || 'User', pData.id);
                profile.joinDate = pData.joinDate || new Date();
                profile.currentStreak = pData.currentStreak || 0;
                profile.longestStreak = pData.longestStreak || 0;
                return profile;
            });
        }
        
        if (data.currentProfileId) {
            this.currentProfile = this.profiles.find(p => p.id === data.currentProfileId);
        }
        
        if (this.currentProfile) {
            this.loadHabitsForProfile(this.currentProfile.id);
        }
        
        console.log('[OK] Data berhasil dimuat.');
    }
    
    // Flow: Build Export Lines -> Write to File -> Show Success or Error Message
    exportData() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        const exportPath = path.join(__dirname, 'habits-export.txt');
        const lines = [
            '═'.repeat(60),
            'EKSPOR DATA HABIT TRACKER',
            '═'.repeat(60),
            '',
            `Nama: ${this.currentProfile.name}`,
            `Tanggal: ${new Date().toLocaleString('id-ID')}`,
            `Total Kebiasaan: ${this.habits.length}`,
            '',
            '═'.repeat(60),
            'DAFTAR KEBIASAAN',
            '═'.repeat(60),
            ''
        ];
        
        this.habits.forEach((h, i) => {
            lines.push(
                `${i + 1}. ${h.name}`,
                `   Kategori: ${h.category}`,
                `   Target: ${h.targetFrequency}x/minggu`,
                `   Progress: ${h.getThisWeekCompletions()}/${h.targetFrequency} (${h.getProgressPercentage().toFixed(0)}%)`,
                `   Streak: ${h.getCurrentStreak()} hari`,
                `   Total Penyelesaian: ${h.completions.length}x`,
                ''
            );
        });
        
        try {
            fs.writeFileSync(exportPath, lines.join('\n'), 'utf8');
            UI.success(`Data diekspor ke: ${exportPath}`);
        } catch (error) {
            UI.error('Gagal mengekspor data.');
        }
    }
    
    // Flow: Confirm Generation -> Add Demo Habits -> Show Success Message
    async generateDemoHabits() {
        if (!this.currentProfile) return UI.info('Tidak ada profil aktif.');
        
        UI.header('GENERATE DEMO');
        const confirm = await askQuestion('Generate 5 contoh kebiasaan? (y/n): ', this);
        
        if (confirm.toLowerCase() === 'y') {
            console.log('\n[...] Membuat contoh kebiasaan...');
            const demoHabits = [
                ['Minum Air 8 Gelas', 7, 'Kesehatan'],
                ['Olahraga 30 Menit', 5, 'Kesehatan'],
                ['Membaca Buku 30 Menit', 5, 'Produktivitas'],
                ['Meditasi 10 Menit', 7, 'Kesehatan'],
                ['Belajar Coding', 6, 'Produktivitas']
            ];
            
            demoHabits.forEach(([name, freq, cat]) => this.addHabit(name, freq, cat));
            UI.success('5 contoh kebiasaan ditambahkan.');
        } else {
            UI.info('Dibatalkan.');
        }
    }
}

// ╔════════════════════════════════════════════╗
// ║                 MENU DISPLAY               ║
// ╚════════════════════════════════════════════╝
// Functions [3]: 
//   - displayMainMenu    --->  Menampilkan menu utama
//   - displayProfileMenu --->  Menampilkan submenu profil
//   - displayHabitMenu   --->  Menampilkan submenu kebiasaan

// ██ Main Menu Display
// Flow: Clear Console -> Show Header -> Show Stats -> List Options
function displayMainMenu(tracker) {
    console.clear();
    const active = tracker.habits.filter(h => !h.isCompletedThisWeek()).length;
    const completed = tracker.habits.filter(h => h.isCompletedThisWeek()).length;
    const pending = tracker.habits.filter(h => !h.isCompletedToday()).length;
    const profileName = tracker.currentProfile ? tracker.currentProfile.name : 'Tidak ada';
    const streak = tracker.currentProfile ? tracker.currentProfile.currentStreak : 0;
    const reminderStatus = tracker.reminderEnabled ? 'AKTIF' : 'NONAKTIF';
    
    console.log('\n' + '═'.repeat(60));
    console.log(colors.cyan + 'HABIT TRACKER - MENU UTAMA' + colors.reset);
    console.log('═'.repeat(60));
    console.log(colors.yellow + `Profil: ` + colors.magenta + profileName);
    console.log(colors.yellow + `Kebiasaan: ${active} aktif, ${completed} selesai`);
    if (pending > 0) console.log(`Pending hari ini: ${pending} kebiasaan`);
    console.log(`Streak: ${streak} hari` + colors.reset);
    console.log('═'.repeat(60));
    console.log(colors.cyan + 'Kelola:' + colors.reset);
    console.log('1. Kelola Profil');
    console.log('2. Kelola Kebiasaan');
    UI.separator();
    console.log(colors.cyan + 'Shortcut:' + colors.reset);
    console.log('3. Lihat Semua Kebiasaan');
    console.log('4. Tambah Kebiasaan Baru');
    console.log('5. Tandai Kebiasaan Selesai');
    UI.separator();
    console.log(colors.cyan + 'Utilitas:' + colors.reset);
    console.log('6. Demo Loop');
    console.log('7. Ekspor Data');
    console.log('8. Generate Demo Kebiasaan');
    console.log(`9. Reminder ` + colors.magenta + `(${reminderStatus})` + colors.reset);
    UI.separator();
    console.log('0. Keluar');
    UI.separator();
}

// ██ Profile Menu Display
// Flow: Clear Console -> Show Header -> List Options
function displayProfileMenu(tracker) {
    console.clear();
    UI.header('KELOLA PROFIL');
    console.log('Profil Aktif: ' + colors.magenta + 
        (tracker.currentProfile ? tracker.currentProfile.name : 'Tidak ada') + colors.reset);
    UI.separator();
    console.log('1. Lihat Profil Saya');
    console.log('2. Ganti Profil');
    console.log('3. Buat Profil Baru');
    console.log('4. Hapus Profil');
    UI.separator();
    console.log('0. Kembali ke Menu Utama');
    UI.separator();
}

// ██ Habit Menu Display
// Flow: Clear Console -> Show Header -> List Options
function displayHabitMenu() {
    console.clear();
    UI.header('KELOLA KEBIASAAN');
    console.log(colors.cyan + 'Tampilan:' + colors.reset);
    console.log('1. Lihat Semua Kebiasaan');
    console.log('2. Lihat per Kategori');
    console.log('3. Kebiasaan Aktif Saja');
    console.log('4. Kebiasaan Selesai Saja');
    UI.separator();
    console.log(colors.cyan + 'Analisis:' + colors.reset);
    console.log('5. Lihat Statistik');
    console.log('6. Lihat Riwayat (7 hari)');
    UI.separator();
    console.log(colors.cyan + 'Aksi:' + colors.reset);
    console.log('7. Tambah Kebiasaan Baru');
    console.log('8. Tandai Kebiasaan Selesai');
    console.log('9. Edit Kebiasaan');
    console.log('10. Hapus Kebiasaan');
    UI.separator();
    console.log('0. Kembali ke Menu Utama');
    UI.separator();
}

// ╔════════════════════════════════════════════╗
// ║                 MENU HANDLERS              ║
// ╚════════════════════════════════════════════╝
// Functions [8]: 
//   - handleMainMenu       --->  Menangani interaksi menu utama
//   - handleProfileMenu    --->  Menangani interaksi submenu profil
//   - handleHabitMenu      --->  Menangani interaksi submenu kebiasaan
//   - handleAddHabit       --->  Menangani penambahan kebiasaan baru
//   - handleCompleteHabit  --->  Menangani penandaan kebiasaan selesai
//   - handleEditHabit      --->  Menangani pengeditan kebiasaan
//   - handleDeleteHabit    --->  Menangani penghapusan kebiasaan
//   - displayLoopDemo      --->  Menampilkan demo loop

// ██ Main Menu Handler
// Flow: Display Menu -> Get Choice -> Handle Choice -> Loop Until Exit
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleMainMenu(tracker) {
    let running = true;
    
    while (running) {
        displayMainMenu(tracker);
        const choice = await askQuestion('\nPilih menu (0-9): ', tracker, true);
        
        const skipClear = ['0', '9'].includes(choice);
        if (!skipClear) console.clear();
        
        const isSubMenuOrToggle = ['1', '2', '9'].includes(choice);

        switch (choice) {
            case '1':
                await handleProfileMenu(tracker);
                break;
            case '2':
                await handleHabitMenu(tracker);
                break;
            case '3':
                tracker.currentProfile ? tracker.displayHabits('all') : UI.info('Tidak ada profil aktif.');
                break;
            case '4':
                await handleAddHabit(tracker);
                break;
            case '5':
                await handleCompleteHabit(tracker);
                break;
            case '6':
                displayLoopDemo(tracker.habits, 'while');
                await askQuestion('\n[Tekan Enter untuk melanjutkan ke FOR LOOP...]', tracker);
                console.clear();
                displayLoopDemo(tracker.habits, 'for');
                break;
            case '7':
                tracker.exportData();
                break;
            case '8':
                await tracker.generateDemoHabits();
                break;
            case '9':
                tracker.toggleReminder();
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
            case '0':
                console.clear();
                console.log('\n' + '═'.repeat(60));
                console.log('Terima kasih telah menggunakan HABIT TRACKER');
                console.log('═'.repeat(60) + '\n');
                tracker.stopReminder();
                running = false;
                break;
            default:
                if (choice.trim()) UI.error('Pilihan tidak valid.');
                break;
        }
        
        if (running && !isSubMenuOrToggle && choice.trim()) {
            await askQuestion('\nTekan Enter untuk melanjutkan...', tracker);
        }
    }
    
    rl.close();
}

// ██ Profile Menu Handler
// Flow: Display Menu -> Get Choice -> Handle Choice -> Loop Until Exit
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleProfileMenu(tracker) {
    let running = true;
    
    while (running) {
        displayProfileMenu(tracker);
        const choice = await askQuestion('\n> Menu Utama > Kelola Profil\nPilih menu (0-4): ', tracker, true);
        
        if (choice === '0') {
            running = false;
            break;
        }
        
        console.clear();
        
        switch (choice) {
            case '1':
                tracker.displayProfile();
                break;
            case '2':
                await tracker.selectProfile();
                break;
            case '3':
                await tracker.createNewProfile();
                break;
            case '4':
                await tracker.deleteProfile();
                break;
            default:
                if (choice.trim()) UI.error('Pilihan tidak valid.');
                break;
        }
        
        if (choice.trim() !== '') {
            await askQuestion('\nTekan Enter untuk melanjutkan...', tracker);
        }
    }
}

// ██ Habit Menu Handler
// Flow: Display Menu -> Get Choice -> Handle Choice -> Loop Until Exit
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleHabitMenu(tracker) {
    let running = true;
    
    while (running) {
        displayHabitMenu();
        const choice = await askQuestion('\n> Menu Utama > Kelola Kebiasaan\nPilih menu (0-10): ', tracker, true);
        
        if (choice === '0') {
            running = false;
            break;
        }
        
        console.clear();
        
        switch (choice) {
            case '1':
                tracker.displayHabits('all');
                break;
            case '2':
                tracker.displayHabitsByCategory();
                break;
            case '3':
                tracker.displayHabits('active');
                break;
            case '4':
                tracker.displayHabits('completed');
                break;
            case '5':
                tracker.displayStats();
                break;
            case '6':
                tracker.displayHistory();
                break;
            case '7':
                await handleAddHabit(tracker);
                break;
            case '8':
                await handleCompleteHabit(tracker);
                break;
            case '9':
                await handleEditHabit(tracker);
                break;
            case '10':
                await handleDeleteHabit(tracker);
                break;
            default:
                if (choice.trim()) UI.error('Pilihan tidak valid.');
                break;
        }
        
        if (choice.trim() !== '') {
            await askQuestion('\nTekan Enter untuk melanjutkan...', tracker);
        }
    }
}

// ██ Add Habit Handler
// Flow: Check Active Profile -> Get Habit Details -> Validate Input -> Add Habit or Show Error
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleAddHabit(tracker) {
    if (!tracker.currentProfile) return UI.info('Tidak ada profil aktif.');
    
    UI.header('TAMBAH KEBIASAAN BARU');
    const name = await askQuestion('Nama kebiasaan: ', tracker);
    const frequency = await askQuestion('Target per minggu (1-7): ', tracker);
    const category = await askCategory(tracker);
    
    const freq = parseInt(frequency);
    if (name && freq >= 1 && freq <= DAYS_IN_WEEK) {
        tracker.addHabit(name, freq, category);
        UI.success(`Kebiasaan "${name}" (${category}) berhasil ditambahkan!`);
    } else {
        UI.error('Input tidak valid.');
    }
}

// ██ Complete Habit Handler
// Flow: Check Active Profile -> Display Habits -> Get Choice -> Validate Choice -> Complete Habit or Show Error
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleCompleteHabit(tracker) {
    if (!tracker.currentProfile) return UI.info('Tidak ada profil aktif.');
    
    tracker.displayHabits('all');
    if (tracker.habits.length === 0) return;

    const choice = await askQuestion('Nomor kebiasaan yang selesai (0=batal): ', tracker);
    if (choice !== '0') {
        const idx = parseInt(choice);
        if (idx >= 1 && idx <= tracker.habits.length) {
            tracker.completeHabit(idx);
        } else {
            UI.error('Nomor tidak valid.');
        }
    }
}

// ██ Edit Habit Handler
// Flow: Check Active Profile -> Display Habits -> Get Choice -> Validate Choice -> Edit Habit or Show Error
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleEditHabit(tracker) {
    if (!tracker.currentProfile) return UI.info('Tidak ada profil aktif.');
    
    tracker.displayHabits('all');
    if (tracker.habits.length === 0) return;
    
    const choice = await askQuestion('Nomor kebiasaan untuk diedit (0=batal): ', tracker);
    if (choice === '0') return;
    
    const idx = parseInt(choice);
    if (idx < 1 || idx > tracker.habits.length) return UI.error('Nomor tidak valid.');
    
    const habit = tracker.habits[idx - 1];
    console.log(`\nEdit "${habit.name}"`);
    console.log('(Kosongkan jika tidak ingin mengubah)\n');
    
    const newName = await askQuestion(`Nama baru [${habit.name}]: `, tracker);
    const newFreq = await askQuestion(`Target baru [${habit.targetFrequency}]: `, tracker);
    
    console.log(`\nKategori saat ini: ${habit.category}`);
    const changeCat = await askQuestion('Ubah kategori? (y/n): ', tracker);
    
    let finalCat = null;
    if (changeCat.toLowerCase() === 'y') {
        finalCat = await askCategory(tracker);
    }
    
    const finalName = newName || null;
    const finalFreq = newFreq ? parseInt(newFreq) : null;
    
    if (finalName || finalFreq || finalCat) {
        tracker.editHabit(idx, finalName, finalFreq, finalCat);
    } else {
        UI.info('Tidak ada perubahan.');
    }
}

// ██ Delete Habit Handler
// Flow: Check Active Profile -> Display Habits -> Get Choice -> Validate Choice -> Delete Habit or Show Error
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleDeleteHabit(tracker) {
    if (!tracker.currentProfile) return UI.info('Tidak ada profil aktif.');
    if (tracker.habits.length === 0) return UI.info('Belum ada kebiasaan.');
    
    tracker.displayHabits('all');
    console.log('\nOpsi Hapus:');
    console.log('1. Hapus kebiasaan tertentu');
    console.log('2. Hapus semua kebiasaan');
    console.log('0. Batal');

    const option = await askQuestion('\nPilih opsi (0-2): ', tracker);
    
    if (option === '1') {
        const choice = await askQuestion('\nNomor kebiasaan untuk dihapus (0=batal): ', tracker);
        if (choice === '0') return UI.info('Dibatalkan.');
        
        const idx = parseInt(choice);
        if (idx >= 1 && idx <= tracker.habits.length) {
            const habit = tracker.habits[idx - 1];
            const confirm = await askQuestion(`Yakin hapus "${habit.name}"? (y/n): `, tracker);
            if (confirm.toLowerCase() === 'y') {
                tracker.deleteHabit(idx);
            } else {
                UI.info('Dibatalkan.');
            }
        } else {
            UI.error('Nomor tidak valid.');
        }
    } else if (option === '2') {
        console.log(`\n[!] PERINGATAN: Anda akan menghapus SEMUA ${tracker.habits.length} kebiasaan!`);
        const confirm = await askQuestion('Ketik "HAPUS SEMUA" untuk konfirmasi: ', tracker);
        
        if (confirm === 'HAPUS SEMUA') {
            const count = tracker.habits.length;
            tracker.habits = [];
            tracker.saveToFile();
            UI.success(`Berhasil menghapus ${count} kebiasaan.`);
        } else {
            UI.info('Dibatalkan. Konfirmasi tidak sesuai.');
        }
    } else if (option === '0') {
        UI.info('Dibatalkan.');
    } else {
        UI.error('Pilihan tidak valid.');
    }
}

// ██ Loop Demo
// Flow: Display Code Structure -> Execute Loop Implementation -> Show Results
// @param {Habit[]} habits - Daftar kebiasaan
// @param {string} type - Jenis loop ('while' atau 'for')
// @return {void}
function displayLoopDemo(habits, type) {
    const title = type === 'while' ? 'WHILE LOOP' : 'FOR LOOP';
    UI.header(`DEMO ${title}`);
    
    if (habits.length === 0) {
        console.log(colors.red + 'Belum ada kebiasaan untuk ditampilkan.' + colors.reset);
        console.log('Tambahkan kebiasaan terlebih dahulu melalui menu utama.\n');
        UI.separator();
        return;
    }
    
    if (type === 'while') {
        console.log(colors.bright + 'STRUKTUR KODE:' + colors.reset);
        console.log('─'.repeat(60));
        console.log(colors.darkgray + 
`let i = 0;
while (i < habits.length) {
    const habit = habits[i];
    const status = habit.isCompletedThisWeek() ? '✓' : '○';
    console.log(status + ' ' + (i + 1) + '. ' + habit.name);
    console.log('   Progress: ' + habit.getThisWeekCompletions()
    + '/' + habit.targetFrequency);
    i++;
}` + colors.reset);
        
        console.log('\n' + colors.bright + 'IMPLEMENTASI:' + colors.reset);
        console.log('─'.repeat(60));
        
        let i = 0;
        while (i < habits.length) {
            const habit = habits[i];
            const status = habit.isCompletedThisWeek() ? 
                colors.green + '✓' + colors.reset : 
                colors.yellow + '○' + colors.reset;
            
            console.log(`${status} ${i + 1}. ${colors.bright}${habit.name}${colors.reset}`);
            console.log(`   Progress: ${habit.getThisWeekCompletions()}/${habit.targetFrequency} (${habit.getProgressPercentage().toFixed(0)}%)`);
            i++;
        }
        console.log('─'.repeat(60));
        
    } else {
        console.log(colors.bright + 'STRUKTUR KODE:' + colors.reset);
        console.log('─'.repeat(60));
        console.log(colors.darkgray + 
`for (let i = 0; i < habits.length; i++) {
    const habit = habits[i];
    const status = habit.isCompletedThisWeek() ? '✓' : '○';
    console.log(status + ' ' + (i + 1) + '. ' + habit.name);
    console.log('   Progress: ' + habit.getProgressBar());
}` + colors.reset);
        
        console.log('\n' + colors.bright + 'IMPLEMENTASI:' + colors.reset);
        console.log('─'.repeat(60));
        
        for (let i = 0; i < habits.length; i++) {
            const habit = habits[i];
            const status = habit.isCompletedThisWeek() ? 
                colors.green + '✓' + colors.reset : 
                colors.yellow + '○' + colors.reset;
            
            console.log(`${status} ${i + 1}. ${colors.bright}${habit.name}${colors.reset}`);
            console.log(`   Progress: ${habit.getProgressBar()}`);
        }
        console.log('─'.repeat(60));
    }
}

// ╔════════════════════════════════════════════╗
// ║                 MAIN FUNCTION              ║
// ╚════════════════════════════════════════════╝
// Functions: 
//   - main                            --->  Fungsi utama program
//   - setupFirstTimeUser              --->  Menyiapkan pengguna baru
//   - handleReturningUser             --->  Menangani pengguna yang kembali
//   - displayPendingNotification      --->  Menampilkan notifikasi yang pending
//   - createNewProfileFromLogin       --->  Membuat profil baru dari login
//   - generateInitialHabits           --->  Menghasilkan kebiasaan awal

// ██ Main
// Flow: Clear Console -> Show Welcome -> Check Profiles -> Setup or Login -> Start Reminder -> Handle Main Menu
// @return {Promise<void>}
async function main() {
    console.clear();
    console.log('\n' + colors.cyan + '═'.repeat(60));
    console.log('SELAMAT DATANG DI HABIT TRACKER');
    console.log('Bangun kebiasaan baik, capai tujuan Anda!');
    console.log('═'.repeat(60) + colors.reset);
    
    const tracker = new HabitTracker();
    
    if (tracker.profiles.length === 0) {
        await setupFirstTimeUser(tracker); // First-time user flow
    } else {
        await handleReturningUser(tracker); // Returning user flow
    }
    
    tracker.startReminder();
    await handleMainMenu(tracker);
}

// ██ First-time user setup
// Flow: Greet User -> Get Name -> Create Profile -> Save -> Offer Demo Habits
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function setupFirstTimeUser(tracker) {
    console.log('\nSepertinya ini adalah kunjungan pertama Anda!');
    const userName = await askQuestion('Masukkan nama Anda: ', tracker);
    
    if (userName) {
        const newProfile = new UserProfile(userName);
        tracker.profiles.push(newProfile);
        tracker.currentProfile = newProfile;
        tracker.saveToFile();
        
        UI.success(`Profil "${userName}" telah dibuat!`);
        
        const wantDemo = await askQuestion('\nIngin kami buatkan contoh kebiasaan? (y/n): ', tracker);
        if (wantDemo.toLowerCase() === 'y') {
            await generateInitialHabits(tracker);
        }
    }
}

// ██ Returning user flow
// Flow: Display Profiles -> Select Profile or Create New -> Load Habits -> Show Notifications
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function handleReturningUser(tracker) {
    console.log('\n' + colors.yellow + 'Data profil ditemukan!' + colors.reset);
    UI.header('PILIH PROFIL');
    
    tracker.profiles.forEach((profile, i) => {
        const count = tracker.getProfileHabitsCount(profile.id);
        console.log(`${i + 1}. ${colors.bright}${profile.name}${colors.reset} (${count} kebiasaan)`);
        console.log(`   Bergabung: ${new Date(profile.joinDate).toLocaleDateString('id-ID')}`);
    });
    
    UI.separator();
    console.log(`${tracker.profiles.length + 1}. ${colors.green}Buat Profil Baru${colors.reset}`);
    UI.separator();
    
    let validChoice = false;
    while (!validChoice) {
        const choice = await askQuestion(`\nPilih profil (1-${tracker.profiles.length + 1}): `, tracker);
        const num = parseInt(choice);
        
        if (num >= 1 && num <= tracker.profiles.length) {
            const selected = tracker.profiles[num - 1];
            tracker.currentProfile = selected;
            tracker.loadHabitsForProfile(selected.id);
            
            console.log(`\n${colors.green}[OK] Selamat datang kembali, ${selected.name}!${colors.reset}`);
            console.log(`[INFO] ${tracker.habits.length} kebiasaan dimuat.`);
            
            displayPendingNotification(tracker); // Show pending habits notification
            validChoice = true;
        } else if (num === tracker.profiles.length + 1) {
            await createNewProfileFromLogin(tracker); // Create new profile flow
            validChoice = true;
        } else {
            UI.error(`Pilihan tidak valid. Masukkan angka 1-${tracker.profiles.length + 1}.`);
        }
    }
}

// ██ Notification for pending habits
// Flow: Count Pending Habits -> Show Notification
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {void}
function displayPendingNotification(tracker) {
    const pending = tracker.habits.filter(h => !h.isCompletedToday()).length;
    if (pending > 0) {
        console.log(`Anda memiliki ${colors.yellow}${pending} kebiasaan${colors.reset} yang belum diselesaikan hari ini.`);
    } else if (tracker.habits.length > 0) {
        console.log(colors.green + 'Luar biasa! Semua kebiasaan hari ini sudah selesai! 🎉' + colors.reset);
    }
}

// ██ Create new profile from login menu
// Flow: Get Name -> Create Profile -> Save -> Offer Demo Habits
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function createNewProfileFromLogin(tracker) {
    UI.header('BUAT PROFIL BARU');
    const newName = await askQuestion('Nama untuk profil baru: ', tracker);
    
    if (newName) {
        const newProfile = new UserProfile(newName);
        tracker.profiles.push(newProfile);
        tracker.currentProfile = newProfile;
        tracker.habits = [];
        tracker.saveToFile();
        
        UI.success(`Profil "${newProfile.name}" berhasil dibuat!`);
        
        const wantDemo = await askQuestion('\nIngin kami buatkan contoh kebiasaan? (y/n): ', tracker);
        if (wantDemo.toLowerCase() === 'y') {
            await generateInitialHabits(tracker);
        }
    } else {
        UI.error('Nama tidak boleh kosong.');
    }
}

// ██ Generate initial demo habits for new profiles
// Flow: Add Demo Habits -> Show Success Message
// @param {HabitTracker} tracker - Instance HabitTracker
// @return {Promise<void>}
async function generateInitialHabits(tracker) {
    console.log('\n[...] Membuat contoh kebiasaan...');
    const demoHabits = [
        ['Minum Air 8 Gelas', 7, 'Kesehatan'],
        ['Olahraga 30 Menit', 5, 'Kesehatan'],
        ['Membaca Buku 30 Menit', 5, 'Produktivitas'],
        ['Meditasi 10 Menit', 7, 'Kesehatan'],
        ['Belajar Coding', 6, 'Produktivitas']
    ];
    
    demoHabits.forEach(([name, freq, cat]) => tracker.addHabit(name, freq, cat));
    console.log('[OK] Selesai! 5 contoh kebiasaan telah ditambahkan.');
}

// ╔════════════════════════════════════════════╗
// ║                RUN APPLICATION             ║
// ╚════════════════════════════════════════════╝

// Start the main function and handle uncaught errors
main().catch(error => {
    console.error('\n[X] Terjadi kesalahan:', error.message);
    rl.close();
    process.exit(1);
});