import { Product } from '../types';

/**
 * Calculates exact hypergeometric probability of winning at least 1 ticket out of K draws without replacement:
 * P(t) = 1 - \prod_{i=0}^{K-1} (T - t - i) / (T - i)
 *
 * @param t - Client's number of tickets
 * @param T - Total pool of confirmed tickets in the month (e.g. 6000)
 * @param K - Total winning tickets drawn for the show (e.g. 30)
 * @returns probability as float between 0 and 1
 */
export function calculateDrawProbability(t: number, T: number = 6000, K: number = 30): number {
  if (t <= 0 || T <= 0 || K <= 0) return 0;
  if (t >= T) return 1;
  if (T - t < K) return 1;

  let product = 1.0;
  for (let i = 0; i < K; i++) {
    const numerator = T - t - i;
    const denominator = T - i;
    if (denominator <= 0) return 1;
    product *= Math.max(0, numerator) / denominator;
  }

  const p = 1.0 - product;
  return Math.max(0, Math.min(1, p));
}

/**
 * Computes all 4 probability metrics required by the EPCO specification
 */
export function getProbabilityMetrics(
  t: number,
  T: number = 6000,
  K: number = 30,
  activeParticipants: number = 850
) {
  const pCurrent = calculateDrawProbability(t, T, K);
  const pNext = calculateDrawProbability(t + 1, T, K);

  // 1. Percentage
  const percent = pCurrent * 100;

  // 2. Relative to average participant
  const avgTickets = Math.max(1, T / Math.max(1, activeParticipants));
  const pAvg = calculateDrawProbability(Math.round(avgTickets), T, K);
  const relativeRatio = pAvg > 0 ? pCurrent / pAvg : (t > 0 ? 1 : 0);

  // 3. Jump to next ticket: relative multiplier & absolute delta
  const relativeMultiplier = pCurrent > 0 ? pNext / pCurrent : (pNext > 0 ? pNext * 100 : 1);
  const absolutePointDelta = (pNext - pCurrent) * 100;

  // 4. Four-month streak probability: 1 - (1 - P(t))^4
  const fourMonthProb = (1.0 - Math.pow(1.0 - pCurrent, 4)) * 100;

  return {
    pCurrent,
    percent: Number(percent.toFixed(2)),
    relativeRatio: Number(relativeRatio.toFixed(2)),
    nextJump: {
      newProb: Number((pNext * 100).toFixed(2)),
      relativeMultiplier: Number(relativeMultiplier.toFixed(2)),
      absolutePointDelta: Number(absolutePointDelta.toFixed(2)),
    },
    fourMonthProb: Number(fourMonthProb.toFixed(1)),
  };
}

/**
 * Finds the smartest product/bundle to close the remaining dollar gap to the next ticket
 * with minimal surplus spend.
 */
export function findSmartUpsell(
  gapAmount: number,
  products: Product[]
): {
  product: Product;
  quantity: number;
  totalCost: number;
  overspend: number;
} | null {
  if (gapAmount <= 0 || !products.length) return null;

  let bestMatch: {
    product: Product;
    quantity: number;
    totalCost: number;
    overspend: number;
  } | null = null;

  for (const product of products) {
    if (product.price <= 0) continue;
    // Calculate required quantity to meet or exceed gap
    const quantity = Math.ceil(gapAmount / product.price);
    if (quantity > 20) continue; // Keep recommendations reasonable for a mechanic / shop order

    const totalCost = quantity * product.price;
    const overspend = totalCost - gapAmount;

    if (
      bestMatch === null ||
      overspend < bestMatch.overspend ||
      (overspend === bestMatch.overspend && totalCost < bestMatch.totalCost)
    ) {
      bestMatch = {
        product,
        quantity,
        totalCost,
        overspend,
      };
    }
  }

  return bestMatch;
}

/**
 * Simulates the effect of adding extra spend to current confirmed amount
 */
export function simulateAdditionalSpend(
  currentConfirmed: number,
  additionalSpend: number,
  currentRank: number,
  gapToNextRank: number,
  gapToTop10: number,
  gapToFirstPlace: number,
  T: number,
  K: number = 30,
  activeParticipants: number = 10,
  thresholds?: { rank: number; minAmount: number; label?: string }[]
) {
  const newConfirmed = currentConfirmed + additionalSpend;
  const currentTickets = Math.floor(currentConfirmed / 1000);
  const newTickets = Math.floor(newConfirmed / 1000);
  const ticketDelta = newTickets - currentTickets;

  const remainder = newConfirmed % 1000;
  const newGapToTicket = remainder === 0 ? 1000 : (1000 - remainder);
  const poolT = Math.max(1, (T || 0) + ticketDelta);
  const newMetrics = getProbabilityMetrics(newTickets, poolT, K, activeParticipants);

  // Estimate new rank based on thresholds array or gap values
  let estimatedRank = currentRank;

  if (thresholds && thresholds.length > 0) {
    // Sort ascending by rank (rank 1, 3, 10, etc.)
    const sortedThresholds = [...thresholds].sort((a, b) => a.rank - b.rank);
    for (const t of sortedThresholds) {
      if (newConfirmed >= t.minAmount) {
        estimatedRank = Math.min(estimatedRank, t.rank);
        break;
      }
    }
  } else {
    if (additionalSpend >= gapToFirstPlace && gapToFirstPlace > 0) {
      estimatedRank = 1;
    } else if (additionalSpend >= gapToTop10 && currentRank > 10) {
      estimatedRank = Math.max(2, 10 - Math.floor((additionalSpend - gapToTop10) / 400));
    } else if (additionalSpend >= gapToNextRank && gapToNextRank > 0) {
      const leapPositions = Math.floor(additionalSpend / Math.max(150, gapToNextRank));
      estimatedRank = Math.max(1, currentRank - Math.max(1, leapPositions));
    }
  }

  return {
    newConfirmed,
    currentTickets,
    newTickets,
    ticketDelta,
    newGapToTicket,
    newMetrics,
    estimatedRank,
    rankDelta: Math.max(0, currentRank - estimatedRank),
  };
}
