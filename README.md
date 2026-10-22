# EPCO – Katta Rozig'ish Shou (Production Tizimi)

EPCO motor moylari mijozlari (ustalar, moyxonachilar, avto-do'konlar) uchun ishlab chiqilgan rasmiy rag'batlantirish va jonli shou o'yini mobil platformasi (React 19 + TypeScript + Vite PWA + Google Apps Script + Telegram Bot).

---

## 0. Tizim qanday ishlaydi (GitHub + Google + Telegram)

| Qism | Qayerda turadi | Nima qiladi |
|---|---|---|
| Frontend (React ilova) | **GitHub Pages** — `https://<login>.github.io/<repo>/` | Telegram Mini App va brauzerda ochiladigan sayt |
| Backend (`google-apps-script/Code.gs`) | **Google Sheets → Apps Script** | `Ustalar` varag'ini o'qiydi, API va Telegram webhook |
| Bot | **Telegram** | Webhook Apps Script Web App manziliga ulangan |

- `main` branchga har `git push` qilinganda `.github/workflows/deploy.yml` saytni avtomatik yig'ib, GitHub Pages'ga joylaydi.
- Apps Script kodi GitHub'dan avtomatik yangilanmaydi: `Code.gs` o'zgarsa, uni Apps Script muharririga qayta nusxalab, **Deploy → Manage deployments → Edit → New version** qiling.
- GitHub repo sozlamalari (**Settings → Secrets and variables → Actions → Variables**):
  - `VITE_API_URL` — Apps Script Web App manzili (`https://script.google.com/macros/s/.../exec`)
  - `VITE_BOT_USERNAME` — bot username (`@epcoaksiya_bot`)
- **Settings → Pages → Source: GitHub Actions** bo'lishi kerak.
- Bot tokeni (`BOT_TOKEN`) hech qachon GitHub'ga yozilmaydi — u faqat Apps Script **Script Properties** da turadi.

---

## 1. Aksiya Asosiy Qoidalari

- **Har $1,000 to'lov (PUL KIRIM) = 1 ta bilet.**
- **Biletlar va $1,000 dan kam qoldiq har oy boshida NOLGA tushadi**, yangi oy yangi to'lovlar bilan boshlanadi.
- **Qarzi bor mijozning biletlari "NOFAOL" holatda bo'ladi.** Qarz $0 qilib to'liq yopilishi bilan barcha biletlar avtomatik ravishda **"AKTUAL"** bo'ladi.
- Har oy barcha AKTUAL biletlar orasidan **30 ta bilet tasodifiy tanlanadi** va egalari jonli efir shousiga taklif qilinadi (reyting bo'yicha emas, tasodifiy gipergeometrik tanlov).
- **Umumiy sovg'a fondi: $15,000.** Bosh sovg'a — **Chevrolet DAMAS** (fond ichida).
- Har oy reytingda 1-o'rinni olgan qarzsiz usta **iPhone 18 Pro Max** sovg'asini oladi.

---

## 2. Google Apps Script Backend O'rnatish Qo'llanmasi

Backend to'liq `google-apps-script/Code.gs` faylida mujassamlashgan. Barcha ma'lumotlar mijozning Google Sheets jadvalidan olinadi va real vaqtda qayta ishlanadi.

### 2.1. Skriptni Jadvalga Joylash
1. Google Sheets jadvalingizni oching (`Ustalar` varag'i mavjud bo'lgan jadval).
2. Yuqori menyudan **Kengaytmalar (Extensions) → Apps Script** bo'limiga kiring.
3. Loyihada mavjud barcha fayllarni tozalang va `google-apps-script/Code.gs` faylidagi barcha kodni to'liq nusxalab qo'ying.
4. Loyihani saqlang (`Ctrl + S` yoki disk belgisi).

### 2.2. Script Properties (Skript xususiyatlari) Sozlash
Apps Script muharririning chap menyusidagi **Project Settings (Tishli g'ildirak / Loyiha sozlamalari)** bo'limiga kiring:
Quyidagi **Script Properties** parametrlarini qo'shing:

| Xususiyat (Property) | Qiymat misoli | Tavsif |
|---|---|---|
| `BOT_TOKEN` | `7123456789:AAH...` | Telegram @BotFather dan olingan bot tokeni |
| `WEBHOOK_SECRET` | `epco_sec_2026_xyz` | Telegram webhook himoyasi uchun maxfiy so'z |
| `ADMIN_CHAT_ID` | `123456789` | Buyurtmalar va xatolar yuboriladigan admin Telegram ID |
| `APP_URL` | `https://epco.uz` | Frontend PWA ilovasining to'liq veb manzili |

### 2.3. Funksiyalarni Ishga Tushirish Ketma-ketligi (Run)
Apps Script muharririda yuqoridagi funksiyalar ro'yxatidan quyidagilarni **qat'iy tartibda** bir martadan ishga tushiring:

1. **`setupSheets`** ni tanlang va **Run (Ishga tushirish)** tugmasini bosing:
   - Google hisobingizga ruxsat berish oynasi chiqadi (`Review permissions` → Hisobni tanlang → `Advanced` → `Go to EPCO Shou (unsafe)` → `Allow`).
   - Bu funksiya barcha kerakli varaqlarni (`Ustalar`, `Mijoz_Profil`, `Sessiyalar`, `Biletlar`, `Sozlamalar`, `Zakazlar`, `Goliblar`, `Katalog`, `Xatolar`) tekshiradi va avtomatik yaratib, formatlaydi.
2. **`installTriggers`** ni tanlang va **Run** tugmasini bosing:
   - Jadvalga to'lov kiritilganda yoki o'zgarish bo'lganda avtomatik qayta hisoblash triggerlarini o'rnatadi.
3. **`setTelegramWebhook`** ni tanlang va **Run** tugmasini bosing:
   - Botga kelgan xabarlar va kontakt ulashish so'rovlarini to'g'ridan-to'g'ri Web App'ga ulaydi.

### 2.4. Web App Sifatida Deploy Qilish
1. Yuqori o'ng burchakdagi ko'k **Deploy (Joylashtirish) → New deployment** tugmasini bosing.
2. Chapdagi tishli g'ildirakdan **Web app** ni tanlang.
3. Quyidagi sozlamalarni aniq belgilang:
   - **Description:** `EPCO Shou Production v1.0`
   - **Execute as:** `Me (mening elektron pochtam)`
   - **Who has access:** `Anyone` (**Har kim**, anonim ham) — *MUHIM: Aks holda mobil ilova ulanolmaydi!*
4. **Deploy** tugmasini bosing va berilgan **Web App URL** manzilini nusxalab oling (masalan: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## 3. Telegram @BotFather Sozlamalari

Mijozlar telefon raqamlari orqali xavfsiz avtorizatsiyadan o'tishlari uchun Telegram boti sozlanadi:

1. Telegramda **@BotFather** botiga kiring.
2. `/mybots` buyrug'ini yuboring va EPCO botingizni tanlang.
3. **Bot Settings → Menu Button → Configure menu button**:
   - Tugma sarlavhasi (Button text): `🎟️ EPCO Shou`
   - URL manzili: Frontend ilovangiz manzili.
4. **Mini App sifatida ulash (ixtiyoriy)**:
   - `/newapp` buyrug'ini bering, botni tanlang, nom va tavsif bering, Web App URL manzilini kiriting.

---

## 4. Frontend Muhit O'zgaruvchilari (.env)

Loyihaning ildiz papkasidagi `.env` faylida quyidagi parametrlarni o'rnating:

```env
# Google Apps Script Web App manzili
VITE_API_URL=https://script.google.com/macros/s/AKfycb.../exec

# Telegram bot username
VITE_BOT_USERNAME=@epco_aksiyabot

# Demo rejim (production da albatta false bo'lishi kerak!)
VITE_DEMO=false
```

---

## 5. Loyihani Ishga Tushirish va Sinovdan O'tkazish

```bash
# Bog'liqliklarni o'rnatish
npm install

# Testlarni ishga tushirish (Vitest)
npm test

# Typescript va sintaksis tekshiruvi
npm run lint

# Ishlab chiqish serverini ishga tushirish (Port 3000)
npm run dev

# Production uchun yig'ish (Build)
npm run build
```

---

## 6. Xavfsizlik va Maxfiylik Kafolatlari

1. **Maxfiylik:** Reytingda hech qachon boshqa mijozlarning aniq ismlari yoki to'lov summalari ko'rsatilmaydi — faqat hudud va birinchi harf (`03 Andijon · H***`).
2. **Haqiqiylik:** Barcha biletlar raqamli seriya raqami va QR kodga ega bo'lib, ochiq `/verify/:raqam` havolasi orqali tekshirilishi mumkin.
3. **Avtorizatsiya:** Telegram WebApp HMAC-SHA256 imzosi yoki 6 xonali Telegram OTP kodi orqali amalga oshiriladi.
