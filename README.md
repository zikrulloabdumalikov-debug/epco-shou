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
| `WEBHOOK_SECRET` | `epco_9f3kQ2xLm8Rt4vZp` | **Majburiy.** Kamida 16 belgili tasodifiy so'z (harf, raqam, `_`, `-`). Busiz bot xabarlari qabul qilinmaydi |
| `BOT_USERNAME` | `epcoaksiya_bot` | Bot username (`@` siz) |
| `ADMIN_CHAT_ID` | `123456789` | Buyurtmalar yuboriladigan admin Telegram ID |
| `WEBAPP_URL` | `https://script.google.com/macros/s/.../exec` | Ixtiyoriy. `setTelegramWebhook` Web App manzilini o'zi topa olmasa |

### 2.3. Funksiyalarni Ishga Tushirish Ketma-ketligi (Run)
Avval **2.4** bo'yicha Deploy qiling, keyin Apps Script muharririda quyidagilarni **qat'iy tartibda** bir martadan ishga tushiring:

1. **`setupSheets`** ni tanlang va **Run (Ishga tushirish)** tugmasini bosing:
   - Google hisobingizga ruxsat berish oynasi chiqadi (`Review permissions` → Hisobni tanlang → `Advanced` → `Go to EPCO Shou (unsafe)` → `Allow`).
   - Bu funksiya `Ustalar` varag'i mavjudligini tekshiradi.
2. **`installTriggers`** ni tanlang va **Run** tugmasini bosing:
   - Muddati o'tgan sessiyalarni har kuni tozalaydigan trigger o'rnatadi.
3. **`setTelegramWebhook`** ni tanlang va **Run** tugmasini bosing:
   - Botni Web App'ga `?secret=WEBHOOK_SECRET` bilan ulaydi. Log'da `"ok":true` chiqishi kerak.
   - `WEBHOOK_SECRET` ni o'zgartirsangiz, bu funksiyani qayta ishga tushiring.

### 2.4. Web App Sifatida Deploy Qilish
> Kodni yangilaganda manzil o'zgarmasligi uchun: **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. Yangi deployment yaratsangiz, manzil o'zgaradi va GitHub'dagi `VITE_API_URL` ni ham yangilash kerak bo'ladi.

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
VITE_BOT_USERNAME=@epcoaksiya_bot

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

1. **Maxfiylik:** Reytingda ism standart holatda yashirin — faqat hudud raqami va birinchi harf (`03 · H***`). To'liq ism faqat mijoz o'zi rozilik bersa ko'rinadi.
2. **Avtorizatsiya:** faqat ikki yo'l bilan:
   - Telegram Mini App ichida — `initData` HMAC-SHA256 imzosi bot tokeni bilan tekshiriladi (24 soat amal qiladi).
   - Brauzer/PWA'da — telefon raqami → Telegram botga 6 xonali kod (5 daqiqa, 5 ta urinish, 1 daqiqada bir marta).
   Kod faqat shu raqamni **o'z akkauntidan** «Kontaktni ulashish» tugmasi bilan tasdiqlagan Telegram chatga yuboriladi.
3. **Bot webhook:** `WEBHOOK_SECRET` siz kelgan so'rovlar e'tiborsiz qoldiriladi.
4. **Sessiyalar:** tasodifiy 256-bitli token, 30 kun amal qiladi; chiqishda o'chiriladi.
5. **Testlar:** `src/__tests__/appsScript.test.ts` `Code.gs` ni Google xizmatlari mock'lari bilan ishga tushirib, yuqoridagilarni tekshiradi (`npm test`).
