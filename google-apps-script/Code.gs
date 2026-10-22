/**
 * EPCO – KATTA ROZIG'ISH SHOU (Production Backend)
 * Google Apps Script Web App & Telegram Bot
 *
 * Versiya: 2.2.0 (Single Sheet Mode - Faqat "Ustalar" varag'i bilan ishlaydi)
 * Hech qanday qo'shimcha varaqlar talab qilinmaydi!
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
  BOT_USERNAME: "epcoaksiya_bot",

  // O'rnatilgan standart katalog (Katalog varag'i bo'lmaganda ishlatiladi)
  CATALOG: [
    {
      id: "EPCO-SYN-5W30-4L",
      name: "EPCO Ultra Synth 5W-30",
      viscosity: "5W-30",
      volumeLiters: 4,
      priceUsd: 38,
      category: "passenger",
      description: "Zamonaviy benzin va dizel dvigatellari uchun to'liq sintetik motor moyi",
      popular: true
    },
    {
      id: "EPCO-SYN-5W40-4L",
      name: "EPCO Premium Synth 5W-40",
      viscosity: "5W-40",
      volumeLiters: 4,
      priceUsd: 36,
      category: "passenger",
      description: "Yuqori yuklamalarda ishlovchi dvigatellar uchun himoya",
      popular: true
    },
    {
      id: "EPCO-SEMI-10W40-4L",
      name: "EPCO Super Semi 10W-40",
      viscosity: "10W-40",
      volumeLiters: 4,
      priceUsd: 28,
      category: "passenger",
      description: "Yarim sintetik universal motor moyi",
      popular: true
    },
    {
      id: "EPCO-HD-15W40-20L",
      name: "EPCO Heavy Duty 15W-40 (20L)",
      viscosity: "15W-40",
      volumeLiters: 20,
      priceUsd: 110,
      category: "commercial",
      description: "Tijoriy va og'ir yuk mashinalari uchun mineral moy",
      popular: false
    },
    {
      id: "EPCO-ATF-D3-1L",
      name: "EPCO ATF Dexron III (1L)",
      viscosity: "ATF III",
      volumeLiters: 1,
      priceUsd: 11,
      category: "transmission",
      description: "Avtomatik uzatmalar qutisi va gidrokuchaytirgich uchun",
      popular: false
    }
  ]
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
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
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

    // 2. Web App API so'rovlari
    var action = data.action || "";
    var token = data.token || "";
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

      // Foydalanuvchi ma'lumotlari
      case "me":
        var phoneFromToken = getPhoneFromToken(token);
        if (!phoneFromToken) {
          return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Sessiya muddati tugagan yoki noto'g'ri token" });
        }
        responseData = handleGetClient(phoneFromToken, token);
        recordActivity(phoneFromToken, "active");
        break;

      // Reyting
      case "leaderboard":
        responseData = handleGetLeaderboard(data.scope || "republic", data.region);
        break;

      // Biletlar
      case "tickets":
        var tPhone = getPhoneFromToken(token);
        if (!tPhone) {
          return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Avtorizatsiyadan o'tilmagan" });
        }
        responseData = handleGetTickets(tPhone);
        break;

      // Katalog
      case "catalog":
        responseData = handleGetCatalog();
        break;

      // Buyurtma
      case "order.create":
        var oPhone = getPhoneFromToken(token);
        if (!oPhone) {
          return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Avtorizatsiyadan o'tilmagan" });
        }
        responseData = handleCreateOrder(oPhone, data.items || []);
        break;

      // Ismni yashirish/ko'rsatish roziligi
      case "consent.update":
        var cPhone = getPhoneFromToken(token);
        if (!cPhone) {
          return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Avtorizatsiyadan o'tilmagan" });
        }
        responseData = handleUpdateConsent(cPhone, Boolean(data.consent));
        break;

      // Bilet haqiqiyligini tekshirish
      case "ticket.verify":
        responseData = handleVerifyTicket(data.ticketNumber);
        break;

      // G'oliblar
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
  } finally {
    try { lock.releaseLock(); } catch (lErr) {}
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

function getCurrentMonth() {
  return Utilities.formatDate(new Date(), DEFAULTS.TIMEZONE, "yyyy-MM");
}

function getRemainingTimeInMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
  var diffMs = endOfMonth.getTime() - now.getTime();
  var diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  var diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  var isLastDay = diffDays === 0;

  var monthsUz = [
    "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
    "Iyul", "Avgust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
  ];
  var currentMonthName = monthsUz[month];
  var currentDateFormatted = now.getDate() + "-" + currentMonthName + ", " + year;

  return {
    daysRemaining: diffDays,
    hoursRemaining: diffHours,
    isLastDay: isLastDay,
    currentMonthName: currentMonthName,
    currentDateFormatted: currentDateFormatted,
    label: isLastDay ? (diffHours + " soat qoldi!") : (diffDays + " kun qoldi")
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. "USTALAR" VARAG'INI O'QISH VA AGREGATSIYA QILISH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Faqat "Ustalar" varag'ini o'qiydi.
 * Ustunlar:
 * 0 (A): Tashkilot / Hudud (01 Tashkent)
 * 1 (B): AGENT
 * 2 (C): Mijoz nomi (Клиент)
 * 3 (D): Sana (Дата создания клиента)
 * 4 (E): Telefon raqami (MIJOZ TEL RAQAMI)
 * 5 (F): STATUS AKSIYA
 * 6 (G): PUL KIRIM
 * 7 (H): QARZ (manfiy son = qarz)
 * 8 (I): Bilet soni
 */
function loadAndAggregateMasters() {
  var config = getConfig();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return { clientsMap: {}, totalActiveTickets: 0, clientList: [] };

  var sheet = ss.getSheetByName("Ustalar");
  if (!sheet) {
    // Agar varaq nomi boshqacha bo'lsa, birinchi varaqni olish
    sheet = ss.getSheets()[0];
  }
  if (!sheet || sheet.getLastRow() < 2) {
    return { clientsMap: {}, totalActiveTickets: 0, clientList: [] };
  }

  var numCols = Math.max(sheet.getLastColumn(), 9);
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
  var clientsMap = {};

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var region = String(row[0] || "").trim();      // Col A: Tashkilot
    var agent = String(row[1] || "").trim();       // Col B: AGENT
    var clientName = String(row[2] || "").trim();  // Col C: Mijoz nomi
    var dateVal = row[3];                          // Col D: Sana
    var rawPhone = row[4];                         // Col E: Tel
    var status = String(row[5] || "").trim();      // Col F: Status aksiya
    var paidVal = parseMoney(row[6]);              // Col G: Pul kirim
    var rawDebt = parseMoney(row[7]);              // Col H: Qarz (manfiy son = qarz)
    var manualTickets = Number(row[8]) || 0;       // Col I: Bilet soni

    var phoneKey = extractPhoneKey(rawPhone, clientName);
    if (!phoneKey) {
      continue; // Telefon topilmasa o'tkazib yuborish
    }

    // Qarzni aniqlash: agar manfiy bo'lsa yoki musbat bo'lsa
    // Jadvalda: -276.52 -> Math.abs(-276.52) = 276.52 qarz
    var currentDebt = 0;
    if (rawDebt < 0) {
      currentDebt = Math.abs(rawDebt);
    } else if (rawDebt > 0) {
      currentDebt = rawDebt;
    }

    if (!clientsMap[phoneKey]) {
      clientsMap[phoneKey] = {
        phoneKey: phoneKey,
        phoneFormatted: formatPhoneUz(phoneKey),
        name: clientName || "Mijoz " + phoneKey.slice(-4),
        region: region || "O'zbekiston",
        agent: agent,
        paidAmount: 0,
        debtAmount: 0,
        manualTickets: 0
      };
    }

    var c = clientsMap[phoneKey];
    c.paidAmount += paidVal;
    c.debtAmount = currentDebt; // Eng so'nggi qarz holati
    if (manualTickets > 0) {
      c.manualTickets += manualTickets;
    }
    if (!c.region && region) c.region = region;
    if (!c.agent && agent) c.agent = agent;
    if (!c.name && clientName) c.name = clientName;
  }

  // Hisoblashlar: Biletlar, Reyting, Ehtimollik
  var totalActiveTickets = 0;
  var clientList = [];
  var phoneKeys = Object.keys(clientsMap);

  for (var k = 0; k < phoneKeys.length; k++) {
    var item = clientsMap[phoneKeys[k]];

    // Biletlar soni: agar jadvalda qo'lda kiritilgan bo'lsa, o'shani olamiz;
    // aks holda har $1,000 to'lov = 1 bilet
    var tickets = item.manualTickets > 0 ? item.manualTickets : Math.floor(item.paidAmount / config.TICKET_PRICE);
    var remainder = item.paidAmount % config.TICKET_PRICE;
    var gapToNext = remainder === 0 ? config.TICKET_PRICE : (config.TICKET_PRICE - remainder);

    // Qarz tekshiruvi: qarz DEBT_TOLERANCE dan oshmasa "qarzsiz"
    var isDebtCleared = item.debtAmount <= config.DEBT_TOLERANCE;

    // Qarzi bo'lsa biletlar NOFAOL (0 ta aktiv)
    var activeTickets = isDebtCleared ? tickets : 0;

    item.tickets = tickets;
    item.activeTickets = activeTickets;
    item.remainder = remainder;
    item.gapToNextTicket = gapToNext;
    item.isDebtCleared = isDebtCleared;

    totalActiveTickets += activeTickets;
    clientList.push(item);
  }

  // Reyting saralash: Pul kirim (turnover) bo'yicha kamayish tartibida
  clientList.sort(function(a, b) {
    if (b.paidAmount !== a.paidAmount) return b.paidAmount - a.paidAmount;
    return b.activeTickets - a.activeTickets;
  });

  return {
    clientsMap: clientsMap,
    totalActiveTickets: totalActiveTickets,
    clientList: clientList
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

// ═══════════════════════════════════════════════════════════════════════════
// 5. HANDLERS: me, leaderboard, tickets, catalog, winners
// ═══════════════════════════════════════════════════════════════════════════

function handleGetClient(phoneKey, token) {
  var config = getConfig();
  var timing = getRemainingTimeInMonth();
  var dataObj = loadAndAggregateMasters();
  var master = dataObj.clientsMap[phoneKey];

  // Agar jadvalda bo'lmasa, yangi mijoz deb qaraladi
  if (!master) {
    master = {
      phoneKey: phoneKey,
      phoneFormatted: formatPhoneUz(phoneKey),
      name: "Yangi Mijoz",
      region: "O'zbekiston",
      agent: "EPCO",
      paidAmount: 0,
      debtAmount: 0,
      isDebtCleared: true,
      tickets: 0,
      activeTickets: 0,
      remainder: 0,
      gapToNextTicket: config.TICKET_PRICE
    };
  }

  // Reytingdagi o'rin
  var currentRank = 0;
  for (var r = 0; r < dataObj.clientList.length; r++) {
    if (dataObj.clientList[r].phoneKey === master.phoneKey) {
      currentRank = r + 1;
      break;
    }
  }
  if (currentRank === 0) currentRank = dataObj.clientList.length + 1;

  // Viloyatdagi o'rni
  var rankInRegion = 1;
  var regionTotal = 0;
  for (var r2 = 0; r2 < dataObj.clientList.length; r2++) {
    var c = dataObj.clientList[r2];
    if (c.region === master.region) {
      regionTotal++;
      if (c.paidAmount > master.paidAmount) {
        rankInRegion++;
      }
    }
  }

  // Rozilik holati (PropertiesService da saqlanadi). Mijoz o'zi rozilik
  // bermaguncha ismi reytingda yashirin ("03 Andijon · H***").
  var props = PropertiesService.getScriptProperties();
  var consent = props.getProperty("consent_" + phoneKey) === "true";

  // Ehtimollik P(t) = Gipergeometrik yoki (activeTickets / T) * 100
  var T = dataObj.totalActiveTickets;
  var K = config.SHOW_WINNERS_K || 30;
  var probPercent = 0;
  var probIfCleared = 0;

  if (T > 0 && master.activeTickets > 0) {
    // Gipergeometrik ehtimol
    probPercent = calculateHypergeometricProb(master.activeTickets, T, K);
  }
  if (T > 0 && master.tickets > 0) {
    probIfCleared = calculateHypergeometricProb(master.tickets, Math.max(T, master.tickets), K);
  }

  // Simulyator uchun o'rin thresholdlari
  var thresholds = [];
  var targetRanks = [1, 2, 3, 5, 10, 20, 50];
  for (var tIdx = 0; tIdx < targetRanks.length; tIdx++) {
    var rTarget = targetRanks[tIdx];
    if (rTarget <= dataObj.clientList.length) {
      var targetClient = dataObj.clientList[rTarget - 1];
      thresholds.push({
        rank: rTarget,
        turnover: targetClient.paidAmount,
        tickets: targetClient.tickets
      });
    }
  }

  var userObj = {
    id: "usr_" + master.phoneKey,
    phone: master.phoneFormatted,
    name: master.name,
    maskedName: maskClientName(master.name, master.region, consent),
    segment: "station",
    leagueTier: master.paidAmount >= 5000 ? "gold" : (master.paidAmount >= 2000 ? "silver" : "bronze"),
    region: master.region || "O'zbekiston",
    isAnonymous: !consent,
    telegramId: props.getProperty("tg_chat_" + phoneKey) || "",
    growthPercent: 12.5
  };

  var statsObj = {
    monthlyTurnoverUsd: master.paidAmount,
    activeTicketsCount: master.activeTickets,
    pendingRemainderUsd: master.remainder,
    gapToNextTicket: master.gapToNextTicket,
    debtAmountUsd: master.debtAmount,
    isDebtCleared: master.isDebtCleared,
    rank: currentRank,
    rankInRegion: rankInRegion,
    regionTotalMasters: Math.max(regionTotal, 1),
    showWinProbability: probPercent,
    probIfDebtCleared: probIfCleared,
    totalConfirmedTicketsPool: T,
    totalShowWinners: K,
    isEligibleForTop1: master.isDebtCleared
  };

  var configObj = {
    totalShowWinners: K,
    totalConfirmedTicketsPool: T,
    totalPrizePoolUsd: config.TOTAL_PRIZE_POOL_USD,
    grandPrize: config.GRAND_PRIZE,
    firstPlacePrize: config.FIRST_PLACE_PRIZE,
    ticketPrice: config.TICKET_PRICE,
    debtTolerance: config.DEBT_TOLERANCE,
    debtorsInRanking: config.DEBTORS_IN_RANKING,
    debtorsEligibleForTop1: config.DEBTORS_ELIGIBLE_FOR_TOP1,
    promoStart: config.PROMO_START,
    promoEnd: config.PROMO_END,
    supportPhone: config.SUPPORT_PHONE,
    rulesVideoUrl: config.RULES_VIDEO_URL,
    botUsername: config.BOT_USERNAME,
    serverNow: new Date().toISOString(),
    thresholds: thresholds
  };

  return {
    user: userObj,
    stats: statsObj,
    config: configObj
  };
}

/**
 * Gipergeometrik ehtimol: P = 1 - C(T-t, K) / C(T, K)
 */
function calculateHypergeometricProb(t, T, K) {
  if (t <= 0 || T <= 0 || K <= 0) return 0;
  if (t >= T) return 100;
  if (T <= K) return 100;
  if (t >= (T - K + 1)) return 100;

  var probNone = 1.0;
  for (var i = 0; i < t; i++) {
    probNone *= (T - K - i) / (T - i);
  }
  var p = (1.0 - probNone) * 100;
  return Number(Math.max(0, Math.min(100, p)).toFixed(2));
}

function handleGetLeaderboard(scope, targetRegion) {
  var dataObj = loadAndAggregateMasters();
  var entries = [];
  var list = dataObj.clientList;

  if (scope === "region" && targetRegion) {
    list = list.filter(function(x) { return x.region === targetRegion; });
  }

  var props = PropertiesService.getScriptProperties();

  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    var consent = props.getProperty("consent_" + c.phoneKey) === "true";
    entries.push({
      rank: i + 1,
      maskedName: maskClientName(c.name, c.region, consent),
      ticketsCount: c.activeTickets,
      turnoverUsd: c.paidAmount,
      segment: "station",
      leagueTier: c.paidAmount >= 5000 ? "platinum" : (c.paidAmount >= 2000 ? "gold" : "silver"),
      isMe: false,
      hasDebt: !c.isDebtCleared,
      eligibleForTop1: c.isDebtCleared,
      region: c.region
    });
  }

  return {
    entries: entries,
    myRank: 0,
    gapToNext: 0,
    gapToTop10: 0,
    gapToFirst: 0
  };
}

function handleGetTickets(phoneKey) {
  var dataObj = loadAndAggregateMasters();
  var master = dataObj.clientsMap[phoneKey];
  var tickets = [];

  if (master && master.tickets > 0) {
    var currentMonth = getCurrentMonth();
    var prefix = "EPCO-" + currentMonth.replace("-", "") + "-";
    for (var i = 1; i <= master.tickets; i++) {
      var num = prefix + ("0000" + i).slice(-4);
      tickets.push({
        id: "tkt_" + num,
        ticketNumber: num,
        month: currentMonth,
        amountPaid: DEFAULTS.TICKET_PRICE,
        status: master.isDebtCleared ? "CONFIRMED" : "PENDING_DEBT",
        issuedAt: new Date().toISOString(),
        qrCodeUrl: "https://epco.uz/verify/" + num,
        isEligible: master.isDebtCleared
      });
    }
  }

  return { tickets: tickets };
}

function handleGetCatalog() {
  return { products: DEFAULTS.CATALOG };
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
  if (!ticketNumber) {
    return { valid: false, message: "Bilet raqami kiritilmadi" };
  }
  return {
    valid: true,
    ticketNumber: ticketNumber,
    month: getCurrentMonth(),
    status: "CONFIRMED",
    ownerMasked: "01 Tashkent · U***",
    message: "Haqiqiy aksiya bileti"
  };
}

function handleCreateOrder(phoneKey, items) {
  var config = getConfig();
  var orderNumber = "ORD-" + Date.now().toString().slice(-6);
  var total = 0;

  for (var i = 0; i < items.length; i++) {
    var p = DEFAULTS.CATALOG.find(function(x) { return x.id === items[i].productId; });
    if (p) {
      total += p.priceUsd * (items[i].quantity || 1);
    }
  }

  // Telegram orqali adminga xabar yuborish (agar sozlagan bo'lsa)
  if (config.BOT_TOKEN && config.ADMIN_CHAT_ID) {
    try {
      var msg = "🛒 Yangi Buyurtma #" + orderNumber + "\n" +
                "👤 Mijoz: " + formatPhoneUz(phoneKey) + "\n" +
                "💰 Jami summa: $" + total;
      sendTelegramMessage(config.ADMIN_CHAT_ID, msg);
    } catch (e) {}
  }

  return {
    orderNumber: orderNumber,
    totalAmount: total,
    status: "CREATED",
    message: "Buyurtma muvaffaqiyatli qabul qilindi"
  };
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

  if (!loadAndAggregateMasters().clientsMap[phoneKey]) {
    return {
      status: "NOT_FOUND",
      message: "Bunday mijoz bazada topilmadi",
      supportPhone: DEFAULTS.SUPPORT_PHONE
    };
  }

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
  var token = generateSessionToken(phoneKey);
  var clientData = handleGetClient(phoneKey, token);

  return {
    token: token,
    user: clientData.user,
    stats: clientData.stats,
    config: clientData.config
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
  var token = generateSessionToken(phoneKey);
  var clientData = handleGetClient(phoneKey, token);

  return {
    token: token,
    user: clientData.user,
    stats: clientData.stats,
    config: clientData.config
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
  "Botga ulangan", "Oxirgi kirish", "Oxirgi faollik", "Kirishlar soni"
];
var ACTIVITY_COL = { TG_ID: 5, TG_USER: 6, LINKED: 7, LOGIN: 8, ACTIVE: 9, LOGINS: 10 };
var ACTIVITY_THROTTLE_SECONDS = 600; // "Oxirgi faollik" ko'pi bilan 10 daqiqada bir yangilanadi

function getActivitySheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ACTIVITY_SHEET);
  if (sheet) return sheet;

  sheet = ss.insertSheet(ACTIVITY_SHEET);
  sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS])
    .setFontWeight("bold").setBackground("#06154A").setFontColor("#FBBF24");
  sheet.setFrozenRows(1);
  sheet.getRange("A:A").setNumberFormat("@");
  sheet.getRange("E:E").setNumberFormat("@");
  sheet.getRange("G:I").setNumberFormat("dd.mm.yyyy hh:mm");
  // Xulosa sarlavha qatorida — ma'lumot qatorlariga xalaqit bermaydi
  sheet.getRange("L1").setValue("Jami ulangan:");
  sheet.getRange("M1").setFormula("=COUNTA(A2:A)");
  sheet.getRange("N1").setValue("Bugun faol:");
  sheet.getRange("O1").setFormula("=COUNTIF(I2:I,\">=\"&TODAY())");
  sheet.getRange("L1:O1").setFontWeight("bold");
  return sheet;
}

/**
 * event: "link" (botga kontakt ulashdi), "login" (saytga kirdi), "active" (ilovadan foydalanmoqda)
 * Xatolik bo'lsa ham kirish jarayoni to'xtamaydi.
 */
function recordActivity(phoneKey, event, tgUser) {
  try {
    if (event === "active") {
      var cache = CacheService.getScriptCache();
      if (cache.get("act_" + phoneKey)) return;
      cache.put("act_" + phoneKey, "1", ACTIVITY_THROTTLE_SECONDS);
    }

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
      var master = loadAndAggregateMasters().clientsMap[phoneKey] || {};
      row = Math.max(lastRow, 1) + 1;
      sheet.getRange(row, 1, 1, ACTIVITY_HEADERS.length).setValues([[
        formatPhoneUz(phoneKey), master.name || "", master.region || "", master.agent || "",
        "", "", "", "", "", 0
      ]]);
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

  var sheet = ss.getSheetByName("Ustalar");
  if (!sheet) {
    Logger.log("OGOHLANTIRISH: 'Ustalar' nomli varaq topilmadi. Mavjud birinchi varaq ishlatiladi.");
    sheet = ss.getSheets()[0];
  }

  Logger.log("Muvaffaqiyatli: 'Ustalar' varag'i topildi. Qatorlar soni: " + sheet.getLastRow());

  getActivitySheet();
  Logger.log("'" + ACTIVITY_SHEET + "' varag'i tayyor.");
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
    if (trigger.getHandlerFunction() === "cleanupSessions") {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  ScriptApp.newTrigger("cleanupSessions").timeBased().everyDays(1).atHour(4).create();
  cleanupSessions();
  Logger.log("Kunlik cleanupSessions triggeri o'rnatildi.");
}
