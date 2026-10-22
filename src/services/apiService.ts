import {
  User,
  PromoConfig,
  ClientStats,
  LeaderboardEntry,
  Ticket,
  Product,
  Order,
  PastWinner,
  PrizeScope
} from '../types';
import {
  findKnownMaster,
  buildFallbackUserData,
  ADMIN_PHONE,
  normalizePhone,
  formatPhone,
  KnownMaster
} from './mastersDb';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp?: string;
}

const STORAGE_KEYS = {
  TOKEN: 'epco_token',
  USER: 'epco_user_cache',
  STATS: 'epco_stats_cache',
  CONFIG: 'epco_config_cache',
  PHONE: 'epco_last_phone'
};

class ApiService {
  private token: string | null = null;
  private readonly url: string = (import.meta as any).env?.VITE_API_URL || '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    }
  }

  public getUrl(): string {
    return this.url;
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      }
    }
  }

  public clearToken(): void {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
    }
  }

  public isTelegramMiniApp(): boolean {
    if (typeof window === 'undefined') return false;
    const tg = (window as any).Telegram?.WebApp;
    return Boolean(tg && tg.initData && tg.initData.length > 0);
  }

  public getTelegramInitData(): string {
    if (typeof window === 'undefined') return '';
    return (window as any).Telegram?.WebApp?.initData || '';
  }

  /**
   * Universal POST so'rov (text/plain yuboriladi - CORS preflight muammosini oldini oladi)
   */
  public async request<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
    const endpoint = this.url;
    if (!endpoint) {
      return {
        success: false,
        error: {
          code: 'NO_ENDPOINT',
          message: 'Google Apps Script URL o\'rnatilmagan'
        }
      };
    }

    try {
      const body = JSON.stringify({
        action,
        token: this.token || undefined,
        ...payload
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body
      });

      if (!response.ok) {
        throw new Error(`Server xatoligi: ${response.status}`);
      }

      const json = await response.json();

      if (!json.success && json.error?.code === 'UNAUTHORIZED') {
        this.clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('epco-unauthorized'));
        }
      }

      return json as ApiResponse<T>;
    } catch (err: any) {
      console.warn(`[ApiService] ${action} so'rovi amalga oshmadi:`, err);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Tarmoq xatosi yoki server javob bermadi'
        }
      };
    }
  }

  /**
   * Telegram Mini App orqali bir teginishda avtorizatsiya
   */
  public async authTelegram(): Promise<ApiResponse<{ token?: string; user?: User; stats?: ClientStats; config?: PromoConfig; status?: string; message?: string }>> {
    const initData = this.getTelegramInitData();
    if (!initData) {
      return {
        success: false,
        error: { code: 'NO_INIT_DATA', message: 'Telegram WebApp ma\'lumoti topilmadi' }
      };
    }

    const res = await this.request('auth.telegram', { initData });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
      this.cacheUserData(res.data.user, res.data.stats, res.data.config);
    }
    return res;
  }

  /**
   * Parolsiz raqamni tekshirish (OTP siz)
   */
  public async checkPhone(phone: string): Promise<{
    found: boolean;
    clientName?: string;
    region?: string;
    phoneKey?: string;
    phoneFormatted?: string;
    token?: string;
    message?: string;
    supportPhone: string;
  }> {
    const known = findKnownMaster(phone);

    // Agar Google Apps Script URL mavjud bo'lsa, serverdan tekshirish
    if (this.url) {
      try {
        const res = await this.request('auth.checkPhone', { phone });
        if (res.success && res.data) {
          if (res.data.found) {
            return {
              found: true,
              clientName: res.data.clientName,
              region: res.data.region,
              phoneKey: res.data.phoneKey,
              phoneFormatted: res.data.phoneFormatted,
              token: res.data.token,
              supportPhone: ADMIN_PHONE
            };
          } else {
            return {
              found: false,
              message: res.data.message || 'Bunday mijoz bazada topilmadi',
              supportPhone: ADMIN_PHONE
            };
          }
        }
      } catch (err) {
        console.warn('[ApiService] Server checkPhone failed, using local masters DB fallback:', err);
      }
    }

    // Server javob bermasa yoki ulanish bo'lmasa: o'rnatilgan "Ustalar" bazasidan tekshirish
    if (known) {
      const fallbackToken = `epco_tok_local_${known.phoneKey}`;
      return {
        found: true,
        clientName: known.name,
        region: known.region,
        phoneKey: known.phoneKey,
        phoneFormatted: known.phoneFormatted,
        token: fallbackToken,
        supportPhone: ADMIN_PHONE
      };
    }

    return {
      found: false,
      message: 'Bunday mijoz bazada topilmadi',
      supportPhone: ADMIN_PHONE
    };
  }

  /**
   * Foydalanuvchi "Ha, bu men" deb tasdiqlaganda kirish
   */
  public async loginDirect(phone: string, token?: string): Promise<{
    user: User;
    stats: ClientStats;
    config: PromoConfig;
    token: string;
  }> {
    const known = findKnownMaster(phone);

    if (token) {
      this.setToken(token);
    } else {
      const genToken = `epco_tok_local_${normalizePhone(phone)}`;
      this.setToken(genToken);
    }

    if (this.url) {
      try {
        const res = await this.request('auth.loginDirect', { phone });
        if (res.success && res.data?.user) {
          this.cacheUserData(res.data.user, res.data.stats, res.data.config);
          return {
            user: res.data.user,
            stats: res.data.stats,
            config: res.data.config,
            token: res.data.token || this.token || ''
          };
        }
      } catch (e) {
        console.warn('[ApiService] loginDirect server error, using fallback:', e);
      }
    }

    if (known) {
      const data = buildFallbackUserData(known);
      this.cacheUserData(data.user, data.stats, data.config);
      return {
        ...data,
        token: this.token || `epco_tok_local_${known.phoneKey}`
      };
    }

    // Default yangi foydalanuvchi
    const phoneKey = normalizePhone(phone);
    const defaultMaster: KnownMaster = {
      phoneKey,
      phoneFormatted: formatPhone(phoneKey),
      name: `Mijoz ${phoneKey.slice(-4)}`,
      region: '01 Tashkent',
      paidAmount: 0,
      debtAmount: 0
    };
    const data = buildFallbackUserData(defaultMaster);
    this.cacheUserData(data.user, data.stats, data.config);
    return {
      ...data,
      token: this.token || `epco_tok_local_${phoneKey}`
    };
  }

  /**
   * Brauzer / PWA uchun 6 xonali Telegram OTP kodini so'rash (zaxira)
   */
  public async requestCode(phone: string): Promise<ApiResponse<{ status: string; message: string; botUrl?: string }>> {
    const res = await this.request('auth.requestCode', { phone });
    if (typeof window !== 'undefined' && phone) {
      localStorage.setItem(STORAGE_KEYS.PHONE, phone);
    }
    return res;
  }

  /**
   * 6 xonali OTP kodini tekshirish (zaxira)
   */
  public async verifyCode(phone: string, code: string): Promise<ApiResponse<{ token: string; user: User; stats: ClientStats; config: PromoConfig }>> {
    const res = await this.request('auth.verifyCode', { phone, code });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
      this.cacheUserData(res.data.user, res.data.stats, res.data.config);
    }
    return res;
  }

  /**
   * Tizimdan chiqish
   */
  public async logout(): Promise<void> {
    if (this.token) {
      try {
        await this.request('auth.logout', { token: this.token });
      } catch (e) {}
    }
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.CONFIG);
    }
  }

  /**
   * Joriy mijoz ma'lumotlari va statistikasini olish
   */
  public async getMe(): Promise<ApiResponse<{ user: User; stats: ClientStats; config: PromoConfig }>> {
    const res = await this.request<{ user: User; stats: ClientStats; config: PromoConfig }>('me');
    if (res.success && res.data) {
      this.cacheUserData(res.data.user, res.data.stats, res.data.config);
    }
    return res;
  }

  /**
   * Jonli reyting ro'yxati
   */
  public async getLeaderboard(scope: PrizeScope = 'republic', region?: string): Promise<ApiResponse<{ scope: string; totalParticipants: number; leaderboard: LeaderboardEntry[] }>> {
    return await this.request('leaderboard', { scope, region });
  }

  /**
   * Biletlar ro'yxati
   */
  public async getTickets(): Promise<ApiResponse<{ tickets: Ticket[] }>> {
    return await this.request('tickets');
  }

  /**
   * Katalog
   */
  public async getCatalog(): Promise<ApiResponse<{ products: Product[] }>> {
    return await this.request('catalog');
  }

  /**
   * Zakaz yaratish
   */
  public async createOrder(items: { productId: string; quantity: number }[]): Promise<ApiResponse<{ orderNumber: string; totalAmount: number; status: string; message: string }>> {
    return await this.request('order.create', { items });
  }

  /**
   * G'oliblar
   */
  public async getWinners(): Promise<ApiResponse<{ winners: PastWinner[] }>> {
    return await this.request('winners');
  }

  /**
   * Ismni yashirish/ko'rsatish roziligini yangilash
   */
  public async updateConsent(consent: boolean): Promise<ApiResponse<{ success: boolean; consent: boolean }>> {
    return await this.request('consent.update', { consent });
  }

  /**
   * Bilet raqami bo'yicha haqiqiyligini tekshirish
   */
  public async verifyTicket(ticketNumber: string): Promise<ApiResponse<{ valid: boolean; ticketNumber?: string; month?: string; status?: string; ownerMasked?: string; message?: string }>> {
    return await this.request('ticket.verify', { ticketNumber });
  }

  private cacheUserData(user?: User, stats?: ClientStats, config?: PromoConfig): void {
    if (typeof window === 'undefined') return;
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (stats) localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    if (config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  public getCachedUser(): User | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(STORAGE_KEYS.USER);
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  }

  public getCachedStats(): ClientStats | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  }

  public getCachedConfig(): PromoConfig | null {
    if (typeof window === 'undefined') return null;
    const str = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  }
}

export const apiService = new ApiService();
