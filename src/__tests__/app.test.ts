import { describe, it, expect } from 'vitest';
import {
  calculateDrawProbability,
  getProbabilityMetrics,
  findSmartUpsell,
  simulateAdditionalSpend,
} from '../utils/probability';
import { Product } from '../types';

describe('1. Tickets and Remainder Calculations', () => {
  const calculateTicketsAndGap = (paid: number, ticketPrice: number = 1000) => {
    const tickets = Math.floor(paid / ticketPrice);
    const remainder = paid % ticketPrice;
    const gapToNextTicket = remainder === 0 ? ticketPrice : ticketPrice - remainder;
    return { tickets, remainder, gapToNextTicket };
  };

  it('calculates exactly 1 ticket for $1,000 paid with $0 remainder', () => {
    const res = calculateTicketsAndGap(1000);
    expect(res.tickets).toBe(1);
    expect(res.remainder).toBe(0);
    expect(res.gapToNextTicket).toBe(1000);
  });

  it('calculates 3 tickets and $72 remainder for $3,072 paid', () => {
    const res = calculateTicketsAndGap(3072);
    expect(res.tickets).toBe(3);
    expect(res.remainder).toBe(72);
    expect(res.gapToNextTicket).toBe(928);
  });

  it('calculates 0 tickets and $850 remainder for $850 paid', () => {
    const res = calculateTicketsAndGap(850);
    expect(res.tickets).toBe(0);
    expect(res.remainder).toBe(850);
    expect(res.gapToNextTicket).toBe(150);
  });
});

describe('2. Debt Tolerance Logic', () => {
  const evaluateDebtStatus = (debt: number, tolerance: number = 0, totalTickets: number = 3) => {
    const isDebtCleared = debt <= tolerance;
    const activeTickets = isDebtCleared ? totalTickets : 0;
    return { isDebtCleared, activeTickets };
  };

  it('marks debt as cleared when debt is $0', () => {
    const res = evaluateDebtStatus(0, 0, 5);
    expect(res.isDebtCleared).toBe(true);
    expect(res.activeTickets).toBe(5);
  });

  it('marks debt as NOT cleared when debt is positive, deactivating all tickets', () => {
    const res = evaluateDebtStatus(0.01, 0, 5);
    expect(res.isDebtCleared).toBe(false);
    expect(res.activeTickets).toBe(0);
  });

  it('respects custom tolerance if configured', () => {
    const res = evaluateDebtStatus(5, 10, 4);
    expect(res.isDebtCleared).toBe(true);
    expect(res.activeTickets).toBe(4);
  });
});

describe('3. Phone Normalization', () => {
  const normalizePhoneKey = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9) return null;
    return digits.slice(-9);
  };

  it('normalizes various Uzbek phone formats to the exact 9-digit key', () => {
    expect(normalizePhoneKey('+998 (90) 000-00-01')).toBe('900000001');
    expect(normalizePhoneKey('+998901234567')).toBe('901234567');
    expect(normalizePhoneKey('998 93 000 00 02')).toBe('930000002');
    expect(normalizePhoneKey('(91) 000-00-03')).toBe('910000003');
  });

  it('rejects invalid or too-short phone numbers', () => {
    expect(normalizePhoneKey('12345')).toBeNull();
    expect(normalizePhoneKey('')).toBeNull();
  });
});

describe('4. Hypergeometric Probability Calculations', () => {
  it('returns 0 when tickets are 0 or pool is 0', () => {
    expect(calculateDrawProbability(0, 50, 30)).toBe(0);
    expect(calculateDrawProbability(5, 0, 30)).toBe(0);
  });

  it('returns 1.0 when client tickets equal or exceed pool or remaining pool < draws', () => {
    expect(calculateDrawProbability(50, 50, 30)).toBe(1);
    expect(calculateDrawProbability(30, 40, 20)).toBe(1);
  });

  it('calculates exact probability: 1 ticket in pool of 45 with 30 draws is 30/45 = 2/3', () => {
    const p = calculateDrawProbability(1, 45, 30);
    expect(p).toBeCloseTo(30 / 45, 4);
  });

  it('returns proper probability metrics structure', () => {
    const metrics = getProbabilityMetrics(2, 40, 30, 20);
    expect(metrics.percent).toBeGreaterThan(0);
    expect(metrics.percent).toBeLessThanOrEqual(100);
    expect(metrics.nextJump.newProb).toBeGreaterThan(metrics.percent);
    expect(metrics.fourMonthProb).toBeGreaterThan(metrics.percent);
  });
});

describe('5. Simulator Threshold Ranking', () => {
  const thresholds = [
    { rank: 1, minAmount: 10000, label: '1-o\'rin (iPhone 18 Pro Max)' },
    { rank: 3, minAmount: 5000, label: 'Top 3' },
    { rank: 10, minAmount: 2500, label: 'Top 10' },
  ];

  it('projects rank 1 when additional spend exceeds rank 1 threshold', () => {
    const res = simulateAdditionalSpend(
      4000,
      6500, // new = 10500 >= 10000
      8,
      500,
      1000,
      6000,
      50,
      30,
      20,
      thresholds
    );
    expect(res.newConfirmed).toBe(10500);
    expect(res.estimatedRank).toBe(1);
    expect(res.rankDelta).toBe(7);
  });

  it('projects rank 3 when spend reaches Top 3 threshold', () => {
    const res = simulateAdditionalSpend(
      2000,
      3500, // new = 5500 >= 5000
      12,
      300,
      800,
      8000,
      50,
      30,
      20,
      thresholds
    );
    expect(res.estimatedRank).toBe(3);
  });
});

describe('6. findSmartUpsell Algorithm', () => {
  const products: Product[] = [
    {
      id: 'oil_175',
      name: 'EPCO Ultra 5W-40 (4x4L)',
      brand: 'EPCO',
      category: 'oils',
      price: 175,
      stock: 20,
      volume: '16L',
      description: 'Motor moyi'
    },
    {
      id: 'filter_60',
      name: 'Moy Filtrlar To\'plami (20 dona)',
      brand: 'EPCO',
      category: 'filters',
      price: 60,
      stock: 50,
      volume: '20 dona',
      description: 'Moy filtrlari'
    },
    {
      id: 'antifreeze_55',
      name: 'EPCO Antifreeze (20L)',
      brand: 'EPCO',
      category: 'antifreeze',
      price: 55,
      stock: 30,
      volume: '20L',
      description: 'Sovutish suyuqligi'
    },
  ];

  it('finds best match with minimum surplus overspend to close a gap', () => {
    // Gap = $110:
    // Option A: 2x filter ($120, overspend $10)
    // Option B: 2x antifreeze ($110, overspend $0) -> PERFECT!
    const best = findSmartUpsell(110, products);
    expect(best).not.toBeNull();
    expect(best?.product.id).toBe('antifreeze_55');
    expect(best?.quantity).toBe(2);
    expect(best?.totalCost).toBe(110);
    expect(best?.overspend).toBe(0);
  });

  it('returns null for zero or negative gap', () => {
    expect(findSmartUpsell(0, products)).toBeNull();
    expect(findSmartUpsell(-50, products)).toBeNull();
  });
});
