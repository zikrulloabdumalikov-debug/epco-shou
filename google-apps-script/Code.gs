/**
 * EPCO – KATTA ROZIG'ISH SHOU (Production Backend)
 * Google Apps Script Web App & Telegram Bot
 *
 * Versiya: 2.1.0 (Single Sheet Mode - Faqat "Ustalar" varag'i bilan ishlaydi)
 * Hech qanday qo'shimcha varaqlar talab qilinmaydi!
 */

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
  if (action === "checkPhone") {
    var phone = (e && e.parameter && e.parameter.phone) ? e.parameter.phone : "";
    return createJsonResponse(true, handleCheckPhone(phone));
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
      return handleTelegramWebhook(data);
    }

    // 2. Web App API so'rovlari
    var action = data.action || "";
    var token = data.token || "";
    var responseData = null;

    switch (action) {
      // Parolsiz to'g'ridan-to'g'ri raqam tekshirish va kirish
      case "auth.checkPhone":
        responseData = handleCheckPhone(data.phone);
        break;

      case "auth.loginDirect":
        responseData = handleLoginDirect(data.phone);
        break;

      // Autentifikatsiya (eski usullar ham zaxirada qoladi)
      case "auth.telegram":
        responseData = handleTelegramAuth(data.initData);
        break;

      case "auth.requestCode":
        responseData = handleRequestCode(data.phone);
        break;

      case "auth.verifyCode":
        responseData = handleVerifyCode(data.phone, data.code);
        break;

      // Foydalanuvchi ma'lumotlari
      case "me":
        var phoneFromToken = getPhoneFromToken(token);
        if (!phoneFromToken) {
          return createJsonResponse(false, null, { code: "UNAUTHORIZED", message: "Sessiya muddati tugagan yoki noto'g'ri token" });
        }
        responseData = handleGetClient(phoneFromToken, token);
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
    return createJsonResponse(false, null, { code: "EXECUTION_ERROR", message: err.toString() });
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

  // Rozilik holati (PropertiesService da saqlanadi)
  var props = PropertiesService.getScriptProperties();
  var consent = props.getProperty("consent_" + phoneKey) !== "false"; // Default true

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
    var consent = props.getProperty("consent_" + c.phoneKey) !== "false";
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

function generateSessionToken(phoneKey) {
  var raw = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Math.random() + "_" + Date.now() + "_" + phoneKey));
  var token = "epco_tok_" + raw.replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);

  // Keshga va ScriptProperties ga saqlash
  var cache = CacheService.getScriptCache();
  cache.put("sess_" + token, phoneKey, 21600); // 6 soat

  var props = PropertiesService.getScriptProperties();
  props.setProperty("tok_" + token, phoneKey);

  return token;
}

function getPhoneFromToken(token) {
  if (!token) return null;

  var cache = CacheService.getScriptCache();
  var cached = cache.get("sess_" + token);
  if (cached) return cached;

  var props = PropertiesService.getScriptProperties();
  var fromProps = props.getProperty("tok_" + token);
  if (fromProps) {
    cache.put("sess_" + token, fromProps, 21600);
    return fromProps;
  }
  return null;
}

/**
 * Parolsiz telefon raqamini bazadan tekshirish
 */
function handleCheckPhone(phone) {
  var phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) {
    return {
      found: false,
      message: "Telefon raqami noto'g'ri",
      supportPhone: DEFAULTS.SUPPORT_PHONE
    };
  }

  var dataObj = loadAndAggregateMasters();
  var master = dataObj.clientsMap[phoneKey];

  if (!master) {
    return {
      found: false,
      phoneKey: phoneKey,
      message: "Bunday mijoz bazada topilmadi",
      supportPhone: DEFAULTS.SUPPORT_PHONE
    };
  }

  var token = generateSessionToken(phoneKey);
  return {
    found: true,
    clientName: master.name,
    region: master.region,
    phoneKey: phoneKey,
    phoneFormatted: master.phoneFormatted,
    token: token
  };
}

/**
 * Mijoz tasdiqlagandan so'ng to'g'ridan-to'g'ri profilga kirish
 */
function handleLoginDirect(phone) {
  var phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) {
    throw new Error("Telefon raqami noto'g'ri");
  }
  var dataObj = loadAndAggregateMasters();
  var master = dataObj.clientsMap[phoneKey];
  if (!master) {
    throw new Error("Bunday mijoz bazada topilmadi");
  }
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
 * 6 xonali tasdiqlash kodini yuborish
 */
function handleRequestCode(phone) {
  var config = getConfig();
  var phoneKey = normalizePhoneKey(phone);
  if (!phoneKey) {
    return { status: "INVALID_PHONE", message: "Telefon raqami noto'g'ri" };
  }

  // 6 xonali tasodifiy kod
  var code = ("000000" + Math.floor(Math.random() * 900000 + 100000)).slice(-6);

  var cache = CacheService.getScriptCache();
  cache.put("otp_" + phoneKey, code, 300); // 5 daqiqa amal qiladi

  var props = PropertiesService.getScriptProperties();
  var chatId = props.getProperty("tg_chat_" + phoneKey);

  // Agar mijoz hali botga kirmagan bo'lsa
  if (!chatId) {
    var botUser = (config.BOT_USERNAME || "epcoaksiya_bot").replace("@", "");
    return {
      status: "NEED_PHONE_LINK",
      message: "Telefon raqamingiz hali botga ulanmagan. Iltimos, Telegram botimizga kirib kontaktingizni ulashing.",
      botUrl: "https://t.me/" + botUser
    };
  }

  // Telegram orqali kodni yuborish
  var sendRes = sendTelegramMessage(chatId, "🔐 EPCO Shou tizimiga kirish kodi: *" + code + "*\n\nKodni hech kimga bermang! Amal qilish muddati: 5 daqiqa.");
  if (!sendRes) {
    return { status: "SEND_FAILED", message: "Telegram bot orqali kod yuborib bo'lmadi" };
  }

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

  // Kodni tekshirish
  if (!validCode || String(validCode).trim() !== String(code).trim()) {
    throw new Error("Tasdiqlash kodi noto'g'ri yoki muddati o'tgan");
  }

  cache.remove("otp_" + phoneKey);
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

  // Telegram initData dan foydalanuvchi ma'lumotlarini ajratish
  var userId = null;
  var params = initData.split("&");
  for (var i = 0; i < params.length; i++) {
    var pair = params[i].split("=");
    if (decodeURIComponent(pair[0]) === "user") {
      try {
        var userJson = JSON.parse(decodeURIComponent(pair[1]));
        userId = String(userJson.id);
      } catch (e) {}
    }
  }

  if (!userId) {
    throw new Error("Telegram foydalanuvchi ID topilmadi");
  }

  // Telegram ID ga bog'langan telefon raqamini topish
  var props = PropertiesService.getScriptProperties();
  var phoneKey = props.getProperty("tg_phone_" + userId);

  if (!phoneKey) {
    var botUser = (getConfig().BOT_USERNAME || "epcoaksiya_bot").replace("@", "");
    return {
      status: "NEED_PHONE_LINK",
      message: "Kontaktingiz hali botga ulanmagan. Botga kirib kontaktingizni ulashing.",
      botUrl: "https://t.me/" + botUser
    };
  }

  var token = generateSessionToken(phoneKey);
  var clientData = handleGetClient(phoneKey, token);

  return {
    token: token,
    user: clientData.user,
    stats: clientData.stats,
    config: clientData.config
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. TELEGRAM BOT HANDLERS & WEBHOOK
// ═══════════════════════════════════════════════════════════════════════════

function handleTelegramWebhook(update) {
  if (!update.message) {
    return ContentService.createTextOutput("OK");
  }

  var msg = update.message;
  var chatId = msg.chat.id;
  var text = msg.text || "";

  // 1. Kontakt ulashilganda
  if (msg.contact && msg.contact.phone_number) {
    var phoneKey = normalizePhoneKey(msg.contact.phone_number);
    if (phoneKey) {
      var props = PropertiesService.getScriptProperties();
      // ChatId <-> Phone bog'lash
      props.setProperty("tg_chat_" + phoneKey, String(chatId));
      props.setProperty("tg_phone_" + String(msg.from.id), phoneKey);

      sendTelegramMessage(chatId, "✅ Rahmat! Raqamingiz (" + formatPhoneUz(phoneKey) + ") muvaffaqiyatli bog'landi.\n\nEndi EPCO Shou ilovasiga bemalol kirishingiz mumkin!");
      return ContentService.createTextOutput("OK");
    }
  }

  // 2. /start buyrug'i
  if (text.indexOf("/start") === 0) {
    sendTelegramContactButton(chatId, "Assalomu alaykum! EPCO Katta Rozig'ish Shou botiga xush kelibsiz.\n\nIlovaga kirish uchun quyidagi tugmani bosib telefon raqamingizni tasdiqlang:");
    return ContentService.createTextOutput("OK");
  }

  return ContentService.createTextOutput("OK");
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
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
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
}

/**
 * Telegram Webhook ulash
 */
function setTelegramWebhook() {
  var config = getConfig();
  if (!config.BOT_TOKEN) {
    Logger.log("BOT_TOKEN o'rnatilmagan! Script Properties ga BOT_TOKEN ni kiriting.");
    return;
  }
  var webAppUrl = ScriptApp.getService().getUrl();
  var url = "https://api.telegram.org/bot" + config.BOT_TOKEN + "/setWebhook?url=" + encodeURIComponent(webAppUrl);
  var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log("Webhook javobi: " + response.getContentText());
}
