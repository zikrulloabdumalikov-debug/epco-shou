export type Language = 'uz' | 'ru';

export type UserSegment = 'mechanic' | 'station' | 'autostore';
export type LeagueTier = 'bronze' | 'silver' | 'gold';
export type PrizeScope = 'league' | 'region' | 'republic' | 'growth';

export interface User {
  id: string;
  phone: string;
  name: string;
  maskedName: string;
  segment: UserSegment;
  leagueTier: LeagueTier;
  region: string;
  isAnonymous: boolean;
  telegramId?: string;
  avatar?: string;
  growthPercent: number;
}

export interface PromoConfig {
  totalShowWinners: number; // K = 30
  totalConfirmedTicketsPool: number; // T (e.g. 6000)
  totalPrizePoolUsd?: number;
  grandPrize: string; // "Chevrolet DAMAS"
  prizesText?: string; // admin paneldan: boshqa sovg'alar tavsifi
  prizesTextRu?: string;
  liveUrl?: string; // admin paneldan: jonli efir / video (YouTube)
  firstPlacePrize?: string;
  prizeScope: 'league' | 'region' | 'republic';
  startDate: string;
  endDate: string;
  currentMonthName: string;
  daysRemainingInMonth: number;
  hoursRemainingInMonth?: number;
  isLastDayOfMonth?: boolean;
  timeRemainingLabel?: string;
  currentDateFormatted?: string;
  rulesVideoUrl: string;
  supportPhone: string;
  googleAppsScriptUrl?: string;
  isGoogleSheetsConnected?: boolean;
  lastGoogleSheetSync?: string;
  serverNow?: string;
  thresholds?: { rank: number; minAmount: number; label?: string }[];
}

export interface ClientStats {
  confirmedAmount: number; // e.g. 4650 (pul berilgan summa)
  paidAmount: number; // e.g. 4650
  debtAmount: number; // e.g. 0 or 450 (qarz summasi)
  isDebtCleared: boolean; // debtAmount <= 0 bo'lsa true (barcha biletlar AKTUAL)
  activeTicketsCount: number; // qarz 0 bo'lsa barcha biletlar faol
  pendingDebtTicketsCount: number; // qarz mavjud bo'lsa kutilayotgan biletlar
  pendingAmount: number; // e.g. 0
  returnedAmount: number;
  tickets: number; // floor(confirmedAmount / 1000)
  gapToNextTicket: number; // 1000 - (confirmedAmount % 1000)
  currentMonthRemainder: number; // confirmedAmount % 1000
  currentRank: number; // e.g. 14
  totalParticipants: number; // e.g. 1240
  activeParticipants: number; // e.g. 850
  daysRemainingInMonth: number; // calculated from real date
  hoursRemainingInMonth: number; // calculated from real date
  isMonthEndWarning: boolean; // daysRemainingInMonth <= 7 or last day
  isLastDayOfMonth: boolean; // true if today is last day of month
  timeRemainingLabel: string; // human readable countdown
  currentDateFormatted: string; // e.g. "30-Sentyabr, 2026"
  probPercent: number; // P(t) as percentage (e.g. 0.50)
  probRelativeRatio: number; // e.g. 1.25x compared to average participant
  probNextJump: {
    newProb: number;
    relativeMultiplier: number;
    absolutePointDelta: number;
  };
  probFourMonthStreak: number; // 1 - (1 - P(t))^4 in percentage
  probIfDebtCleared?: number;
  gapToNextRank: number;
  gapToTop10: number;
  gapToFirstPlace: number;
  regionRank?: number; // viloyatdagi o'rin
  regionTotal?: number; // viloyatdagi ishtirokchilar soni
}

/** Ilova ochilganda bitta so'rov bilan keladigan ma'lumotlar (Apps Script "bootstrap") */
export type BootstrapData =
  | {
      registered: true;
      isAdmin?: boolean;
      user: User;
      stats: ClientStats;
      config: PromoConfig;
      leaderboard: { republic: LeaderboardEntry[]; region: LeaderboardEntry[] };
      tickets: Ticket[];
      winners: PastWinner[];
    }
  | {
      registered: false;
      isAdmin?: boolean;
      phone: string;
      supportPhone: string;
      leadSubmitted: boolean;
      config: PromoConfig;
    };

/** Bazada yo'q yangi mijoz anketasi */
export interface LeadForm {
  name: string;
  activity: string;
  shopName: string;
  region: string;
  district: string;
  volume: string;
  brands: string;
  source: string;
}

export type ProductCategory = 'oils' | 'filters' | 'antifreeze' | 'transmission' | 'special';

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: ProductCategory;
  price: number; // USD
  stock: number;
  volume: string; // e.g. "4L", "1L", "20L"
  viscosity?: string; // e.g. "5W-40", "10W-40"
  description: string;
  image?: string;
  badge?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  maskedName: string;
  segment: UserSegment;
  region: string;
  tickets: number;
  paidAmount?: number;
  debtAmount?: number;
  isDebtCleared?: boolean;
  growthPercent: number;
  isMe: boolean;
  gapToNext?: number;
  gapToTop10?: number;
  gapToFirst?: number;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  orderId: string;
  dateIssued: string;
  qrCodeUrl: string;
  status: 'valid' | 'pending_debt' | 'invited' | 'won';
  isDebtCleared?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  items: {
    product: Product;
    quantity: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  ticketsAwarded: number;
  note?: string;
}

export interface PastWinner {
  id: string;
  month: string;
  winnerName: string;
  region: string;
  prize: string;
  ticketsHeld: number;
  videoUrl?: string;
  imageUrl?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ticket' | 'rank' | 'gap' | 'reminder' | 'monthend' | 'winner';
  read: boolean;
}
