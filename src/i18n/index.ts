import { Language } from '../types';

export const getStoredLanguage = (): Language => {
  if (typeof window === 'undefined') return 'uz';
  try {
    const saved = localStorage.getItem('epco_app_lang');
    if (saved === 'uz' || saved === 'ru') return saved;
  } catch (e) {
    console.warn('Could not read language from localStorage', e);
  }
  return 'uz';
};

export const setStoredLanguage = (lang: Language): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('epco_app_lang', lang);
  } catch (e) {
    console.warn('Could not save language to localStorage', e);
  }
};

export const translations = {
  uz: {
    appTitle: 'EPCO · Katta Rozig\'ish Shou',
    brandName: 'EPCO',
    shouSubtitle: 'Katta Rozig\'ish Shou',
    demoBanner: 'DEMO REJIM — Haqiqiy ma\'lumotlar emas',
    
    // Top Bar
    soundOn: 'Ovoz yoqiq',
    soundOff: 'Ovoz o\'chiq',
    textSizeToggle: 'Katta harf',
    textSizeNormal: 'Oddiy harf',
    rulesBtn: 'Qoidalar',
    winnersBtn: 'G\'oliblar',
    ticketsBtn: 'Biletlarim',
    logoutBtn: 'Chiqish',
    profileBtn: 'Profil',

    // Tabs
    tabHome: 'Bosh sahifa',
    tabLeaderboard: 'Reyting',
    tabStore: 'Do\'kon',

    // Profile Menu
    profileTitle: 'Mijoz Profili',
    profilePhone: 'Telefon raqam',
    profileRegion: 'Hudud',
    profileConsent: 'Reytingda ismni to\'liq ko\'rsatish',
    profileConsentNote: 'Yoqilsa reytingda ismingiz to\'liq ko\'rinadi, o\'chirilsa niqoblanadi.',
    profileLogoutConfirm: 'Tizimdan chiqishni tasdiqlaysizmi?',

    // Home / Hero
    currentMonthTickets: 'Shu oylik biletlar',
    oilFlaskLevel: 'Moy sathi',
    monthlyResetNotice: 'Biletlar va qoldiqlar har oy boshida yangilanadi',
    confirmedPurchases: 'Tasdiqlangan to\'lov',
    pendingPurchases: 'Kutilayotgan zakaz',
    gapToNextTicket: 'Keyingi biletga yetmayapti',
    monthEndWarningTitle: 'Qoldiq kuyishi xavfi!',
    monthEndWarningText: 'yig\'ilgan qoldiq oy oxirida bekor bo\'ladi. Yana ozgina qo\'shib biletga aylantiring!',
    daysLeftInMonth: 'Oy yakuniga',
    daysUnit: 'kun qoldi',
    pendingNotice: 'Diqqat: Kutilayotgan zakazlar menejer tomonidan tasdiqlanmaguncha biletga hisoblanmaydi.',
    
    // Probability Card (4 views)
    probTitle: 'Jonli shouga taklif qilinish ehtimoli',
    probSubtitle: '30 nafar ishtirokchi jonli shouga taklif qilinadi',
    probView1Label: '1. Oylik aniq ehtimol',
    probView2Label: '2. Ishtirokchilar solishtirmasi',
    probView2Text: 'o\'rtacha ishtirokchidan',
    probView2Suffix: 'barobar yuqori',
    probView3Label: '3. Yana 1 bilet sakrashi',
    probView3Text: 'Yana bitta bilet bilan',
    probView3JumpTo: 'gacha oshadi',
    probView4Label: '4. 4 oylik sur\'at prognozi',
    probView4Text: 'Shu sur\'atda 4 oyda kamida bir marta shouga chiqish ehtimoli',

    // Grand Prize Chevrolet DAMAS
    iphoneTitle: 'Bosh Sovrin: Chevrolet DAMAS!',
    iphoneDesc: 'Jonli efir shousida barcha bilet egalari o\'rtasida o\'ynaladi!',
    iphoneGapText: 'Keyingi biletga yetmayotgan summa:',

    // Simulator
    simTitle: 'Aksiya Simulyatori',
    simSubtitle: 'Qo\'shimcha to\'lov qilsangiz nima bo\'ladi? Real vaqtda ko\'ring:',
    simSliderLabel: 'Qo\'shimcha to\'lov summasi:',
    simNewTickets: 'Yangi biletlar soni',
    simNewProb: 'Yangi ehtimol',
    simEstRank: 'Taxminiy o\'rin',
    simLeapNotice: 'pog\'onaga ko\'tarilasiz!',
    simAddToCart: 'Savatga olish',

    // Leaderboard
    leaderboardTitle: 'Oylik Reyting',
    scopeLeague: 'O\'z ligam',
    scopeRegion: 'Viloyat',
    scopeRepublic: 'Respublika',
    scopeGrowth: 'O\'sish ligasi',
    yourCurrentRank: 'Sizning o\'rningiz',
    gapToNextRank: 'Bir pog\'ona yuqoriga',
    gapToTop10: 'Top-10 ga chiqish uchun',
    gapToFirst: '1-o\'ringa chiqish uchun',
    neededSum: 'yetmayapti',
    privacyNote: 'Shaffoflik qoidasi: boshqa mijozlar summasi ko\'rsatilmaydi, faqat niqoblangan ismlar va o\'rinlar.',
    anonymousUser: 'Yashirin ishtirokchi',
    myPositionBadge: 'Siz',

    // Store & Cart
    storeTitle: 'EPCO Mahsulotlar Javoni',
    storeSubtitle: 'Rasmni ushlab savatga tashlang yoki «+» tugmasini bosing',
    catAll: 'Barchasi',
    catOils: 'Motor moylari',
    catFilters: 'Filtrlar',
    catAntifreeze: 'Antifriz',
    catTransmission: 'Transmissiya',
    catSpecial: 'Maxsus suyuqliklar',
    addToCart: 'Qo\'shish',
    dropZoneLabel: 'Rasmni bu yerga tashlang!',
    cartBarTitle: 'Savatda',
    cartItemsCount: 'ta mahsulot',
    cartTotal: 'Jami',
    ticketsFromCart: 'Kutilayotgan biletlar',
    smartUpsellPrefix: 'Aqlli taklif: Yana',
    smartUpsellSuffix: 'qo\'shsangiz +1 yangi bilet olasiz!',
    checkoutBtn: 'Zakaz berish',
    cartEmpty: 'Savatingiz bo\'sh. Mahsulotlarni tanlang!',
    orderPlacedSuccess: 'Zakaz qabul qilindi!',
    orderPlacedMessage: 'Zakazingiz menejerga yuborildi. Yetkazib berilib to\'langach, biletlar hisobingizga qo\'shiladi.',
    closeBtn: 'Yopish',
    confirmOrder: 'Buyurtmani tasdiqlash',

    // Trust & Rules & Winners
    trustTitle: 'Ishonch va Shaffoflik',
    trustSubtitle: 'EPCO rasmiy distribyutori kafolati bilan',
    prizesInfo: 'Jami sovg\'a fondi $15 000, bosh sovg\'a Chevrolet DAMAS!',
    supportContact: 'Menejer bilan aloqa:',
    pastWinnersTitle: 'Oldingi g\'oliblar devori',
    ticketNumber: 'Bilet №',
    ticketDate: 'Berilgan sana',
    ticketStatusValid: 'Faol',
    ticketStatusInvited: 'Shouga taklif etildi',
    verifyQR: 'QR orqali tekshirish',

    // Login
    loginTitle: 'Xush kelibsiz!',
    loginSubtitle: 'EPCO mijozlari uchun "Katta Rozig\'ish Shou" mobil portali',
    phoneLabel: 'Telefon raqamingiz:',
    loginBtn: 'Tizimga kirish',
    loginHelper: 'Bazada mavjud telefon raqamingizni kiriting',
    skipIntro: 'O\'tkazib yuborish',
    welcomeVideoTitle: '30 soniyada aksiya qoidalari',
    privacyConsent: 'Reytingda ismim ko\'rinishiga roziman',

    // PWA Install
    installApp: 'Ilovani o\'rnatish',
    installIOSGuide: 'iPhone uchun: Pastdagi "Ulashish" (Share) tugmasini bosing va "Ekranga qo\'shish" (Add to Home Screen) bandini tanlang.',

    // Mascot
    mascotName: 'Usta Moy',
    mascotHint1: 'Sliderni suring, do\'stim! Nima bo\'lishini ko\'rasiz 😉',
    mascotHint2: 'Rasmni ushlab savatga tashlab ko\'ring, juda qulay!',
    mascotHint3: 'Yana bitta bilet olsa, yutuq ehtimoli deyarli 2 barobar oshadi!',
    mascotHint4: 'Oy oxirida qoldiq summalaringiz kuyib ketmasin, tekshiring!',
    mascotHint5: '1-o\'ringa ozgina yetmayapti, harakat qilsak peshqadamlik sizniki bo\'ladi!',
  },
  ru: {
    appTitle: 'EPCO · Шоу Большого Розыгрыша',
    brandName: 'EPCO',
    shouSubtitle: 'Шоу Большого Розыгрыша',
    demoBanner: 'ДЕМО РЕЖИМ — Не реальные данные',
    
    // Top Bar
    soundOn: 'Звук вкл',
    soundOff: 'Звук выкл',
    textSizeToggle: 'Крупный шрифт',
    textSizeNormal: 'Обычный шрифт',
    rulesBtn: 'Правила',
    winnersBtn: 'Победители',
    ticketsBtn: 'Мои билеты',
    logoutBtn: 'Выход',
    profileBtn: 'Профиль',

    // Tabs
    tabHome: 'Главная',
    tabLeaderboard: 'Рейтинг',
    tabStore: 'Магазин',

    // Profile Menu
    profileTitle: 'Профиль мастера',
    profilePhone: 'Номер телефона',
    profileRegion: 'Регион',
    profileConsent: 'Показывать имя в рейтинге',
    profileConsentNote: 'Если включено, в рейтинге отображается имя, иначе оно маскируется.',
    profileLogoutConfirm: 'Вы действительно хотите выйти?',

    // Home / Hero
    currentMonthTickets: 'Билеты за этот месяц',
    oilFlaskLevel: 'Уровень масла',
    monthlyResetNotice: 'Билеты и остатки обновляются каждый месяц с нуля',
    confirmedPurchases: 'Подтвержденная оплата',
    pendingPurchases: 'В ожидании доставки',
    gapToNextTicket: 'До следующего билета не хватает',
    monthEndWarningTitle: 'Сгорание остатка в конце месяца!',
    monthEndWarningText: 'накопленного остатка сгорит 1-го числа. Добавьте заказ и заберите билет!',
    daysLeftInMonth: 'До конца месяца',
    daysUnit: 'дн.',
    pendingNotice: 'Заказы в ожидании не начисляют билеты до подтверждения и доставки менеджером.',
    
    // Probability Card
    probTitle: 'Вероятность приглашения на живое шоу',
    probSubtitle: '30 участников попадут на грандиозное живое шоу',
    probView1Label: '1. Вероятность в процентах',
    probView2Label: '2. Сравнение со средним',
    probView2Text: 'в',
    probView2Suffix: 'раза выше среднего участника',
    probView3Label: '3. Скачок при +1 билете',
    probView3Text: 'Еще один билет увеличит шанс до',
    probView3JumpTo: 'прирост',
    probView4Label: '4. Прогноз на 4 месяца',
    probView4Text: 'При таком темпе вероятность выиграть хотя бы раз за 4 месяца',

    // Grand Prize DAMAS
    iphoneTitle: 'Главный приз: Chevrolet DAMAS!',
    iphoneDesc: 'Разыгрывается среди всех билетов в прямом эфире шоу!',
    iphoneGapText: 'Сумма до следующего билета:',

    // Simulator
    simTitle: 'Симулятор Розыгрыша',
    simSubtitle: 'Что изменится при дозаказе? Смотрите в реальном времени:',
    simSliderLabel: 'Сумма дополнительной оплаты:',
    simNewTickets: 'Новое кол-во билетов',
    simNewProb: 'Новый шанс',
    simEstRank: 'Прогноз позиции',
    simLeapNotice: 'позиций вверх!',
    simAddToCart: 'В корзину',

    // Leaderboard
    leaderboardTitle: 'Ежемесячный Рейтинг',
    scopeLeague: 'Моя лига',
    scopeRegion: 'Регион',
    scopeRepublic: 'Республика',
    scopeGrowth: 'Лига роста',
    yourCurrentRank: 'Ваше место',
    gapToNextRank: 'До ступени выше',
    gapToTop10: 'Для входа в Топ-10',
    gapToFirst: 'До 1-го места',
    neededSum: 'не хватает',
    privacyNote: 'Конфиденциальность: суммы других участников не отображаются, только маскированные имена и места.',
    anonymousUser: 'Скрытый участник',
    myPositionBadge: 'Вы',

    // Store & Cart
    storeTitle: 'Каталог масел и фильтров EPCO',
    storeSubtitle: 'Перетащите товар в корзину или нажмите «+»',
    catAll: 'Все',
    catOils: 'Моторные масла',
    catFilters: 'Фильтры',
    catAntifreeze: 'Антифриз',
    catTransmission: 'Трансмиссия',
    catSpecial: 'Спецжидкости',
    addToCart: 'В корзину',
    dropZoneLabel: 'Перетащите сюда для добавления!',
    cartBarTitle: 'В корзине',
    cartItemsCount: 'товаров',
    cartTotal: 'Итого',
    ticketsFromCart: 'Ожидаемые билеты',
    smartUpsellPrefix: 'Умный совет: Добавьте еще',
    smartUpsellSuffix: 'и получите +1 лото-билет!',
    checkoutBtn: 'Оформить заказ',
    cartEmpty: 'Корзина пуста. Выберите нужные товары!',
    orderPlacedSuccess: 'Заказ отправлен менеджеру!',
    orderPlacedMessage: 'Ваш заказ принят. Билеты будут начислены сразу после доставки и подтверждения оплаты.',
    closeBtn: 'Закрыть',
    confirmOrder: 'Подтвердить заказ',

    // Trust & Rules & Winners
    trustTitle: 'Доверие и Прозрачность',
    trustSubtitle: 'Официальный дистрибьютор моторных масел EPCO',
    prizesInfo: 'Общий призовой фонд $15 000, главный приз автомобиль Chevrolet DAMAS!',
    supportContact: 'Связь с вашим менеджером:',
    pastWinnersTitle: 'Стена победителей прошлых этапов',
    ticketNumber: 'Билет №',
    ticketDate: 'Дата выдачи',
    ticketStatusValid: 'Активен',
    ticketStatusInvited: 'Приглашен на шоу',
    verifyQR: 'Проверить подлинность QR',

    // Login
    loginTitle: 'Добро пожаловать!',
    loginSubtitle: 'Мобильный портал клиентов EPCO: Шоу Большого Розыгрыша',
    phoneLabel: 'Номер телефона:',
    loginBtn: 'Войти в кабинет',
    loginHelper: 'Введите номер, зарегистрированный у менеджера',
    skipIntro: 'Пропустить',
    welcomeVideoTitle: 'Правила розыгрыша за 30 секунд',
    privacyConsent: 'Согласен отображать имя в рейтинге',

    // PWA Install
    installApp: 'Установить приложение',
    installIOSGuide: 'Для iPhone: Нажмите кнопку "Поделиться" (Share) внизу экрана и выберите "На экран «Домой»".',

    // Mascot
    mascotName: 'Уста Мой',
    mascotHint1: 'Подвиньте слайдер, друг мой! Посмотрите расчеты 😉',
    mascotHint2: 'Попробуйте перетащить банку прямо в корзину!',
    mascotHint3: 'Еще один билет удвоит ваш шанс на попадание в эфир шоу!',
    mascotHint4: 'Не дайте остатку сгореть в конце месяца!',
    mascotHint5: 'Вы очень близки к лидерству в рейтинге!',
  },
};
