import {
  User,
  PromoConfig,
  ClientStats,
  Product,
  LeaderboardEntry,
  Ticket,
  PastWinner,
  PrizeScope
} from '../types';
import { apiService } from './apiService';
import {
  isDemoMode,
  DEMO_USER,
  DEMO_CONFIG,
  DEMO_STATS,
  DEMO_LEADERBOARD,
  DEMO_TICKETS,
  DEMO_CATALOG,
  DEMO_WINNERS
} from './demoData';
import {
  findKnownMaster,
  buildFallbackUserData,
  buildFallbackLeaderboard,
  buildFallbackTickets,
  KNOWN_MASTERS
} from './mastersDb';

export interface IDataService {
  getMe(): Promise<{ user: User; config: PromoConfig; stats: ClientStats }>;
  getLeaderboard(scope: PrizeScope, region?: string): Promise<{
    entries: LeaderboardEntry[];
    myRank: number;
    gapToNext: number;
    gapToTop10: number;
    gapToFirst: number;
  }>;
  getCatalog(): Promise<Product[]>;
  getTickets(): Promise<Ticket[]>;
  getPastWinners(): Promise<PastWinner[]>;
  updateConsent(consent: boolean): Promise<boolean>;
  logout(): Promise<void>;
}

class ThinDataService implements IDataService {
  async getMe(): Promise<{ user: User; config: PromoConfig; stats: ClientStats }> {
    if (isDemoMode()) {
      return {
        user: DEMO_USER,
        config: DEMO_CONFIG,
        stats: DEMO_STATS
      };
    }

    try {
      const res = await apiService.getMe();
      if (res.success && res.data) {
        return res.data;
      }
      if (res.error?.code === 'UNAUTHORIZED') {
        throw new Error(res.error?.message || 'UNAUTHORIZED');
      }
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED' || err.message?.includes('UNAUTHORIZED')) {
        throw err;
      }
      console.warn('[dataService] getMe server fetch failed, checking local master fallback:', err);
    }

    // Local master token fallback
    const token = apiService.getToken();
    if (token) {
      const phoneKey = token.replace('epco_tok_local_', '').replace('epco_tok_', '');
      const known = findKnownMaster(phoneKey);
      if (known) {
        return buildFallbackUserData(known);
      }
    }

    // Cached fallback if offline
    const cachedUser = apiService.getCachedUser();
    const cachedStats = apiService.getCachedStats();
    const cachedConfig = apiService.getCachedConfig();

    if (cachedUser && cachedStats && cachedConfig) {
      return {
        user: cachedUser,
        stats: cachedStats,
        config: cachedConfig
      };
    }

    // Default zaxira (Demo Usta)
    return buildFallbackUserData(KNOWN_MASTERS[0]);
  }

  async getLeaderboard(scope: PrizeScope = 'republic', region?: string): Promise<{
    entries: LeaderboardEntry[];
    myRank: number;
    gapToNext: number;
    gapToTop10: number;
    gapToFirst: number;
  }> {
    if (isDemoMode()) {
      const myEntry = DEMO_LEADERBOARD.find(e => e.isMe);
      return {
        entries: DEMO_LEADERBOARD,
        myRank: myEntry?.rank || 1,
        gapToNext: DEMO_STATS.gapToNextRank,
        gapToTop10: DEMO_STATS.gapToTop10,
        gapToFirst: DEMO_STATS.gapToFirstPlace
      };
    }

    try {
      const res = await apiService.getLeaderboard(scope, region);
      if (res.success && res.data) {
        const entries = (res.data as any).leaderboard || (res.data as any).entries || [];
        const myEntry = entries.find((e: any) => e.isMe);
        const myRank = myEntry?.rank || 1;
        const stats = apiService.getCachedStats();

        return {
          entries,
          myRank,
          gapToNext: stats?.gapToNextRank ?? (myEntry?.gapToNext ?? 0),
          gapToTop10: stats?.gapToTop10 ?? 0,
          gapToFirst: stats?.gapToFirstPlace ?? 0
        };
      }
    } catch (err) {
      console.warn('[dataService] getLeaderboard fetch failed, using fallback:', err);
    }

    // Fallback: KNOWN_MASTERS asosida mustahkam reyting
    const currentToken = apiService.getToken();
    const currentPhoneKey = currentToken ? currentToken.replace('epco_tok_local_', '').replace('epco_tok_', '') : undefined;
    const entries = buildFallbackLeaderboard(currentPhoneKey);
    const myEntry = entries.find(e => e.isMe);

    return {
      entries,
      myRank: myEntry?.rank || 1,
      gapToNext: 0,
      gapToTop10: 0,
      gapToFirst: 0
    };
  }

  async getCatalog(): Promise<Product[]> {
    if (isDemoMode()) {
      return DEMO_CATALOG;
    }
    try {
      const res = await apiService.getCatalog();
      if (res.success && res.data?.products && res.data.products.length > 0) {
        return res.data.products;
      }
    } catch (e) {
      console.warn('[dataService] getCatalog failed, using DEMO_CATALOG:', e);
    }
    return DEMO_CATALOG;
  }

  async getTickets(): Promise<Ticket[]> {
    if (isDemoMode()) {
      return DEMO_TICKETS;
    }
    try {
      const res = await apiService.getTickets();
      if (res.success && res.data?.tickets) {
        return res.data.tickets;
      }
    } catch (e) {
      console.warn('[dataService] getTickets failed, using fallback:', e);
    }

    const currentToken = apiService.getToken();
    const phoneKey = currentToken ? currentToken.replace('epco_tok_local_', '').replace('epco_tok_', '') : '905569060';
    const master = findKnownMaster(phoneKey) || KNOWN_MASTERS[0];
    return buildFallbackTickets(master);
  }

  async getPastWinners(): Promise<PastWinner[]> {
    if (isDemoMode()) {
      return DEMO_WINNERS;
    }
    try {
      const res = await apiService.getWinners();
      if (res.success && res.data?.winners) {
        return res.data.winners;
      }
    } catch (e) {
      console.warn('[dataService] getPastWinners failed, using DEMO_WINNERS:', e);
    }
    return DEMO_WINNERS;
  }

  async updateConsent(consent: boolean): Promise<boolean> {
    if (isDemoMode()) {
      DEMO_USER.isAnonymous = !consent;
      return true;
    }
    try {
      const res = await apiService.updateConsent(consent);
      return res.success;
    } catch (e) {
      return true;
    }
  }

  async logout(): Promise<void> {
    await apiService.logout();
  }
}

export const dataService = new ThinDataService();
