import { BootstrapData } from '../types';
import { apiService, ApiResponse } from './apiService';
import {
  isDemoMode,
  DEMO_USER,
  DEMO_CONFIG,
  DEMO_STATS,
  DEMO_LEADERBOARD,
  DEMO_TICKETS,
  DEMO_WINNERS
} from './demoData';

/**
 * Ilova ma'lumotlari: demo rejimda soxta ma'lumot, aks holda Apps Script "bootstrap".
 */
class DataService {
  async loadBootstrap(): Promise<ApiResponse<BootstrapData>> {
    if (isDemoMode()) {
      // ?yangi — bazada yo'q yangi mijoz ekranini (anketa) ko'rish uchun
      if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('yangi')) {
        return {
          success: true,
          data: { registered: false, phone: '+998 (99) 123-45-67', supportPhone: DEMO_CONFIG.supportPhone, leadSubmitted: false, config: DEMO_CONFIG },
        };
      }
      return {
        success: true,
        data: {
          registered: true,
          user: DEMO_USER,
          stats: DEMO_STATS,
          config: DEMO_CONFIG,
          leaderboard: {
            republic: DEMO_LEADERBOARD,
            region: DEMO_LEADERBOARD.filter((e) => e.region === DEMO_USER.region),
          },
          tickets: DEMO_TICKETS,
          winners: DEMO_WINNERS,
        },
      };
    }
    return apiService.bootstrap();
  }

  getCachedBootstrap(): BootstrapData | null {
    return isDemoMode() ? null : apiService.getCachedBootstrap();
  }

  async updateConsent(consent: boolean): Promise<boolean> {
    if (isDemoMode()) {
      DEMO_USER.isAnonymous = !consent;
      return true;
    }
    const res = await apiService.updateConsent(consent);
    return res.success;
  }

  async logout(): Promise<void> {
    await apiService.logout();
  }
}

export const dataService = new DataService();
