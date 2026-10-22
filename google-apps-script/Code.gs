/**
 * EPCO – KATTA ROZIG'ISH SHOU (Production Backend)
 * Google Apps Script Web App & Telegram Bot
 *
 * Versiya: 2.3.0. Mijozlar "Ustalar" varag'idan o'qiladi; "Ulanishlar" va
 * "Yangi_mijozlar" varaqlari avtomatik yaratiladi.
 *
 * 2.2.0 xavfsizlik: kirish faqat Telegram botdagi 6 xonali kod yoki imzosi
 * (HMAC) tekshirilgan Telegram Mini App orqali; webhook WEBHOOK_SECRET bilan
 * himoyalangan; reytingda ismlar standart holatda yashirin.
 */

var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // Sessiya 30 kun amal qiladi
var OTP_TTL_SECONDS = 300;                      // Kod 5 daqiqa amal qiladi
var OTP_RESEND_SECONDS = 60;                    // Kodni qayta so'rash oralig'i
var OTP_MAX_ATTEMPTS = 5;                       // Bitta kod uchun urinishlar soni
var TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

// ═══════════════════════════════════════════════════════════════════════════
// 1. STANDART SOZLAMALAR VA KONSTANTALAR
// ═══════════════════════════════════════════════════════════════════════════
var DEFAULTS = {
  DEBT_TOLERANCE: 0,               // Qarz shu summadan oshmasa "qarzsiz"
  DEBTORS_IN_RANKING: true,        // Qarzdorlar reytingda ko'rinadimi
  DEBTORS_ELIGIBLE_FOR_TOP1: false,// Qarzdor iPhone 18 Pro Max oladimi
  TICKET_PRICE: 1000,              // Har $1,000 = 1 bilet
  SHOW_WINNERS_K: 30,              // Jonli shouga 30 ta bilet tasodifiy tanlanadi
  TIMEZONE: "Asia/Tashkent",       // Server vaqt mintaqasi
  SUPPORT_PHONE: "+998 90 556 90 60",
  RULES_VIDEO_URL: "",
  PROMO_START: "2026-10-01",
  PROMO_END: "2027-02-28",
  TOTAL_PRIZE_POOL_USD: 15000,
  GRAND_PRIZE: "Chevrolet DAMAS",
  FIRST_PLACE_PRIZE: "iPhone 18 Pro Max",
  BOT_USERNAME: "epcoaksiya_bot"
};

/**
 * Script Properties dan sozlamalarni olish
 */
function getConfig() {
  var config = Object.assign({}, DEFAULTS);
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    if (props.BOT_TOKEN) config.BOT_TOKEN = props.BOT_TOKEN;
    if (props.BOT_USERNAME) config.BOT_USERNAME = props.BOT_USERNAME;
    if (props.WEBHOOK_SECRET) config.WEBHOOK_SECRET = props.WEBHOOK_SECRET;
    if (props.ADMIN_CHAT_ID) config.ADMIN_CHAT_ID = props.ADMIN_CHAT_ID;
    if (props.WEBAPP_URL) config.WEBAPP_URL = props.WEBAPP_URL;
  } catch (e) {
    Logger.log("Sozlamalarni o'qishda xatolik: " + e.message);
  }
  return config;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WEB APP ENTRY POINTS (GET / POST)
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
  if (action === "ping") {
    return createJsonResponse(true, {
      status: "ONLINE",
      time: new Date().toISOString(),
      supportPhone: "+998 90 556 90 60",
      message: "EPCO Shou Backend muvaffaqiyatli ishlamoqda"
    });
  }
  return createJsonResponse(false, null, { code: "BAD_REQUEST", message: "Noma'lum GET amali" });
}

function doPost(e) {
  try {
    var content = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    var data = {};
    try {
      data = JSON.parse(content);
    } catch (parseErr) {
      data = {};
    }

    // 1. Telegram Bot Webhook (Telegram update yuborganda)
    if (data.update_id || data.message || data.callback_query) {
      // Webhook manzilidagi ?secret=... faqat Telegram'ga ma'lum (setTelegramWebhook).
      // Busiz har kim soxta "kontakt" yuborib, begona raqamni o'z chatiga ulab olardi.
      var webhookSecret = getConfig().WEBHOOK_SECRET;
      var givenSecret = (e && e.parameter && e.parameter.secret) ? String(e.parameter.secret) : "";
      if (!webhookSecret || !safeEqual(givenSecret, String(webhookSecret))) {
        Logger.log("Webhook rad etildi: WEBHOOK_SECRET mos kelmadi yoki o'rnatilmagan");
        return webhookOk();
      }
      // Telegram javob olmasa xabarni qayta yuboradi — bir xil update_id ikki marta ishlanmaydi
      if (data.update_id) {
        var updCache = CacheService.getScriptCache();
        if (updCache.get("upd_" + data.update_id)) return webhookOk();
        updCache.put("upd_" + data.update_id, "1", 21600);
      }
      handleTelegramWebhook(data);
      return webhookOk();
    }

    // 2. Web App API so'rovlari. Umumiy qulf (LockService) yo'q: ilova bir vaqtda bir nechta
    // so'rov yuborganda ular bir-birini kutib, "блокировка" xatosi bilan tushardi.
    var action = data.action || "";
    var token = data.token || "";
    var phoneKey = null;
    var needsAuth = ["bootstrap", "me", "tickets", "consent.update", "lead.submit"];
    if (needsAuth.indexOf(action) !== -1) {
      phoneKey = getPhoneFromToken(token);
      if (!phoneKey) {
        return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Sessiya muddati tugagan. Iltimos, qayta kiring." });
      }
    }

    var responseData = null;
    switch (action) {
      // Autentifikatsiya: faqat Telegram Mini App (HMAC) yoki Telegram botdagi kod orqali
      case "auth.telegram":
        responseData = handleTelegramAuth(data.initData);
        break;

      case "auth.requestCode":
        responseData = handleRequestCode(data.phone);
        break;

      case "auth.verifyCode":
        responseData = handleVerifyCode(data.phone, data.code);
        break;

      case "auth.logout":
        deleteSession(token);
        responseData = { loggedOut: true };
        break;

      // Ilova ochilganda kerak bo'lgan hamma narsa bitta so'rovda
      case "bootstrap":
        responseData = handleBootstrap(phoneKey);
        break;

      case "me":
        responseData = handleGetClient(phoneKey);
        break;

      case "leaderboard":
        responseData = handleGetLeaderboard(data.scope || "republic", data.region, getPhoneFromToken(token));
        break;

      case "tickets":
        responseData = handleGetTickets(phoneKey);
        break;

      case "consent.update":
        responseData = handleUpdateConsent(phoneKey, Boolean(data.consent));
        break;

      // Bazada yo'q yangi mijoz anketasi
      case "lead.submit":
        responseData = handleSubmitLead(phoneKey, data.lead || {});
        break;

      case "ticket.verify":
        responseData = handleVerifyTicket(data.ticketNumber);
        break;

      case "winners":
        responseData = handleGetWinners();
        break;

      default:
        return createJsonResponse(false, null, { code: "UNKNOWN_ACTION", message: "Noma'lum amal: " + action });
    }

    return createJsonResponse(true, responseData);

  } catch (err) {
    Logger.log("doPost xatolik: " + err.toString());
    return createJsonResponse(false, null, { code: "EXECUTION_ERROR", message: (err && err.message) || String(err) });
  }
}

function createJsonResponse(success, data, error) {
  var payload = {
    success: success,
    timestamp: new Date().toISOString()
  };
  if (success) {
    payload.data = data;
  } else {
    payload.error = error || { code: "ERROR", message: "Noma'lum xatolik" };
  }
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. TELEFON, SANA VA PULNI TOZALASH FUNKSIYALARI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Har qanday telefon formatidan oxirgi 9 ta raqamni ajratib olish (901234567)
 */
function normalizePhoneKey(phone) {
  if (!phone) return null;
  var digits = String(phone).replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

/**
 * Ism yoki telefon ustunidan 9 xonali raqamni topish
 */
function extractPhoneKey(rawPhone, clientName) {
  var fromPhone = normalizePhoneKey(rawPhone);
  if (fromPhone) return fromPhone;

  // Agar telefon ustunida raqam bo'lmasa, mijoz nomidan qidirish
  if (clientName) {
    var str = String(clientName);
    var match = str.match(/(?:\+?998)?[\s-]?(\d{2})[\s-]?(\d{3})[\s-]?(\d{2})[\s-]?(\d{2})/);
    if (match) {
      var found = match[1] + match[2] + match[3] + match[4];
      if (found.length === 9) return found;
    }
  }
  return null;
}

function formatPhoneUz(key) {
  if (!key || key.length !== 9) return key || "";
  return "+998 (" + key.substring(0, 2) + ") " + key.substring(2, 5) + "-" + key.substring(5, 7) + "-" + key.substring(7, 9);
}

function parseMoney(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  var str = String(val).replace(/\s+/g, "").replace(",", ".");
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Jadvalga yoziladigan matn: "=", "+", "-", "@" bilan boshlansa formula bo'lib ketmasligi uchun
 */
function sheetText(value, maxLength) {
  var s = String(value === undefined || value === null ? "" : value).trim().slice(0, maxLength || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

var MONTHS_UZ = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
];

function getCurrentMonth() {
  return Utilities.formatDate(new Date(), DEFAULTS.TIMEZONE, "yyyy-MM");
}

/**
 * Oy oxirigacha qolgan vaqt (Toshkent vaqti bo'yicha)
 */
function getMonthTiming() {
  var now = new Date();
  var parts = Utilities.formatDate(now, DEFAULTS.TIMEZONE, "yyyy-M-d-H").split("-");
  var year = Number(parts[0]), month = Number(parts[1]), day = Number(parts[2]), hour = Number(parts[3]);
  var daysInMonth = new Date(year, month, 0).getDate();
  var hoursRemaining = Math.max(0, (daysInMonth - day) * 24 + (23 - hour));
  var daysRemaining = daysInMonth - day;
  var monthName = MONTHS_UZ[month - 1];
  return {
    daysRemaining: daysRemaining,
    hoursRemaining: hoursRemaining,
    isLastDay: daysRemaining === 0,
    monthName: monthName + " " + year,
    dateFormatted: day + "-" + monthName + ", " + year,
    label: daysRemaining === 0 ? (hoursRemaining + " soat qoldi!") : (daysRemaining + " kun qoldi")
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. "USTALAR" VARAG'INI O'QISH, KESHLASH VA AGREGATSIYA QILISH
// ═══════════════════════════════════════════════════════════════════════════

var MASTERS_CACHE_KEY = "masters_v2";
var MASTERS_CACHE_SECONDS = 900;   // 15 daqiqa; jadval qo'lda o'zgartirilsa onEdit keshni tozalaydi
var MASTERS_CACHE_CHUNK = 30000;   // CacheService qiymati 100KB dan oshmasligi kerak
var LEADERBOARD_SIZE = 50;

function getMasterSheet(ss) {
  var sheet = ss.getSheetByName("Ustalar");
  if (sheet) return sheet;
  var all = ss.getSheets();
  for (var i = 0; i < all.length; i++) {
    var name = all[i].getName();
    if (name !== ACTIVITY_SHEET && name !== LEADS_SHEET) return all[i];
  }
  return null;
}

/**
 * "Ustalar" varag'ini o'qib, telefon bo'yicha jamlaydi.
 * Ustunlar: A Hudud, B Agent, C Mijoz, D Sana, E Telefon, F Status, G Pul kirim, H Qarz, I Bilet soni
 * Natija: [[phoneKey, ism, hudud, agent, pulKirim, qarz, qo'lda biletlar], ...]
 */
function readMasterRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return [];
  var sheet = getMasterSheet(ss);
  if (!sheet || sheet.getLastRow() < 2) return [];

  // Faqat kerakli 9 ta ustun — butun varaqni o'qish juda sekin edi
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  var map = {};
  var order = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var region = String(row[0] || "").trim();
    var agent = String(row[1] || "").trim();
    var clientName = String(row[2] || "").trim();
    var phoneKey = extractPhoneKey(row[4], clientName);
    if (!phoneKey) continue;

    var paid = parseMoney(row[6]);
    var rawDebt = parseMoney(row[7]); // Jadvalda qarz manfiy son: -276.52
    var manualTickets = Number(row[8]) || 0;

    var item = map[phoneKey];
    if (!item) {
      item = map[phoneKey] = [phoneKey, clientName, region, agent, 0, 0, 0];
      order.push(phoneKey);
    }
    item[4] += paid;
    item[5] = Math.abs(rawDebt); // Eng so'nggi qarz holati
    if (manualTickets > 0) item[6] += manualTickets;
    if (!item[1] && clientName) item[1] = clientName;
    if (!item[2] && region) item[2] = region;
    if (!item[3] && agent) item[3] = agent;
  }

  return order.map(function(k) { return map[k]; });
}

function getMasterRows() {
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(MASTERS_CACHE_KEY + "_n"));
  if (count > 0) {
    var keys = [];
    for (var i = 0; i < count; i++) keys.push(MASTERS_CACHE_KEY + "_" + i);
    var parts = cache.getAll(keys);
    var json = "";
    var complete = true;
    for (var j = 0; j < keys.length; j++) {
      if (parts[keys[j]] === undefined || parts[keys[j]] === null) {
        complete = false;
        break;
      }
      json += parts[keys[j]];
    }
    if (complete) {
      try {
        return JSON.parse(json);
      } catch (e) {}
    }
  }
  return refreshMastersCache();
}

/**
 * Jadvalni qayta o'qib keshga yozadi. installTriggers uni har 10 daqiqada ishga tushiradi,
 * shunda foydalanuvchilar sekin "sovuq" o'qishga deyarli duch kelmaydi.
 */
function refreshMastersCache() {
  var rows = readMasterRows();
  try {
    var json = JSON.stringify(rows);
    var chunks = {};
    var n = Math.max(1, Math.ceil(json.length / MASTERS_CACHE_CHUNK));
    for (var i = 0; i < n; i++) {
      chunks[MASTERS_CACHE_KEY + "_" + i] = json.substr(i * MASTERS_CACHE_CHUNK, MASTERS_CACHE_CHUNK);
    }
    chunks[MASTERS_CACHE_KEY + "_n"] = String(n);
    CacheService.getScriptCache().putAll(chunks, MASTERS_CACHE_SECONDS);
  } catch (e) {
    Logger.log("Keshga yozib bo'lmadi: " + e.message);
  }
  return rows;
}

/**
 * Jadval qo'lda tahrirlanganda keshni tozalaydi (oddiy trigger, o'rnatish shart emas)
 */
function onEdit(e) {
  try {
    var name = e && e.range ? e.range.getSheet().getName() : "";
    if (name === ACTIVITY_SHEET || name === LEADS_SHEET) return;
    CacheService.getScriptCache().remove(MASTERS_CACHE_KEY + "_n");
  } catch (err) {}
}

function loadAndAggregateMasters() {
  var config = getConfig();
  var rows = getMasterRows();
  var clientsMap = {};
  var clientList = [];
  var totalActiveTickets = 0;
  var activeParticipants = 0;

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var paid = roundMoney(r[4]);
    var debt = roundMoney(r[5]);
    var tickets = r[6] > 0 ? r[6] : Math.floor(paid / config.TICKET_PRICE);
    var remainder = roundMoney(paid % config.TICKET_PRICE);
    var isDebtCleared = debt <= config.DEBT_TOLERANCE;
    var activeTickets = isDebtCleared ? tickets : 0;

    var item = {
      phoneKey: r[0],
      phoneFormatted: formatPhoneUz(r[0]),
      name: r[1] || ("Mijoz " + String(r[0]).slice(-4)),
      region: r[2] || "O'zbekiston",
      agent: r[3] || "",
      paidAmount: paid,
      debtAmount: debt,
      tickets: tickets,
      activeTickets: activeTickets,
      remainder: remainder,
      gapToNextTicket: roundMoney(remainder === 0 ? config.TICKET_PRICE : config.TICKET_PRICE - remainder),
      isDebtCleared: isDebtCleared
    };
    totalActiveTickets += activeTickets;
    if (activeTickets > 0) activeParticipants++;
    clientsMap[item.phoneKey] = item;
    clientList.push(item);
  }

  // Reyting: Pul kirim bo'yicha kamayish tartibida
  clientList.sort(function(a, b) {
    if (b.paidAmount !== a.paidAmount) return b.paidAmount - a.paidAmount;
    return b.activeTickets - a.activeTickets;
  });

  var regionCounters = {};
  for (var k = 0; k < clientList.length; k++) {
    var c = clientList[k];
    c.rank = k + 1;
    regionCounters[c.region] = (regionCounters[c.region] || 0) + 1;
    c.regionRank = regionCounters[c.region];
  }

  return {
    clientsMap: clientsMap,
    clientList: clientList,
    totalActiveTickets: totalActiveTickets,
    activeParticipants: activeParticipants,
    regionTotals: regionCounters
  };
}

/**
 * Ismni niqoblash (maxfiylik)
 */
function maskClientName(name, region, consent) {
  if (consent) {
    return name || "Usta";
  }
  var cleanName = (name || "Usta").trim();
  var firstLetter = cleanName.charAt(0).toUpperCase();
  var regPrefix = region ? (region.split(" ")[0] || "") : "";
  if (regPrefix) {
    return regPrefix + " · " + firstLetter + "***";
  }
  return firstLetter + "***";
}

/**
 * Gipergeometrik ehtimol (0..1): K ta bilet tanlanganda t ta biletdan kamida bittasi chiqishi
 */
function drawProbability(t, T, K) {
  if (t <= 0 || T <= 0 || K <= 0) return 0;
  if (t >= T || T - t < K) return 1;
  var product = 1;
  for (var i = 0; i < K; i++) {
    product *= (T - t - i) / (T - i);
  }
  return Math.max(0, Math.min(1, 1 - product));
}

function toPercent(p) {
  return Number((p * 100).toFixed(2));
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. HANDLERS: bootstrap, me, leaderboard, tickets, winners, anketa
// ═══════════════════════════════════════════════════════════════════════════

function buildPromoConfig(dataObj, config) {
  var timing = getMonthTiming();
  var thresholds = [];
  [1, 3, 5, 10, 20, 50].forEach(function(rank) {
    var c = dataObj.clientList[rank - 1];
    if (c) thresholds.push({ rank: rank, minAmount: roundMoney(c.paidAmount + 1), label: rank + "-o'rin" });
  });

  return {
    totalShowWinners: config.SHOW_WINNERS_K,
    totalConfirmedTicketsPool: dataObj.totalActiveTickets,
    totalPrizePoolUsd: config.TOTAL_PRIZE_POOL_USD,
    grandPrize: config.GRAND_PRIZE,
    firstPlacePrize: config.FIRST_PLACE_PRIZE,
    prizeScope: "republic",
    startDate: config.PROMO_START,
    endDate: config.PROMO_END,
    currentMonthName: timing.monthName,
    daysRemainingInMonth: timing.daysRemaining,
    hoursRemainingInMonth: timing.hoursRemaining,
    isLastDayOfMonth: timing.isLastDay,
    timeRemainingLabel: timing.label,
    currentDateFormatted: timing.dateFormatted,
    rulesVideoUrl: config.RULES_VIDEO_URL,
    supportPhone: config.SUPPORT_PHONE,
    serverNow: new Date().toISOString(),
    thresholds: thresholds
  };
}

function buildClientStats(master, dataObj, config) {
  var timing = getMonthTiming();
  var list = dataObj.clientList;
  var T = dataObj.totalActiveTickets;
  var K = config.SHOW_WINNERS_K;
  var t = master.activeTickets;

  var pNow = drawProbability(t, T, K);
  var pNext = drawProbability(t + 1, T + 1, K);
  var poolIfCleared = master.isDebtCleared ? T : T + master.tickets;
  var pIfCleared = drawProbability(master.tickets, poolIfCleared, K);
  var avgTickets = Math.max(1, Math.round(T / Math.max(1, dataObj.activeParticipants)));
  var pAvg = drawProbability(avgTickets, T, K);

  var rank = master.rank || list.length + 1;
  var paid = master.paidAmount;
  var gapTo = function(index) {
    var other = list[index];
    return other ? roundMoney(Math.max(0, other.paidAmount - paid + 1)) : 0;
  };

  return {
    confirmedAmount: paid,
    paidAmount: paid,
    debtAmount: master.debtAmount,
    isDebtCleared: master.isDebtCleared,
    activeTicketsCount: master.activeTickets,
    pendingDebtTicketsCount: master.isDebtCleared ? 0 : master.tickets,
    pendingAmount: 0,
    returnedAmount: 0,
    tickets: master.tickets,
    gapToNextTicket: master.gapToNextTicket,
    currentMonthRemainder: master.remainder,
    currentRank: rank,
    regionRank: master.regionRank || 0,
    regionTotal: dataObj.regionTotals[master.region] || 0,
    totalParticipants: list.length,
    activeParticipants: dataObj.activeParticipants,
    daysRemainingInMonth: timing.daysRemaining,
    hoursRemainingInMonth: timing.hoursRemaining,
    isMonthEndWarning: timing.daysRemaining <= 7,
    isLastDayOfMonth: timing.isLastDay,
    timeRemainingLabel: timing.label,
    currentDateFormatted: timing.dateFormatted,
    probPercent: toPercent(pNow),
    probRelativeRatio: pAvg > 0 ? Number((pNow / pAvg).toFixed(2)) : 0,
    probNextJump: {
      newProb: toPercent(pNext),
      relativeMultiplier: pNow > 0 ? Number((pNext / pNow).toFixed(2)) : 0,
      absolutePointDelta: toPercent(pNext - pNow)
    },
    probFourMonthStreak: Number(((1 - Math.pow(1 - pNow, 4)) * 100).toFixed(1)),
    probIfDebtCleared: toPercent(pIfCleared),
    gapToNextRank: rank > 1 ? gapTo(rank - 2) : 0,
    gapToTop10: rank > 10 ? gapTo(9) : 0,
    gapToFirstPlace: rank > 1 ? gapTo(0) : 0
  };
}

function buildUser(master, props) {
  var consent = props["consent_" + master.phoneKey] === "true";
  return {
    id: "usr_" + master.phoneKey,
    phone: master.phoneFormatted,
    name: master.name,
    maskedName: maskClientName(master.name, master.region, consent),
    segment: "station",
    leagueTier: master.paidAmount >= 5000 ? "gold" : (master.paidAmount >= 2000 ? "silver" : "bronze"),
    region: master.region,
    isAnonymous: !consent,
    telegramId: props["tg_chat_" + master.phoneKey] || "",
    growthPercent: 0
  };
}

function buildLeaderboardEntry(c, rank, myPhoneKey, props) {
  var consent = props["consent_" + c.phoneKey] === "true";
  return {
    id: "lb_" + rank + "_" + (c.phoneKey === myPhoneKey ? "me" : rank),
    rank: rank,
    maskedName: maskClientName(c.name, c.region, consent),
    segment: "station",
    region: c.region,
    tickets: c.activeTickets,
    isDebtCleared: c.isDebtCleared,
    growthPercent: 0,
    isMe: Boolean(myPhoneKey) && c.phoneKey === myPhoneKey
  };
}

/**
 * Top-50 va (agar unda bo'lmasa) mijozning o'z qatori. Boshqalarning to'lov summasi yuborilmaydi.
 */
function buildLeaderboard(dataObj, myPhoneKey, region, props) {
  var list = region
    ? dataObj.clientList.filter(function(c) { return c.region === region; })
    : dataObj.clientList;
  var entries = [];
  var meIncluded = false;
  for (var i = 0; i < list.length && i < LEADERBOARD_SIZE; i++) {
    var entry = buildLeaderboardEntry(list[i], i + 1, myPhoneKey, props);
    if (entry.isMe) meIncluded = true;
    entries.push(entry);
  }
  if (myPhoneKey && !meIncluded) {
    for (var j = LEADERBOARD_SIZE; j < list.length; j++) {
      if (list[j].phoneKey === myPhoneKey) {
        entries.push(buildLeaderboardEntry(list[j], j + 1, myPhoneKey, props));
        break;
      }
    }
  }
  return entries;
}

function handleBootstrap(phoneKey) {
  var config = getConfig();
  var dataObj = loadAndAggregateMasters();
  var props = PropertiesService.getScriptProperties().getProperties();
  var master = dataObj.clientsMap[phoneKey];

  recordActivity(phoneKey, "active");

  if (!master) {
    return {
      registered: false,
      phone: formatPhoneUz(phoneKey),
      supportPhone: config.SUPPORT_PHONE,
      leadSubmitted: Boolean(props["lead_" + phoneKey]),
      config: buildPromoConfig(dataObj, config)
    };
  }

  return {
    registered: true,
    user: buildUser(master, props),
    stats: buildClientStats(master, dataObj, config),
    config: buildPromoConfig(dataObj, config),
    leaderboard: {
      republic: buildLeaderboard(dataObj, phoneKey, null, props),
      region: buildLeaderboard(dataObj, phoneKey, master.region, props)
    },
    tickets: buildTickets(master),
    winners: handleGetWinners().winners
  };
}

function handleGetClient(phoneKey) {
  var config = getConfig();
  var dataObj = loadAndAggregateMasters();
  var master = dataObj.clientsMap[phoneKey];
  if (!master) {
    throw new Error("Mijoz bazada topilmadi");
  }
  var props = PropertiesService.getScriptProperties().getProperties();
  return {
    user: buildUser(master, props),
    stats: buildClientStats(master, dataObj, config),
    config: buildPromoConfig(dataObj, config)
  };
}

function handleGetLeaderboard(scope, targetRegion, myPhoneKey) {
  var dataObj = loadAndAggregateMasters();
  var props = PropertiesService.getScriptProperties().getProperties();
  var region = scope === "region" && targetRegion ? String(targetRegion) : null;
  return { entries: buildLeaderboard(dataObj, myPhoneKey, region, props) };
}

/**
 * Bilet raqami: EPCO-YYMM-<telefon base36>-NNN. Har bir mijoz uchun noyob va
 * /verify sahifasida haqiqatan tekshiriladi.
 */
function ticketNumberFor(phoneKey, index, yymm) {
  return "EPCO-" + yymm + "-" + parseInt(phoneKey, 10).toString(36).toUpperCase() + "-" + ("00" + index).slice(-3);
}

function currentYymm() {
  return getCurrentMonth().replace("-", "").slice(2);
}

function buildTickets(master) {
  var tickets = [];
  var yymm = currentYymm();
  var issued = new Date().toISOString();
  for (var i = 1; i <= master.tickets; i++) {
    var num = ticketNumberFor(master.phoneKey, i, yymm);
    tickets.push({
      id: "tkt_" + num,
      ticketNumber: num,
      orderId: "",
      dateIssued: issued,
      qrCodeUrl: "",
      status: master.isDebtCleared ? "valid" : "pending_debt",
      isDebtCleared: master.isDebtCleared
    });
  }
  return tickets;
}

function handleGetTickets(phoneKey) {
  var master = loadAndAggregateMasters().clientsMap[phoneKey];
  return { tickets: master ? buildTickets(master) : [] };
}

function handleGetWinners() {
  return { winners: [] };
}

function handleUpdateConsent(phoneKey, consent) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty("consent_" + phoneKey, consent ? "true" : "false");
  return { success: true, consent: consent };
}

function handleVerifyTicket(ticketNumber) {
  var number = String(ticketNumber || "").trim().toUpperCase();
  var match = number.match(/^EPCO-(\d{4})-([0-9A-Z]{1,8})-(\d{3})$/);
  if (!match) {
    return { valid: false, ticketNumber: number, message: "Bilet raqami noto'g'ri formatda" };
  }
  if (match[1] !== currentYymm()) {
    return { valid: false, ticketNumber: number, message: "Bu bilet joriy oyga tegishli emas" };
  }

  var phoneKey = ("000000000" + parseInt(match[2], 36)).slice(-9);
  var index = Number(match[3]);
  var master = loadAndAggregateMasters().clientsMap[phoneKey];
  if (!master || index < 1 || index > master.tickets) {
    return { valid: false, ticketNumber: number, message: "Bunday bilet topilmadi" };
  }

  return {
    valid: true,
    ticketNumber: number,
    month: getCurrentMonth(),
    status: master.isDebtCleared ? "CONFIRMED" : "PENDING_DEBT",
    ownerMasked: maskClientName(master.name, master.region, false),
    message: master.isDebtCleared ? "Haqiqiy va faol aksiya bileti" : "Haqiqiy bilet, lekin egasining qarzi yopilmagani uchun hozircha nofaol"
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5.1 YANGI MIJOZ ANKETASI ("Yangi_mijozlar" varag'i)
// ═══════════════════════════════════════════════════════════════════════════

var LEADS_SHEET = "Yangi_mijozlar";
var LEAD_HEADERS = [
  "Sana", "Telefon", "Ism", "Faoliyat turi", "Do'kon / moyxona nomi", "Viloyat",
  "Tuman / shahar", "Oylik hajm", "Hozirgi moy brendi", "Qayerdan bildi", "Telegram ID", "Holat"
];

function getLeadsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(LEADS_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(LEADS_SHEET, ss.getSheets().length);
  sheet.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS])
    .setFontWeight("bold").setBackground("#06154A").setFontColor("#FBBF24");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("dd.mm.yyyy hh:mm");
  sheet.getRange("B:B").setNumberFormat("@");
  sheet.getRange("K:K").setNumberFormat("@");
  return sheet;
}

function handleSubmitLead(phoneKey, lead) {
  var name = sheetText(lead.name, 100);
  var activity = sheetText(lead.activity, 60);
  if (!name || !activity) {
    throw new Error("Ismingiz va faoliyat turini kiriting");
  }

  var config = getConfig();
  var props = PropertiesService.getScriptProperties();
  var row = [
    new Date(),
    formatPhoneUz(phoneKey),
    name,
    activity,
    sheetText(lead.shopName, 120),
    sheetText(lead.region, 60),
    sheetText(lead.district, 80),
    sheetText(lead.volume, 60),
    sheetText(lead.brands, 120),
    sheetText(lead.source, 60),
    props.getProperty("tg_chat_" + phoneKey) || "",
    "Yangi"
  ];
  getLeadsSheet().appendRow(row);
  props.setProperty("lead_" + phoneKey, new Date().toISOString());
  recordActivity(phoneKey, "lead");

  if (config.BOT_TOKEN && config.ADMIN_CHAT_ID) {
    sendTelegramMessage(config.ADMIN_CHAT_ID,
      "🆕 Yangi mijoz anketasi\n" +
      "📞 " + formatPhoneUz(phoneKey) + "\n" +
      "👤 " + name + " — " + activity + "\n" +
      "📍 " + (lead.region || "-") + ", " + (lead.district || "-"));
  }

  return { submitted: true, supportPhone: config.SUPPORT_PHONE };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. AUTENTIFIKATSIYA VA TOKENLAR (PropertiesService & CacheService)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Kriptografik tasodifiy token (Utilities.getUuid SecureRandom'dan foydalanadi)
 */
function generateSessionToken(phoneKey) {
  var token = "epco_tok_" + (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, "");
  var value = phoneKey + "|" + (Date.now() + SESSION_TTL_MS);

  CacheService.getScriptCache().put("sess2_" + token, value, 21600); // 6 soat
  PropertiesService.getScriptProperties().setProperty("tok_" + token, value);

  return token;
}

function getPhoneFromToken(token) {
  if (!token || typeof token !== "string" || token.indexOf("epco_tok_") !== 0) return null;

  var cache = CacheService.getScriptCache();
  var value = cache.get("sess2_" + token);
  if (!value) {
    value = PropertiesService.getScriptProperties().getProperty("tok_" + token);
    if (!value) return null;
    cache.put("sess2_" + token, value, 21600);
  }

  // Format: "telefon|muddat". 2.1.0 dagi muddatsiz tokenlar parolsiz kirish orqali
  // berilgan bo'lishi mumkin — ular bekor qilinadi.
  var parts = String(value).split("|");
  if (parts.length !== 2 || Number(parts[1]) < Date.now()) {
    deleteSession(token);
    return null;
  }
  return parts[0];
}

function deleteSession(token) {
  if (!token || typeof token !== "string") return;
  CacheService.getScriptCache().remove("sess2_" + token);
  PropertiesService.getScriptProperties().deleteProperty("tok_" + token);
}

function generateOtpCode() {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var n = 0;
  for (var i = 0; i < 4; i++) {
    n = n * 256 + ((bytes[i] + 256) % 256);
  }
  return String(100000 + (n % 900000));
}

/**
 * Vaqt bo'yicha sizdirmaydigan satr solishtirish
 */
function safeEqual(a, b) {
  a = String(a);
  b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function bytesToHex(bytes) {
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var h = ((bytes[i] + 256) % 256).toString(16);
    hex += h.length === 1 ? "0" + h : h;
  }
  return hex;
}

function getBotUrl() {
  var botUser = (getConfig().BOT_USERNAME || "epcoaksiya_bot").replace("@", "");
  return "https://t.me/" + botUser;
}

/**
 * 6 xonali tasdiqlash kodini yuborish
 */
function handleRequestCode(phone) {
  var phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) {
    return { status: "INVALID_PHONE", message: "Telefon raqami noto'g'ri" };
  }

  // Bazada yo'q yangi mijozlar ham kiradi — ularga faqat anketa va aloqa raqami ko'rsatiladi.
  // Kod faqat shu raqam egasi Telegram orqali tasdiqlagan chatga yuboriladi
  var chatId = PropertiesService.getScriptProperties().getProperty("tg_chat_" + phoneKey);
  if (!chatId) {
    return {
      status: "NEED_PHONE_LINK",
      message: "Telefon raqamingiz hali botga ulanmagan. Telegram botimizga kirib, «Kontaktni ulashish» tugmasini bosing.",
      botUrl: getBotUrl()
    };
  }

  var cache = CacheService.getScriptCache();
  if (cache.get("otp_cd_" + phoneKey)) {
    return { status: "TOO_SOON", message: "Kod yaqinda yuborildi. Telegram botni tekshiring yoki 1 daqiqadan keyin qayta so'rang." };
  }

  var code = generateOtpCode();
  var sent = sendTelegramMessage(chatId, "🔐 EPCO Shou tizimiga kirish kodi: *" + code + "*\n\nKodni hech kimga bermang! Amal qilish muddati: 5 daqiqa.");
  if (!sent) {
    return { status: "SEND_FAILED", message: "Telegram bot orqali kod yuborib bo'lmadi" };
  }

  cache.put("otp_" + phoneKey, code, OTP_TTL_SECONDS);
  cache.remove("otp_try_" + phoneKey);
  cache.put("otp_cd_" + phoneKey, "1", OTP_RESEND_SECONDS);

  return { status: "CODE_SENT", message: "Tasdiqlash kodi Telegram botingizga yuborildi" };
}

/**
 * Kodni tekshirish va kirish
 */
function handleVerifyCode(phone, code) {
  var phoneKey = normalizePhoneKey(phone);
  if (!phoneKey || !code) {
    throw new Error("Telefon yoki kod kiritilmagan");
  }

  var cache = CacheService.getScriptCache();
  var validCode = cache.get("otp_" + phoneKey);
  if (!validCode) {
    throw new Error("Tasdiqlash kodi muddati o'tgan. Yangi kod so'rang.");
  }

  // Taxmin qilib topishning oldini olish: bitta kodga ko'pi bilan OTP_MAX_ATTEMPTS urinish
  var attempts = Number(cache.get("otp_try_" + phoneKey)) || 0;
  if (attempts >= OTP_MAX_ATTEMPTS) {
    cache.remove("otp_" + phoneKey);
    throw new Error("Urinishlar soni tugadi. Yangi kod so'rang.");
  }

  if (!safeEqual(String(validCode).trim(), String(code).trim())) {
    cache.put("otp_try_" + phoneKey, String(attempts + 1), OTP_TTL_SECONDS);
    throw new Error("Tasdiqlash kodi noto'g'ri");
  }

  cache.remove("otp_" + phoneKey);
  cache.remove("otp_try_" + phoneKey);
  recordActivity(phoneKey, "login");
  return {
    token: generateSessionToken(phoneKey),
    registered: Boolean(loadAndAggregateMasters().clientsMap[phoneKey])
  };
}

/**
 * Telegram Mini App orqali to'g'ridan-to'g'ri avtorizatsiya
 */
function handleTelegramAuth(initData) {
  if (!initData) {
    throw new Error("InitData topilmadi");
  }

  var fields = verifyTelegramInitData(String(initData), getConfig().BOT_TOKEN);
  if (!fields) {
    throw new Error("Telegram ma'lumotlari tasdiqlanmadi");
  }

  var userId = null;
  var tgUser = null;
  try {
    tgUser = JSON.parse(fields.user);
    userId = String(tgUser.id);
  } catch (e) {}
  if (!userId || userId === "undefined") {
    throw new Error("Telegram foydalanuvchi ID topilmadi");
  }

  // Telegram ID ga bog'langan telefon raqamini topish
  var props = PropertiesService.getScriptProperties();
  var phoneKey = props.getProperty("tg_phone_" + userId);

  if (!phoneKey) {
    return {
      status: "NEED_PHONE_LINK",
      message: "Kontaktingiz hali botga ulanmagan. Botga kirib kontaktingizni ulashing.",
      botUrl: getBotUrl()
    };
  }

  recordActivity(phoneKey, "login", tgUser);
  return {
    token: generateSessionToken(phoneKey),
    registered: Boolean(loadAndAggregateMasters().clientsMap[phoneKey])
  };
}

/**
 * Telegram Mini App initData imzosini tekshirish:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * secret = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN)
 * hash   = hex(HMAC_SHA256(key=secret, msg=data_check_string))
 * To'g'ri bo'lsa maydonlar obyektini, aks holda null qaytaradi.
 */
function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  var fields = {};
  var hash = "";
  var pairs = initData.split("&");
  for (var i = 0; i < pairs.length; i++) {
    var idx = pairs[i].indexOf("=");
    if (idx < 0) continue;
    var key, value;
    try {
      key = decodeURIComponent(pairs[i].substring(0, idx).replace(/\+/g, " "));
      value = decodeURIComponent(pairs[i].substring(idx + 1).replace(/\+/g, " "));
    } catch (e) {
      return null;
    }
    if (key === "hash") {
      hash = value.toLowerCase();
    } else {
      fields[key] = value;
    }
  }
  if (!hash) return null;

  var secret = Utilities.computeHmacSha256Signature(String(botToken), "WebAppData");
  var keys = Object.keys(fields).sort();

  function hashFor(keyList) {
    var dataCheckString = keyList.map(function(k) { return k + "=" + fields[k]; }).join("\n");
    var bytes = Utilities.newBlob("").setDataFromString(dataCheckString, "UTF-8").getBytes();
    return bytesToHex(Utilities.computeHmacSha256Signature(bytes, secret));
  }

  // Yangi Telegram versiyalari "signature" maydonini ham qo'shadi — ikkala variant ham bot tokenisiz soxtalashtirib bo'lmaydi
  var valid = safeEqual(hashFor(keys), hash) ||
    (fields.signature !== undefined && safeEqual(hashFor(keys.filter(function(k) { return k !== "signature"; })), hash));
  if (!valid) return null;

  var authDate = Number(fields.auth_date);
  if (!authDate || (Date.now() / 1000 - authDate) > TELEGRAM_AUTH_MAX_AGE_SECONDS) return null;

  return fields;
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. TELEGRAM BOT HANDLERS & WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ContentService javobi 302 (yo'naltirish) bilan qaytadi. Telegram buni xato deb
 * hisoblab, xabarni qayta-qayta yuboradi va keyingi xabarlar navbatda qotib qoladi.
 * HtmlService javobi esa to'g'ridan-to'g'ri 200 qaytadi.
 */
function webhookOk() {
  return HtmlService.createHtmlOutput("OK");
}

function handleTelegramWebhook(update) {
  if (!update.message) {
    return;
  }

  var msg = update.message;
  var chatId = msg.chat.id;
  var text = msg.text || "";

  // 1. Kontakt ulashilganda
  if (msg.contact && msg.contact.phone_number) {
    // Faqat o'z raqamini "Kontaktni ulashish" tugmasi orqali yuborgan foydalanuvchi qabul qilinadi.
    // Aks holda istalgan odam telefon kitobidagi begona kontaktni yuborib, uning hisobiga kirardi.
    var isOwnContact = msg.from && msg.contact.user_id &&
      String(msg.contact.user_id) === String(msg.from.id) &&
      msg.chat && msg.chat.type === "private";
    if (!isOwnContact) {
      sendTelegramMessage(chatId, "⚠️ Iltimos, faqat o'zingizning raqamingizni pastdagi «📲 Kontaktni ulashish» tugmasi orqali yuboring.");
      return;
    }

    var phoneKey = normalizePhoneKey(msg.contact.phone_number);
    if (phoneKey) {
      linkTelegramPhone(String(msg.from.id), String(chatId), phoneKey);
      recordActivity(phoneKey, "link", msg.from);

      sendTelegramMessage(chatId, "✅ Rahmat! Raqamingiz (" + formatPhoneUz(phoneKey) + ") muvaffaqiyatli bog'landi.\n\nEndi EPCO Shou ilovasiga bemalol kirishingiz mumkin!");
      return;
    }
  }

  // 2. /start buyrug'i
  if (text.indexOf("/start") === 0) {
    sendTelegramContactButton(chatId, "Assalomu alaykum! EPCO Katta Rozig'ish Shou botiga xush kelibsiz.\n\nIlovaga kirish uchun quyidagi tugmani bosib telefon raqamingizni tasdiqlang:");
    return;
  }

  return;
}

/**
 * Telefon <-> Telegram bog'lanishi. Eski bog'lanishlar tozalanadi, aks holda
 * raqamini almashtirgan odam yoki raqamning oldingi egasi kodlarni olishda davom etardi.
 */
function linkTelegramPhone(userId, chatId, phoneKey) {
  var props = PropertiesService.getScriptProperties();

  var prevPhone = props.getProperty("tg_phone_" + userId);
  if (prevPhone && prevPhone !== phoneKey && props.getProperty("tg_chat_" + prevPhone) === chatId) {
    props.deleteProperty("tg_chat_" + prevPhone);
  }

  var prevChat = props.getProperty("tg_chat_" + phoneKey);
  if (prevChat && prevChat !== chatId) {
    props.deleteProperty("tg_phone_" + prevChat); // shaxsiy chatda chat.id === user.id
  }

  props.setProperty("tg_chat_" + phoneKey, chatId);
  props.setProperty("tg_phone_" + userId, phoneKey);
}

function sendTelegramMessage(chatId, text) {
  var config = getConfig();
  if (!config.BOT_TOKEN) return false;
  try {
    var url = "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendMessage";
    var payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    };
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) {
      Logger.log("sendTelegramMessage javobi: " + response.getResponseCode() + " " + response.getContentText());
      return false;
    }
    return true;
  } catch (e) {
    Logger.log("sendTelegramMessage xatolik: " + e.message);
    return false;
  }
}

function sendTelegramContactButton(chatId, text) {
  var config = getConfig();
  if (!config.BOT_TOKEN) return false;
  try {
    var url = "https://api.telegram.org/bot" + config.BOT_TOKEN + "/sendMessage";
    var payload = {
      chat_id: chatId,
      text: text,
      reply_markup: {
        keyboard: [
          [{ text: "📲 Kontaktni ulashish", request_contact: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    };
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return true;
  } catch (e) {
    Logger.log("sendTelegramContactButton xatolik: " + e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7.1 "ULANISHLAR" VARAG'I: kim botga ulandi, qachon kirdi, oxirgi faollik
// ═══════════════════════════════════════════════════════════════════════════

var ACTIVITY_SHEET = "Ulanishlar";
var ACTIVITY_HEADERS = [
  "Telefon", "Mijoz", "Hudud", "Agent", "Telegram ID", "Telegram username",
  "Botga ulangan", "Oxirgi kirish", "Oxirgi faollik", "Kirishlar soni", "Holat"
];
var ACTIVITY_COL = { NAME: 2, REGION: 3, AGENT: 4, TG_ID: 5, TG_USER: 6, LINKED: 7, LOGIN: 8, ACTIVE: 9, LOGINS: 10, STATUS: 11 };
var ACTIVITY_THROTTLE_SECONDS = 600; // "Oxirgi faollik" ko'pi bilan 10 daqiqada bir yangilanadi

function getActivitySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACTIVITY_SHEET);
  if (sheet) {
    // 2.3 dan oldin yaratilgan varaqda "Holat" ustuni yo'q edi
    if (!sheet.getRange(1, ACTIVITY_COL.STATUS).getValue()) {
      sheet.getRange(1, ACTIVITY_COL.STATUS).setValue(ACTIVITY_HEADERS[ACTIVITY_COL.STATUS - 1])
        .setFontWeight("bold").setBackground("#06154A").setFontColor("#FBBF24");
    }
    return sheet;
  }

  // Oxiriga qo'shiladi — "Ustalar" birinchi varaq bo'lib qolishi kerak
  sheet = ss.insertSheet(ACTIVITY_SHEET, ss.getSheets().length);
  sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS])
    .setFontWeight("bold").setBackground("#06154A").setFontColor("#FBBF24");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("E:E").setNumberFormat("@");
  sheet.getRange("G:I").setNumberFormat("dd.mm.yyyy hh:mm");
  // Xulosa sarlavha qatorida — ma'lumot qatorlariga xalaqit bermaydi
  sheet.getRange("M1").setValue("Jami ulangan:");
  sheet.getRange("N1").setFormula("=COUNTA(A2:A)");
  sheet.getRange("O1").setValue("Bugun faol:");
  sheet.getRange("P1").setFormula("=COUNTIF(I2:I,\">=\"&TODAY())");
  sheet.getRange("M1:P1").setFontWeight("bold");
  return sheet;
}

/**
 * event: "link" (botga kontakt ulashdi), "login" (saytga kirdi), "active" (ilovadan foydalanmoqda),
 * "lead" (yangi mijoz anketa to'ldirdi). Xatolik bo'lsa ham kirish jarayoni to'xtamaydi.
 */
function recordActivity(phoneKey, event, tgUser) {
  var lock = null;
  try {
    if (event === "active") {
      var cache = CacheService.getScriptCache();
      if (cache.get("act_" + phoneKey)) return;
      cache.put("act_" + phoneKey, "1", ACTIVITY_THROTTLE_SECONDS);
    }

    // Bir vaqtda kelgan ikki so'rov bitta mijozga ikki qator ochmasligi uchun
    lock = LockService.getScriptLock();
    if (!lock.tryLock(5000)) {
      lock = null;
      return;
    }

    var master = loadAndAggregateMasters().clientsMap[phoneKey];
    var sheet = getActivitySheet();
    var lastRow = sheet.getLastRow();
    var row = -1;
    if (lastRow >= 2) {
      var phones = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < phones.length; i++) {
        if (normalizePhoneKey(phones[i][0]) === phoneKey) {
          row = i + 2;
          break;
        }
      }
    }
    if (row === -1) {
      row = Math.max(lastRow, 1) + 1;
      sheet.getRange(row, 1, 1, ACTIVITY_COL.LOGINS).setValues([[
        formatPhoneUz(phoneKey), "", "", "", "", "", "", "", "", 0
      ]]);
    }

    // Mijoz ma'lumotlari har safar "Ustalar"dan yangilanadi (bo'sh qolgan qatorlar ham to'ladi)
    var statusCell = sheet.getRange(row, ACTIVITY_COL.STATUS);
    if (master) {
      sheet.getRange(row, ACTIVITY_COL.NAME, 1, 3).setValues([[master.name, master.region, master.agent]]);
      statusCell.setValue("Bazada");
    } else if (event === "lead" || statusCell.getValue() === "Anketa to'ldirdi") {
      statusCell.setValue("Anketa to'ldirdi");
    } else {
      statusCell.setValue("Yangi (bazada yo'q)");
    }

    var now = new Date();
    if (tgUser && tgUser.id) sheet.getRange(row, ACTIVITY_COL.TG_ID).setValue(String(tgUser.id));
    if (tgUser && tgUser.username) sheet.getRange(row, ACTIVITY_COL.TG_USER).setValue("@" + tgUser.username);
    if (event === "link") sheet.getRange(row, ACTIVITY_COL.LINKED).setValue(now);
    if (event === "login") {
      sheet.getRange(row, ACTIVITY_COL.LOGIN).setValue(now);
      var loginsCell = sheet.getRange(row, ACTIVITY_COL.LOGINS);
      loginsCell.setValue((Number(loginsCell.getValue()) || 0) + 1);
    }
    sheet.getRange(row, ACTIVITY_COL.ACTIVE).setValue(now);
  } catch (e) {
    Logger.log("recordActivity xatolik: " + e.message);
  } finally {
    if (lock) {
      try { lock.releaseLock(); } catch (lErr) {}
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. O'RNATISH VA SOZLASH FUNKSIYALARI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faqat mavjud "Ustalar" varag'ini tekshiradi va formatlaydi.
 * Hech qanday boshqa varaqlar yaratilmaydi!
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    Logger.log("Faol jadval topilmadi!");
    return;
  }

  var sheet = getMasterSheet(ss);
  if (!sheet) {
    Logger.log("XATO: mijozlar varag'i topilmadi!");
    return;
  }
  if (sheet.getName() !== "Ustalar") {
    Logger.log("OGOHLANTIRISH: 'Ustalar' nomli varaq topilmadi. '" + sheet.getName() + "' varag'i ishlatiladi.");
  }

  var rows = refreshMastersCache();
  Logger.log("Muvaffaqiyatli: '" + sheet.getName() + "' varag'idan " + rows.length + " ta mijoz o'qildi.");

  getActivitySheet();
  getLeadsSheet();
  Logger.log("'" + ACTIVITY_SHEET + "' va '" + LEADS_SHEET + "' varaqlari tayyor.");
}

/**
 * Telegram webhook holatini ko'rsatadi (oxirgi xato, navbatdagi xabarlar soni)
 */
function checkTelegramWebhook() {
  var config = getConfig();
  if (!config.BOT_TOKEN) {
    Logger.log("BOT_TOKEN o'rnatilmagan!");
    return;
  }
  var response = UrlFetchApp.fetch("https://api.telegram.org/bot" + config.BOT_TOKEN + "/getWebhookInfo", { muteHttpExceptions: true });
  Logger.log(response.getContentText().replace(/secret=[^"&]+/g, "secret=***"));
}

/**
 * Telegram Webhook ulash. Web App manziliga ?secret=WEBHOOK_SECRET qo'shiladi —
 * doPost faqat shu sir bilan kelgan Telegram xabarlarini qabul qiladi.
 */
function setTelegramWebhook() {
  var config = getConfig();
  if (!config.BOT_TOKEN) {
    Logger.log("BOT_TOKEN o'rnatilmagan! Script Properties ga BOT_TOKEN ni kiriting.");
    return;
  }
  if (!config.WEBHOOK_SECRET || !/^[A-Za-z0-9_-]{16,}$/.test(config.WEBHOOK_SECRET)) {
    Logger.log("WEBHOOK_SECRET o'rnatilmagan yoki juda qisqa! Script Properties ga kamida 16 belgili (harf, raqam, _ yoki -) maxfiy so'z kiriting.");
    return;
  }
  // ScriptApp.getService().getUrl() ba'zan /dev manzilini qaytaradi — kerak bo'lsa WEBAPP_URL bilan aniq bering
  var webAppUrl = config.WEBAPP_URL || ScriptApp.getService().getUrl();
  if (!webAppUrl || !/\/exec$/.test(webAppUrl)) {
    Logger.log("Web App manzili topilmadi yoki /exec bilan tugamaydi: " + webAppUrl + ". Avval Deploy qiling yoki Script Properties ga WEBAPP_URL kiriting.");
    return;
  }
  var hookUrl = webAppUrl + "?secret=" + encodeURIComponent(config.WEBHOOK_SECRET);
  var url = "https://api.telegram.org/bot" + config.BOT_TOKEN + "/setWebhook?drop_pending_updates=true&url=" + encodeURIComponent(hookUrl);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log("Webhook manzili: " + webAppUrl + "?secret=***");
  Logger.log("Webhook javobi: " + response.getContentText());
}

/**
 * Muddati o'tgan va eski (2.1.0) sessiyalarni o'chiradi. installTriggers uni har kuni ishga tushiradi.
 */
function cleanupSessions() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var now = Date.now();
  var removed = 0;
  Object.keys(all).forEach(function(key) {
    if (key.indexOf("tok_") !== 0) return;
    var parts = String(all[key]).split("|");
    if (parts.length !== 2 || Number(parts[1]) < now) {
      props.deleteProperty(key);
      removed++;
    }
  });
  Logger.log("O'chirilgan sessiyalar: " + removed);
}

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    var handler = trigger.getHandlerFunction();
    if (handler === "cleanupSessions" || handler === "refreshMastersCache") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("cleanupSessions").timeBased().everyDays(1).atHour(4).create();
  // Kesh doim "issiq" turadi — ilova jadvalni o'qishni kutmaydi
  ScriptApp.newTrigger("refreshMastersCache").timeBased().everyMinutes(10).create();
  cleanupSessions();
  refreshMastersCache();
  Logger.log("Triggerlar o'rnatildi: kunlik cleanupSessions, har 10 daqiqada refreshMastersCache.");
}
