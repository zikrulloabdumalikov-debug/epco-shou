import { BootstrapData, LeadForm, LeaderboardEntry, PrizeScope } from '../types';

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
  BOOTSTRAP: 'epco_bootstrap_v2',
  PHONE: 'epco_last_phone',
};

// Apps Script ba'zan sekin javob beradi; cheksiz kutib qolmaslik uchun
const REQUEST_TIMEOUT_MS = 45000;

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      // private rejim yoki to'lgan xotira — kesh shart emas
    }
  },
};

class ApiService {
  private token: string | null = null;
  private readonly url: string = (import.meta as any).env?.VITE_API_URL || '';

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = storage.get(STORAGE_KEYS.TOKEN);
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null): void {
    this.token = token;
    storage.set(STORAGE_KEYS.TOKEN, token);
  }

  /** Tokenni va saqlangan shaxsiy ma'lumotlarni o'chiradi */
  public clearToken(): void {
    this.setToken(null);
    storage.set(STORAGE_KEYS.BOOTSTRAP, null);
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
   * Universal POST so'rov (text/plain yuboriladi - CORS preflight muammosini oldini oladi).
   * Tizimdan faqat server aniq UNAUTHORIZED desa chiqariladi; tarmoq xatosi yoki
   * sekin javob foydalanuvchini chiqarib yubormaydi.
   */
  public async request<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
    if (!this.url) {
      return { success: false, error: { code: 'NO_ENDPOINT', message: 'Google Apps Script URL o\'rnatilmagan' } };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token: this.token || undefined, ...payload }),
        signal: controller.signal,
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
          message: err?.name === 'AbortError'
            ? 'Server juda uzoq javob bermadi. Birozdan keyin qayta urinib ko\'ring.'
            : 'Internet aloqasini tekshirib, qayta urinib ko\'ring.',
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Telegram Mini App orqali bir teginishda avtorizatsiya
   */
  public async authTelegram(): Promise<ApiResponse<{ token?: string; registered?: boolean; status?: string; message?: string; botUrl?: string }>> {
    const initData = this.getTelegramInitData();
    if (!initData) {
      return { success: false, error: { code: 'NO_INIT_DATA', message: 'Telegram WebApp ma\'lumoti topilmadi' } };
    }
    const res = await this.request('auth.telegram', { initData });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  /**
   * Brauzer / PWA uchun 6 xonali kodni Telegram bot orqali so'rash.
   * status: CODE_SENT | NEED_PHONE_LINK | TOO_SOON | INVALID_PHONE | SEND_FAILED
   */
  public async requestCode(phone: string): Promise<ApiResponse<{ status: string; message: string; botUrl?: string }>> {
    const res = await this.request('auth.requestCode', { phone });
    if (phone) storage.set(STORAGE_KEYS.PHONE, phone);
    return res;
  }

  /**
   * 6 xonali kodni tekshirish va sessiya tokenini olish
   */
  public async verifyCode(phone: string, code: string): Promise<ApiResponse<{ token: string; registered: boolean }>> {
    const res = await this.request('auth.verifyCode', { phone, code });
    if (res.success && res.data?.token) {
      this.setToken(res.data.token);
    }
    return res;
  }

  public async logout(): Promise<void> {
    if (this.token) {
      await this.request('auth.logout');
    }
    this.clearToken();
  }

  /**
   * Ilova uchun kerak bo'lgan hamma narsa bitta so'rovda (profil, statistika, reyting, biletlar)
   */
  public async bootstrap(): Promise<ApiResponse<BootstrapData>> {
    const res = await this.request<BootstrapData>('bootstrap');
    if (res.success && res.data) {
      storage.set(STORAGE_KEYS.BOOTSTRAP, JSON.stringify(res.data));
    }
    return res;
  }

  /** Oxirgi muvaffaqiyatli bootstrap — ilova qayta ochilganda darhol ko'rsatiladi */
  public getCachedBootstrap(): BootstrapData | null {
    if (!this.token) return null;
    const raw = storage.get(STORAGE_KEYS.BOOTSTRAP);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as BootstrapData;
    } catch {
      return null;
    }
  }

  public async submitLead(lead: LeadForm): Promise<ApiResponse<{ submitted: boolean; supportPhone: string }>> {
    return this.request('lead.submit', { lead });
  }

  public async getLeaderboard(scope: PrizeScope = 'republic', region?: string): Promise<ApiResponse<{ entries: LeaderboardEntry[] }>> {
    return this.request('leaderboard', { scope, region });
  }

  /** Admin panel amallari (admin.overview, admin.broadcast.create, ...) — server adminligini tekshiradi */
  public async admin<T = any>(action: string, payload: Record<string, any> = {}): Promise<ApiResponse<T>> {
    return this.request<T>(`admin.${action}`, payload);
  }

  public async verifyTicket(ticketNumber: string): Promise<ApiResponse<{ valid: boolean; ticketNumber?: string; month?: string; status?: string; ownerMasked?: string; message?: string }>> {
    return this.request('ticket.verify', { ticketNumber });
  }
}

export const apiService = new ApiService();
