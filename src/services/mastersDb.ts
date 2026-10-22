import { User, ClientStats, PromoConfig, LeaderboardEntry, Ticket } from '../types';

export const ADMIN_PHONE = '+998 90 556 90 60';
export const ADMIN_PHONE_RAW = '+998905569060';

export interface KnownMaster {
  phoneKey: string;
  phoneFormatted: string;
  name: string;
  region: string;
  agent?: string;
  paidAmount: number;
  debtAmount: number;
  manualTickets?: number;
}

// Server vaqtincha javob bermasa ishlatiladigan zaxira ma'lumot.
// DIQQAT: bu fayl ochiq saytning JS fayliga kiradi — bu yerga haqiqiy mijozlar ma'lumotini yozmang!
// Haqiqiy ma'lumotlar faqat Google Sheets ("Ustalar") dan Apps Script orqali keladi.
export const KNOWN_MASTERS: KnownMaster[] = [
  {
    phoneKey: '900000001',
    phoneFormatted: '+998 (90) 000-00-01',
    name: 'Demo Usta 1',
    region: '01 Tashkent',
    agent: 'EPCO',
    paidAmount: 4650,
    debtAmount: 0,
    manualTickets: 4
  }
];

export function normalizePhone(phone: string): string {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) return '';
  return digits.slice(-9);
}

export function formatPhone(phoneKey: string): string {
  if (phoneKey.length !== 9) return phoneKey;
  return `+998 (${phoneKey.slice(0, 2)}) ${phoneKey.slice(2, 5)}-${phoneKey.slice(5, 7)}-${phoneKey.slice(7, 9)}`;
}

export function findKnownMaster(phone: string): KnownMaster | null {
  const key = normalizePhone(phone);
  if (!key) return null;
  return KNOWN_MASTERS.find((m) => m.phoneKey === key) || null;
}

export function buildFallbackUserData(master: KnownMaster): { user: User; stats: ClientStats; config: PromoConfig } {
  const isDebtCleared = master.debtAmount <= 0;
  const ticketsCount = master.manualTickets && master.manualTickets > 0
    ? master.manualTickets
    : Math.floor(master.paidAmount / 1000);
  const activeTickets = isDebtCleared ? ticketsCount : 0;
  const remainder = master.paidAmount % 1000;
  const gapToNext = remainder === 0 ? 1000 : 1000 - remainder;

  const user: User = {
    id: `usr_${master.phoneKey}`,
    phone: master.phoneFormatted,
    name: master.name,
    maskedName: `${master.region.split(' ')[0] || '01'} · ${master.name.charAt(0).toUpperCase()}***`,
    segment: 'station',
    leagueTier: master.paidAmount >= 5000 ? 'gold' : master.paidAmount >= 2000 ? 'silver' : 'bronze',
    region: master.region,
    isAnonymous: false,
    growthPercent: 15.0
  };

  const stats: ClientStats = {
    confirmedAmount: master.paidAmount,
    paidAmount: master.paidAmount,
    debtAmount: master.debtAmount,
    isDebtCleared: isDebtCleared,
    activeTicketsCount: activeTickets,
    pendingDebtTicketsCount: isDebtCleared ? 0 : ticketsCount,
    pendingAmount: 0,
    returnedAmount: 0,
    tickets: ticketsCount,
    gapToNextTicket: gapToNext,
    currentMonthRemainder: remainder,
    currentRank: master.phoneKey === '905569060' ? 1 : 2,
    totalParticipants: 14,
    activeParticipants: 10,
    daysRemainingInMonth: 10,
    hoursRemainingInMonth: 240,
    isMonthEndWarning: false,
    isLastDayOfMonth: false,
    timeRemainingLabel: '10 kun qoldi',
    currentDateFormatted: '22-Oktyabr, 2026',
    probPercent: activeTickets > 0 ? 3.33 : 0,
    probRelativeRatio: 1.0,
    probNextJump: {
      newProb: 4.5,
      relativeMultiplier: 1.35,
      absolutePointDelta: 1.17
    },
    probFourMonthStreak: 12.8,
    probIfDebtCleared: ticketsCount > 0 ? 3.33 : 0,
    gapToNextRank: 0,
    gapToTop10: 0,
    gapToFirstPlace: 0
  };

  const config: PromoConfig = {
    totalShowWinners: 30,
    totalConfirmedTicketsPool: 45,
    totalPrizePoolUsd: 15000,
    grandPrize: 'Chevrolet DAMAS',
    firstPlacePrize: 'iPhone 18 Pro Max',
    prizeScope: 'republic',
    startDate: '2026-10-01',
    endDate: '2027-02-28',
    currentMonthName: 'Oktyabr 2026',
    daysRemainingInMonth: 10,
    rulesVideoUrl: '',
    supportPhone: ADMIN_PHONE,
    serverNow: new Date().toISOString(),
    thresholds: [
      { rank: 1, minAmount: 12000, label: '1-o\'rin' },
      { rank: 2, minAmount: 8500, label: '2-o\'rin' },
      { rank: 3, minAmount: 7000, label: '3-o\'rin' },
      { rank: 5, minAmount: 5500, label: '5-o\'rin' },
      { rank: 10, minAmount: 4200, label: '10-o\'rin' }
    ]
  };

  return { user, stats, config };
}

export function buildFallbackLeaderboard(currentPhoneKey?: string): LeaderboardEntry[] {
  return KNOWN_MASTERS.map((m, idx) => ({
    rank: idx + 1,
    maskedName: `${m.region.split(' ')[0] || '01'} · ${m.name}`,
    ticketsCount: m.debtAmount <= 0 ? (m.manualTickets || Math.floor(m.paidAmount / 1000)) : 0,
    turnoverUsd: m.paidAmount,
    segment: 'station' as const,
    leagueTier: m.paidAmount >= 5000 ? 'platinum' as const : m.paidAmount >= 2000 ? 'gold' as const : 'silver' as const,
    isMe: m.phoneKey === currentPhoneKey,
    hasDebt: m.debtAmount > 0,
    eligibleForTop1: m.debtAmount <= 0,
    region: m.region
  }));
}

export function buildFallbackTickets(master: KnownMaster): Ticket[] {
  const isDebtCleared = master.debtAmount <= 0;
  const count = master.manualTickets || Math.floor(master.paidAmount / 1000);
  const tickets: Ticket[] = [];
  for (let i = 1; i <= count; i++) {
    const num = `EPCO-202610-${('0000' + i).slice(-4)}`;
    tickets.push({
      id: `tkt_${num}`,
      ticketNumber: num,
      month: '2026-10',
      amountPaid: 1000,
      status: isDebtCleared ? 'CONFIRMED' : 'PENDING_DEBT',
      issuedAt: new Date().toISOString(),
      qrCodeUrl: `https://epco.uz/verify/${num}`,
      isEligible: isDebtCleared
    });
  }
  return tickets;
}
