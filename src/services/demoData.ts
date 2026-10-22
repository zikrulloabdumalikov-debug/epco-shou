import {
  User,
  PromoConfig,
  ClientStats,
  Product,
  LeaderboardEntry,
  Ticket,
  PastWinner
} from '../types';

export const isDemoMode = (): boolean => {
  return (import.meta as any).env?.VITE_DEMO === 'true';
};

export const DEMO_USER: User = {
  id: 'demo_user_1',
  phone: '+998 90 000 00 01',
  name: 'Demo Usta 1',
  maskedName: '01 Toshkent · D***',
  segment: 'station',
  leagueTier: 'gold',
  region: '01 Toshkent',
  isAnonymous: false,
  telegramId: 'demo_usta_1',
  growthPercent: 18.5,
};

export const DEMO_CONFIG: PromoConfig = {
  totalShowWinners: 30,
  totalConfirmedTicketsPool: 45,
  grandPrize: 'Chevrolet DAMAS',
  prizesText: "Har oy: 15 000$ lik sovg'alar va pul mukofotlari",
  prizesTextRu: 'Каждый месяц: подарки и денежные призы на 15 000$',
  liveUrl: '',
  prizeScope: 'republic',
  startDate: '2026-10-01',
  endDate: '2026-12-31',
  currentMonthName: 'Oktyabr 2026',
  daysRemainingInMonth: 10,
  rulesVideoUrl: 'https://youtube.com',
  supportPhone: '+998 90 556 90 60',
  googleAppsScriptUrl: '',
  isGoogleSheetsConnected: true,
  serverNow: new Date().toISOString(),
  thresholds: [
    { rank: 1, minAmount: 10000, label: '1-o\'rin' },
    { rank: 3, minAmount: 6000, label: 'Top 3 (Sovg\'alar fondi)' },
    { rank: 10, minAmount: 3500, label: 'Top 10 (Jonli shou zaxirasi)' },
    { rank: 20, minAmount: 1500, label: 'Top 20' }
  ]
};

export const DEMO_STATS: ClientStats = {
  confirmedAmount: 3200,
  paidAmount: 3200,
  debtAmount: 0,
  isDebtCleared: true,
  activeTicketsCount: 3,
  pendingDebtTicketsCount: 0,
  pendingAmount: 0,
  returnedAmount: 0,
  tickets: 3,
  gapToNextTicket: 800,
  currentMonthRemainder: 200,
  currentRank: 3,
  totalParticipants: 25,
  activeParticipants: 20,
  daysRemainingInMonth: 10,
  hoursRemainingInMonth: 240,
  isMonthEndWarning: false,
  isLastDayOfMonth: false,
  timeRemainingLabel: '10 kun qoldi',
  currentDateFormatted: '21.10.2026',
  probPercent: 92.4,
  probRelativeRatio: 2.1,
  probNextJump: {
    newProb: 95.6,
    relativeMultiplier: 1.03,
    absolutePointDelta: 3.2,
  },
  probFourMonthStreak: 99.8,
  probIfDebtCleared: 92.4,
  gapToNextRank: 400,
  gapToTop10: 0,
  gapToFirstPlace: 6800,
};

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 'demo_lead_1',
    rank: 1,
    maskedName: '01 Toshkent · D*** (Demo Usta 2)',
    segment: 'station',
    region: '01 Toshkent',
    tickets: 10,
    isDebtCleared: true,
    growthPercent: 24,
    isMe: false,
  },
  {
    id: 'demo_lead_2',
    rank: 2,
    maskedName: '05 Samarqand · D*** (Demo Usta 3)',
    segment: 'autostore',
    region: '05 Samarqand',
    tickets: 6,
    isDebtCleared: true,
    growthPercent: 12,
    isMe: false,
  },
  {
    id: 'demo_lead_3',
    rank: 3,
    maskedName: 'Demo Usta 1',
    segment: 'station',
    region: '01 Toshkent',
    tickets: 3,
    paidAmount: 3200,
    debtAmount: 0,
    isDebtCleared: true,
    growthPercent: 18,
    isMe: true,
  },
  {
    id: 'demo_lead_4',
    rank: 4,
    maskedName: '03 Andijon · D*** (Demo Usta 4)',
    segment: 'station',
    region: '03 Andijon',
    tickets: 2,
    isDebtCleared: true,
    growthPercent: 5,
    isMe: false,
  },
  {
    id: 'demo_lead_5',
    rank: 5,
    maskedName: '04 Namangan · D*** (Demo Usta 5)',
    segment: 'mechanic',
    region: '04 Namangan',
    tickets: 2,
    isDebtCleared: true,
    growthPercent: 0,
    isMe: false,
  },
];

export const DEMO_TICKETS: Ticket[] = [
  {
    id: 'tkt_demo_1',
    ticketNumber: 'EPCO-2610-0001',
    orderId: 'ord_demo_1',
    dateIssued: '2026-10-05',
    qrCodeUrl: '/verify/EPCO-2610-0001',
    status: 'valid',
    isDebtCleared: true,
  },
  {
    id: 'tkt_demo_2',
    ticketNumber: 'EPCO-2610-0002',
    orderId: 'ord_demo_2',
    dateIssued: '2026-10-12',
    qrCodeUrl: '/verify/EPCO-2610-0002',
    status: 'valid',
    isDebtCleared: true,
  },
  {
    id: 'tkt_demo_3',
    ticketNumber: 'EPCO-2610-0003',
    orderId: 'ord_demo_3',
    dateIssued: '2026-10-18',
    qrCodeUrl: '/verify/EPCO-2610-0003',
    status: 'valid',
    isDebtCleared: true,
  },
];

export const DEMO_CATALOG: Product[] = [
  {
    id: 'demo_epco_5w40',
    name: 'EPCO Ultra Synt 5W-40 (Karton: 4x4L)',
    brand: 'EPCO',
    category: 'oils',
    price: 175,
    stock: 50,
    volume: '16L',
    description: 'To\'liq sintetik yuqori sifatli motor moyi'
  },
  {
    id: 'demo_epco_10w40',
    name: 'EPCO Super Extra 10W-40 (Karton: 4x4L)',
    brand: 'EPCO',
    category: 'oils',
    price: 145,
    stock: 65,
    volume: '16L',
    description: 'Universal yarim sintetik motor moyi'
  },
  {
    id: 'demo_filters',
    name: 'Moy Filtrlar To\'plami (20 dona)',
    brand: 'EPCO',
    category: 'filters',
    price: 60,
    stock: 100,
    volume: '20 dona',
    description: 'Damas va yengil avtomobillar uchun filtrlar to\'plami'
  },
  {
    id: 'demo_antifreeze',
    name: 'EPCO Antifreeze G12+ Red (20L)',
    brand: 'EPCO',
    category: 'antifreeze',
    price: 55,
    stock: 40,
    volume: '20L',
    description: 'Uzoq muddatli korroziyaga qarshi sovitish suyuqligi'
  }
];

export const DEMO_WINNERS: PastWinner[] = [];
