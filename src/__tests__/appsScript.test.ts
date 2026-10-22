/**
 * google-apps-script/Code.gs ni Google xizmatlarining soxta (mock) nusxalari bilan
 * Node'da ishga tushirib, kirish va bot xavfsizligini tekshiradi.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CODE = fs.readFileSync(fileURLToPath(new URL('../../google-apps-script/Code.gs', import.meta.url)), 'utf8');

const BOT_TOKEN = '123456:TEST_BOT_TOKEN';
const WEBHOOK_SECRET = 'test_webhook_secret_123';

const toSigned = (buf: Buffer) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));
const fromSigned = (arr: number[]) => Buffer.from(arr.map((b) => (b + 256) % 256));
const asBuffer = (v: string | number[]) => (typeof v === 'string' ? Buffer.from(v, 'utf8') : fromSigned(v));

// Ustalar: A Viloyat, B Agent, C Mijoz, D Sana, E Tel, F Status, G Pul kirim, H Qarz, I Bilet
const ROWS = [
  ['01 Tashkent', 'AG-1', 'Alisher Usta', '', '+998 (90) 000-00-01', '', 3500, 0, ''],
  ['03 Andijon', 'AG-2', 'Botir Moyxona', '', '+998 (91) 000-00-02', '', 1200, -150, ''],
  ['05 Samarqand', 'AG-3', 'Sardor Avto', '', '+998 (93) 000-00-03', '', 800, 0, ''],
];

const FORMAT_METHODS = ['setFontWeight', 'setBackground', 'setFontColor', 'setNumberFormat'];

/** Oddiy jadval mock'i: 1-indeksli katakchalar */
class GridSheet {
  cells: any[][] = [];
  constructor(private name = 'Sheet') {}
  getName() {
    return this.name;
  }
  appendRow(values: any[]) {
    this.cells[this.getLastRow()] = values.slice();
  }
  private cell(r: number, c: number) {
    return this.cells[r - 1]?.[c - 1] ?? '';
  }
  private set(r: number, c: number, v: any) {
    (this.cells[r - 1] ??= [])[c - 1] = v;
  }
  getLastRow() {
    let last = 0;
    this.cells.forEach((row, i) => {
      if (row && row.some((v) => v !== '' && v !== undefined)) last = i + 1;
    });
    return last;
  }
  setFrozenRows() {}
  getLastColumn() {
    return Math.max(0, ...this.cells.map((r) => (r ? r.length : 0)));
  }
  deleteRow(row: number) {
    this.cells.splice(row - 1, 1);
  }
  getRange(a: number | string, b = 1, nr = 1, nc = 1): any {
    let r = a as number;
    let c = b;
    const range: any = {};
    FORMAT_METHODS.forEach((k) => (range[k] = () => range));
    if (typeof a === 'string') {
      const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
      if (!m) return range; // "A:A" kabi butun ustun formatlari
      const col = (letters: string) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
      r = Number(m[2]);
      c = col(m[1]);
      nr = m[4] ? Number(m[4]) - r + 1 : 1;
      nc = m[3] ? col(m[3]) - c + 1 : 1;
    }
    range.setValues = (vals: any[][]) => {
      vals.forEach((row, i) => row.forEach((v, j) => this.set(r + i, c + j, v)));
      return range;
    };
    range.setValue = (v: any) => (this.set(r, c, v), range);
    range.setFormula = (f: string) => (this.set(r, c, f), range);
    range.getValue = () => this.cell(r, c);
    range.getValues = () =>
      Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => this.cell(r + i, c + j)));
    range.getDisplayValues = () => range.getValues().map((row: any[]) => row.map((v) => String(v)));
    return range;
  }
}

function createEnv() {
  const props = new Map<string, string>([
    ['BOT_TOKEN', BOT_TOKEN],
    ['WEBHOOK_SECRET', WEBHOOK_SECRET],
  ]);
  const cache = new Map<string, string>();
  const sent: { url: string; payload: any }[] = [];
  const blockedChats = new Set<string>();

  const stats = { masterReads: 0 };
  const ustalar = {
    getName: () => 'Ustalar',
    getLastRow: () => ROWS.length + 1,
    getLastColumn: () => 9,
    getRange: () => {
      stats.masterReads++;
      return { getValues: () => ROWS.map((r) => r.slice()) };
    },
  };
  const sheets: Record<string, any> = { Ustalar: ustalar };

  const mocks = {
    Logger: { log: () => {} },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      getUuid: () => crypto.randomUUID(),
      computeDigest: (_alg: string, value: string) =>
        toSigned(crypto.createHash('sha256').update(String(value), 'utf8').digest()),
      computeHmacSha256Signature: (value: string | number[], key: string | number[]) =>
        toSigned(crypto.createHmac('sha256', asBuffer(key)).update(asBuffer(value)).digest()),
      newBlob: (bytes?: number[]) => {
        let data = Array.isArray(bytes) ? fromSigned(bytes) : Buffer.alloc(0);
        const blob = {
          setDataFromString: (s: string) => {
            data = Buffer.from(s, 'utf8');
            return blob;
          },
          getBytes: () => toSigned(data),
        };
        return blob;
      },
      // Toshkent vaqti (UTC+5) bo'yicha "yyyy-MM" va "yyyy-M-d-H" formatlari
      formatDate: (date: Date, _tz: string, fmt: string) => {
        const d = new Date(date.getTime() + 5 * 3600 * 1000);
        const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate(), h = d.getUTCHours();
        if (fmt === 'yyyy-MM') return `${y}-${String(m).padStart(2, '0')}`;
        return `${y}-${m}-${day}-${h}`;
      },
      base64Encode: (bytes: number[]) => fromSigned(bytes).toString('base64'),
      base64Decode: (str: string) => toSigned(Buffer.from(str, 'base64')),
      sleep: () => {},
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => (props.has(k) ? props.get(k)! : null),
        setProperty: (k: string, v: string) => props.set(k, String(v)),
        deleteProperty: (k: string) => props.delete(k),
        getProperties: () => Object.fromEntries(props),
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k: string) => (cache.has(k) ? cache.get(k)! : null),
        put: (k: string, v: string) => cache.set(k, String(v)),
        remove: (k: string) => cache.delete(k),
        getAll: (keys: string[]) => Object.fromEntries(keys.filter((k) => cache.has(k)).map((k) => [k, cache.get(k)])),
        putAll: (obj: Record<string, string>) => Object.entries(obj).forEach(([k, v]) => cache.set(k, String(v))),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    HtmlService: { createHtmlOutput: (content: string) => ({ content, kind: 'html' }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (content: string) => ({ content, setMimeType() { return this; } }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name: string) => sheets[name] || null,
        getSheets: () => Object.values(sheets),
        insertSheet: (name: string) => (sheets[name] = new GridSheet(name)),
      }),
    },
    UrlFetchApp: {
      fetch: (url: string, opts: any) => {
        const payload = opts && opts.payload ? (typeof opts.payload === 'string' ? JSON.parse(opts.payload) : opts.payload) : null;
        sent.push({ url, payload });
        const method = url.split('/').pop();
        const result = method === 'sendPoll' ? { message_id: 77, poll: { id: 'POLL1' } }
          : method === 'sendPhoto' ? { message_id: 78, photo: [{ file_id: 'small' }, { file_id: 'FILE_BIG' }] }
          : {};
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ ok: true, result }) };
      },
      fetchAll: (requests: any[]) =>
        requests.map((req) => {
          sent.push({ url: req.url, payload: JSON.parse(req.payload) });
          const code = blockedChats.has(String(JSON.parse(req.payload).chat_id)) ? 403 : 200;
          return { getResponseCode: () => code };
        }),
    },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }) },
  };

  const ctx: any = vm.createContext({ ...mocks });
  vm.runInContext(CODE, ctx);

  const api = (body: Record<string, unknown>) =>
    JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) }, parameter: {} }).content);

  const webhook = (update: Record<string, unknown>, secret: string | null = WEBHOOK_SECRET) =>
    ctx.doPost({
      postData: { contents: JSON.stringify(update) },
      parameter: secret === null ? {} : { secret },
    }).content;

  let updateId = 1;
  const shareContact = (userId: number, phone: string, contactUserId: number = userId, secret?: string | null) =>
    webhook(
      {
        update_id: updateId++,
        message: {
          chat: { id: userId, type: 'private' },
          from: { id: userId, username: `user${userId}` },
          contact: { phone_number: phone, user_id: contactUserId },
        },
      },
      secret === undefined ? WEBHOOK_SECRET : secret
    );

  const lastCode = () => {
    const msg = [...sent].reverse().find((m) => /\*(\d{6})\*/.test(m.payload?.text || ''));
    return msg ? msg.payload.text.match(/\*(\d{6})\*/)[1] : null;
  };

  const login = (userId: number, phone: string) => {
    shareContact(userId, phone);
    api({ action: 'auth.requestCode', phone });
    return api({ action: 'auth.verifyCode', phone, code: lastCode() }).data.token as string;
  };

  return { ctx, props, cache, sent, sheets, stats, api, webhook, shareContact, lastCode, login, blockedChats };
}

function signInitData(fields: Record<string, string>, botToken = BOT_TOKEN) {
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');
  const hash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}

const nowSec = () => String(Math.floor(Date.now() / 1000));

describe('Apps Script: telefon raqami bilan kirish', () => {
  let env: ReturnType<typeof createEnv>;
  beforeEach(() => {
    env = createEnv();
  });

  it('eski parolsiz kirish amallari endi token bermaydi', () => {
    expect(env.api({ action: 'auth.checkPhone', phone: '+998900000001' }).error.code).toBe('UNKNOWN_ACTION');
    expect(env.api({ action: 'auth.loginDirect', phone: '+998900000001' }).error.code).toBe('UNKNOWN_ACTION');
    const get = JSON.parse(env.ctx.doGet({ parameter: { action: 'checkPhone', phone: '+998900000001' } }).content);
    expect(JSON.stringify(get)).not.toContain('epco_tok_');
  });

  it('jadvalda yo\'q raqam -> NOT_FOUND, botga ulanmagan raqam -> NEED_PHONE_LINK', () => {
    expect(env.api({ action: 'auth.requestCode', phone: '+998 90 000 00 01' }).data.status).toBe('NEED_PHONE_LINK');
    expect(env.lastCode()).toBeNull();
  });

  it('bazada yo\'q yangi mijoz ham kiradi, lekin registered: false', () => {
    env.shareContact(555, '+998999999999');
    expect(env.api({ action: 'auth.requestCode', phone: '+998999999999' }).data.status).toBe('CODE_SENT');
    const login = env.api({ action: 'auth.verifyCode', phone: '+998999999999', code: env.lastCode() });
    expect(login.data.registered).toBe(false);
    const boot = env.api({ action: 'bootstrap', token: login.data.token }).data;
    expect(boot.registered).toBe(false);
    expect(boot.stats).toBeUndefined();
    expect(boot.leaderboard).toBeUndefined();
  });

  it('o\'z kontaktini ulashgan foydalanuvchi kodni oladi va kiradi', () => {
    env.shareContact(111, '+998900000001');
    const res = env.api({ action: 'auth.requestCode', phone: '+998 (90) 000-00-01' });
    expect(res.data.status).toBe('CODE_SENT');

    const codeMsg = env.sent.find((m) => /\*\d{6}\*/.test(m.payload?.text || ''))!;
    expect(String(codeMsg.payload.chat_id)).toBe('111');

    const login = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: env.lastCode() });
    expect(login.success).toBe(true);
    expect(login.data.token).toMatch(/^epco_tok_[0-9a-f]{64}$/);

    const me = env.api({ action: 'me', token: login.data.token });
    expect(me.success).toBe(true);
    expect(me.data.user.name).toBe('Alisher Usta');
  });

  it('kodni qayta so\'rash 1 daqiqa ichida cheklangan', () => {
    env.shareContact(111, '+998900000001');
    expect(env.api({ action: 'auth.requestCode', phone: '+998900000001' }).data.status).toBe('CODE_SENT');
    expect(env.api({ action: 'auth.requestCode', phone: '+998900000001' }).data.status).toBe('TOO_SOON');
  });

  it('5 marta noto\'g\'ri kiritilgach to\'g\'ri kod ham qabul qilinmaydi', () => {
    env.shareContact(111, '+998900000001');
    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const code = env.lastCode()!;
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      expect(env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: wrong }).success).toBe(false);
    }
    const res = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code });
    expect(res.success).toBe(false);
    expect(res.error.message).toContain('Urinishlar soni tugadi');
  });

  it('kod bir martalik', () => {
    env.shareContact(111, '+998900000001');
    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const code = env.lastCode();
    expect(env.api({ action: 'auth.verifyCode', phone: '+998900000001', code }).success).toBe(true);
    expect(env.api({ action: 'auth.verifyCode', phone: '+998900000001', code }).success).toBe(false);
  });

  it('2.1.0 dagi muddatsiz tokenlar bekor qilinadi, logout tokenni o\'chiradi', () => {
    env.props.set('tok_epco_tok_legacy', '900000001');
    expect(env.api({ action: 'me', token: 'epco_tok_legacy' }).error.code).toBe('UNAUTHORIZED');

    env.shareContact(111, '+998900000001');
    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const { token } = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: env.lastCode() }).data;
    expect(env.api({ action: 'auth.logout', token }).success).toBe(true);
    expect(env.api({ action: 'me', token }).error.code).toBe('UNAUTHORIZED');
  });
});

describe('Apps Script: Telegram webhook', () => {
  let env: ReturnType<typeof createEnv>;
  beforeEach(() => {
    env = createEnv();
  });

  it('secret\'siz yoki noto\'g\'ri secret bilan kelgan update e\'tiborsiz qoldiriladi', () => {
    env.shareContact(666, '+998900000001', 666, null);
    env.shareContact(666, '+998900000001', 666, 'wrong_secret_value_xx');
    expect(env.props.has('tg_chat_900000001')).toBe(false);
    expect(env.sent).toHaveLength(0);
  });

  it('WEBHOOK_SECRET o\'rnatilmagan bo\'lsa ham update qabul qilinmaydi', () => {
    env.props.delete('WEBHOOK_SECRET');
    env.shareContact(666, '+998900000001', 666, '');
    expect(env.props.has('tg_chat_900000001')).toBe(false);
  });

  it('begona kontaktni yuborish raqamni ulamaydi', () => {
    env.shareContact(666, '+998900000001', 111); // 666 boshqa odamning (111) kontaktini yubordi
    expect(env.props.has('tg_chat_900000001')).toBe(false);
    expect(env.sent[0].payload.text).toContain('faqat o\'zingizning raqamingizni');
  });

  it('raqam yangi egasiga o\'tganda eski Telegram akkaunt uzib qo\'yiladi', () => {
    env.shareContact(111, '+998900000001');
    env.shareContact(222, '+998900000001');
    expect(env.props.get('tg_chat_900000001')).toBe('222');
    expect(env.props.has('tg_phone_111')).toBe(false);
  });

  it('setTelegramWebhook manzilga secret qo\'shadi', () => {
    env.ctx.setTelegramWebhook();
    const call = env.sent.find((m) => m.url.includes('/setWebhook'))!;
    const hookUrl = decodeURIComponent(call.url.split('url=')[1]);
    expect(hookUrl).toBe(`https://script.google.com/macros/s/TEST/exec?secret=${WEBHOOK_SECRET}`);
  });
});

describe('Apps Script: Telegram Mini App (HMAC)', () => {
  let env: ReturnType<typeof createEnv>;
  beforeEach(() => {
    env = createEnv();
    env.shareContact(111, '+998900000001');
  });

  const fieldsFor = (id: number, extra: Record<string, string> = {}) => ({
    auth_date: nowSec(),
    query_id: 'AAH_test',
    user: JSON.stringify({ id, first_name: 'Alisher Usta', username: 'alisher' }),
    ...extra,
  });

  it('to\'g\'ri imzolangan initData bilan kiradi', () => {
    const res = env.api({ action: 'auth.telegram', initData: signInitData(fieldsFor(111)) });
    expect(res.success).toBe(true);
    expect(res.data.token).toMatch(/^epco_tok_/);
    expect(res.data.registered).toBe(true);
    expect(env.api({ action: 'bootstrap', token: res.data.token }).data.user.name).toBe('Alisher Usta');
  });

  it('"signature" maydoni bor yangi formatdagi initData ham qabul qilinadi', () => {
    const res = env.api({ action: 'auth.telegram', initData: signInitData(fieldsFor(111, { signature: 'abc123' })) });
    expect(res.success).toBe(true);
  });

  it('imzosiz, soxtalashtirilgan yoki boshqa bot tokeni bilan imzolangan initData rad etiladi', () => {
    const unsigned = new URLSearchParams(fieldsFor(111)).toString();
    expect(env.api({ action: 'auth.telegram', initData: unsigned }).success).toBe(false);

    const tampered = signInitData(fieldsFor(222)).replace('%22id%22%3A222', '%22id%22%3A111');
    expect(env.api({ action: 'auth.telegram', initData: tampered }).success).toBe(false);

    const otherBot = signInitData(fieldsFor(111), '999:OTHER_BOT');
    expect(env.api({ action: 'auth.telegram', initData: otherBot }).success).toBe(false);
  });

  it('eskirgan (24 soatdan oldingi) initData rad etiladi', () => {
    const old = String(Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60);
    expect(env.api({ action: 'auth.telegram', initData: signInitData(fieldsFor(111, { auth_date: old })) }).success).toBe(false);
  });
});

describe('Apps Script: reytingda ismlar', () => {
  it('ismlar ochiq ko\'rsatiladi, telefon va summa yuborilmaydi', () => {
    const env = createEnv();
    const board = env.api({ action: 'leaderboard', scope: 'republic' }).data.entries;
    expect(board.map((e: any) => e.maskedName)).toEqual(['Alisher Usta', 'Botir Moyxona', 'Sardor Avto']);
    expect(JSON.stringify(board)).not.toMatch(/900000001|3500/);
  });
});

describe('Apps Script: webhook javobi va takrorlar', () => {
  const startUpdate = (id: number) => ({
    update_id: id,
    message: { chat: { id: 1, type: 'private' }, from: { id: 1 }, text: '/start' },
  });

  it('webhook 302 emas, HtmlService (200) javobini qaytaradi', () => {
    const env = createEnv();
    const out = env.ctx.doPost({
      postData: { contents: JSON.stringify(startUpdate(5)) },
      parameter: { secret: WEBHOOK_SECRET },
    });
    expect(out.kind).toBe('html');
  });

  it('Telegram qayta yuborgan bir xil xabar faqat bir marta ishlanadi', () => {
    const env = createEnv();
    env.webhook(startUpdate(77));
    env.webhook(startUpdate(77));
    expect(env.sent.filter((m) => m.url.includes('/sendMessage'))).toHaveLength(1);
  });

  it('setTelegramWebhook qotib qolgan xabarlarni tozalaydi', () => {
    const env = createEnv();
    env.ctx.setTelegramWebhook();
    expect(env.sent.find((m) => m.url.includes('/setWebhook'))!.url).toContain('drop_pending_updates=true');
  });
});

describe('Apps Script: "Ulanishlar" varag\'i', () => {
  it('botga ulanish, kirish va faollik yoziladi', () => {
    const env = createEnv();
    env.shareContact(111, '+998900000001');

    const sheet = env.sheets['Ulanishlar'];
    expect(sheet).toBeDefined();
    expect(sheet.getRange(1, 1, 1, 11).getValues()[0]).toEqual([
      'Telefon', 'Mijoz', 'Hudud', 'Agent', 'Telegram ID', 'Telegram username',
      'Botga ulangan', 'Oxirgi kirish', 'Oxirgi faollik', 'Kirishlar soni', 'Holat',
    ]);
    expect(sheet.getRange('N1').getValue()).toBe('=COUNTA(A2:A)');
    expect(sheet.getRange(2, 11).getValue()).toBe('Bazada');

    let row = sheet.getRange(2, 1, 1, 10).getValues()[0];
    expect(row.slice(0, 6)).toEqual(['+998 (90) 000-00-01', 'Alisher Usta', '01 Tashkent', 'AG-1', '111', '@user111']);
    expect(Object.prototype.toString.call(row[6])).toBe('[object Date]');
    expect(row[7]).toBe('');
    expect(row[9]).toBe(0);

    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const { token } = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: env.lastCode() }).data;
    env.api({ action: 'bootstrap', token });

    row = sheet.getRange(2, 1, 1, 10).getValues()[0];
    expect(Object.prototype.toString.call(row[7])).toBe('[object Date]');
    expect(Object.prototype.toString.call(row[8])).toBe('[object Date]');
    expect(row[9]).toBe(1);
    expect(sheet.getLastRow()).toBe(2); // bitta mijoz — bitta qator

    // ikkinchi mijoz alohida qatorga tushadi
    env.shareContact(222, '+998910000002');
    expect(sheet.getLastRow()).toBe(3);
    expect(sheet.getRange(3, 2).getValue()).toBe('Botir Moyxona');
  });
});

describe('Apps Script: bootstrap (ilova ochilganda bitta so\'rov)', () => {
  it('frontend kutgan maydonlarni to\'g\'ri raqamlar bilan qaytaradi', () => {
    const env = createEnv();
    const token = env.login(111, '+998900000001');
    const boot = env.api({ action: 'bootstrap', token }).data;

    expect(boot.registered).toBe(true);
    expect(boot.user.name).toBe('Alisher Usta');
    expect(boot.user.region).toBe('01 Tashkent');

    const s = boot.stats;
    // Alisher: $3500, qarzsiz -> 3 bilet; 1-o'rin (3500 > 1200 > 800)
    expect(s.confirmedAmount).toBe(3500);
    expect(s.tickets).toBe(3);
    expect(s.activeTicketsCount).toBe(3);
    expect(s.gapToNextTicket).toBe(500);
    expect(s.currentRank).toBe(1);
    expect(s.totalParticipants).toBe(3);
    expect(s.gapToFirstPlace).toBe(0);
    // Faol biletlar: Alisher 3 + Sardor 0 (800$) ; Botir qarzdor -> T = 3 <= K -> 100%
    expect(boot.config.totalConfirmedTicketsPool).toBe(3);
    expect(s.probPercent).toBe(100);
    for (const key of ['daysRemainingInMonth', 'probNextJump', 'probFourMonthStreak', 'gapToTop10', 'activeParticipants']) {
      expect(s[key], key).not.toBeUndefined();
    }
    expect(JSON.stringify(boot)).not.toContain('null');
    expect(JSON.stringify(boot)).not.toContain('NaN');
  });

  it('reytingda "men" belgilanadi, boshqalarning to\'lov summasi yuborilmaydi', () => {
    const env = createEnv();
    const token = env.login(333, '+998930000003'); // Sardor — 3-o'rin, $800
    const boot = env.api({ action: 'bootstrap', token }).data;

    const me = boot.leaderboard.republic.find((e: any) => e.isMe);
    expect(me.rank).toBe(3);
    expect(boot.stats.currentRank).toBe(3);
    expect(boot.stats.gapToNextRank).toBe(401); // 1200 - 800 + 1
    expect(boot.stats.gapToFirstPlace).toBe(2701); // 3500 - 800 + 1
    expect(boot.leaderboard.region).toHaveLength(1); // Samarqandda faqat o'zi
    expect(boot.leaderboard.region[0].isMe).toBe(true);
    expect(JSON.stringify(boot.leaderboard)).not.toMatch(/turnover|paidAmount|3500|1200/);
  });

  it('qarzdorning biletlari nofaol', () => {
    const env = createEnv();
    const token = env.login(222, '+998910000002'); // Botir — $1200, qarz 150
    const boot = env.api({ action: 'bootstrap', token }).data;
    expect(boot.stats.isDebtCleared).toBe(false);
    expect(boot.stats.tickets).toBe(1);
    expect(boot.stats.activeTicketsCount).toBe(0);
    expect(boot.stats.debtAmount).toBe(150);
    expect(boot.tickets[0].status).toBe('pending_debt');
  });

  it('jadval keshlanadi: ketma-ket so\'rovlar varaqni qayta o\'qimaydi', () => {
    const env = createEnv();
    const token = env.login(111, '+998900000001');
    const before = env.stats.masterReads;
    env.api({ action: 'bootstrap', token });
    env.api({ action: 'bootstrap', token });
    env.api({ action: 'leaderboard' });
    expect(env.stats.masterReads).toBe(before);
  });
});

describe('Apps Script: bilet raqamlari va tekshiruv', () => {
  it('bilet raqamlari mijozlar orasida takrorlanmaydi va haqiqatan tekshiriladi', () => {
    const env = createEnv();
    const t1 = env.api({ action: 'bootstrap', token: env.login(111, '+998900000001') }).data.tickets;
    const t2 = env.api({ action: 'bootstrap', token: env.login(222, '+998910000002') }).data.tickets;
    expect(t1).toHaveLength(3);
    expect(t1[0].ticketNumber).not.toBe(t2[0].ticketNumber);

    const ok = env.api({ action: 'ticket.verify', ticketNumber: t1[2].ticketNumber }).data;
    expect(ok.valid).toBe(true);
    expect(ok.ownerMasked).toBe('Alisher Usta');

    const tooHigh = t1[2].ticketNumber.replace(/-003$/, '-004'); // Alisherda faqat 3 ta bilet
    expect(env.api({ action: 'ticket.verify', ticketNumber: tooHigh }).data.valid).toBe(false);
    expect(env.api({ action: 'ticket.verify', ticketNumber: 'EPCO-2610-0001' }).data.valid).toBe(false);
  });
});

describe('Apps Script: yangi mijoz anketasi', () => {
  it('anketa "Yangi_mijozlar" varag\'iga yoziladi, formula kiritib bo\'lmaydi', () => {
    const env = createEnv();
    const token = env.login(555, '+998999999999');
    const res = env.api({
      action: 'lead.submit',
      token,
      lead: {
        name: 'Jasur', activity: 'Moyxona', shopName: '=IMPORTXML("http://x")', region: '05 Samarqand',
        district: 'Urgut', volume: '100–500 litr', brands: 'Lukoil', source: 'Agent',
      },
    });
    expect(res.success).toBe(true);

    const row = env.sheets['Yangi_mijozlar'].getRange(2, 1, 1, 12).getValues()[0];
    expect(row.slice(1, 4)).toEqual(['+998 (99) 999-99-99', 'Jasur', 'Moyxona']);
    expect(row[4]).toBe('\'=IMPORTXML("http://x")');
    expect(row[11]).toBe('Yangi');

    expect(env.api({ action: 'bootstrap', token }).data.leadSubmitted).toBe(true);
    const activity = env.sheets['Ulanishlar'];
    expect(activity.getRange(2, 11).getValue()).toBe("Anketa to'ldirdi");
  });

  it('ism va faoliyat turisiz anketa qabul qilinmaydi', () => {
    const env = createEnv();
    const token = env.login(555, '+998999999999');
    expect(env.api({ action: 'lead.submit', token, lead: { name: '' } }).success).toBe(false);
  });
});

describe('Apps Script: admin panel', () => {
  const setup = () => {
    const env = createEnv();
    env.props.set('ADMIN_PHONES', '+998 90 000 00 01');
    const admin = env.login(111, '+998900000001'); // Alisher — admin
    const user = env.login(222, '+998910000002'); // Botir — oddiy mijoz
    env.shareContact(555, '+998999999999'); // bazada yo'q, botga ulangan
    env.sent.length = 0;
    return { env, admin, user };
  };

  it('oddiy mijoz admin amallariga kira olmaydi, admin bootstrap\'da isAdmin oladi', () => {
    const { env, admin, user } = setup();
    expect(env.api({ action: 'admin.overview', token: user }).error.code).toBe('FORBIDDEN');
    expect(env.api({ action: 'admin.overview' }).error.code).toBe('UNAUTHORIZED');
    expect(env.api({ action: 'bootstrap', token: admin }).data.isAdmin).toBe(true);
    expect(env.api({ action: 'bootstrap', token: user }).data.isAdmin).toBe(false);
  });

  it('statistika: bazadagilar, botga ulanganlar, viloyatlar', () => {
    const { env, admin } = setup();
    const o = env.api({ action: 'admin.overview', token: admin }).data;
    expect(o.mastersTotal).toBe(3);
    expect(o.linkedTotal).toBe(3);
    expect(o.regions).toEqual(['01 Tashkent', '03 Andijon', '05 Samarqand']);
  });

  it('sovg\'alar va jonli efir sozlanadi va ilovaga chiqadi', () => {
    const { env, admin, user } = setup();
    const bad = env.api({ action: 'admin.settings.update', token: admin, settings: { liveUrl: 'http://evil.com' } });
    expect(bad.success).toBe(false);
    env.api({
      action: 'admin.settings.update', token: admin,
      settings: { grandPrize: 'Chevrolet DAMAS', prizesText: '1 500$ sovg\'alar', liveUrl: 'https://youtu.be/abc123' },
    });
    const cfg = env.api({ action: 'bootstrap', token: user }).data.config;
    expect(cfg.prizesText).toBe('1 500$ sovg\'alar');
    expect(cfg.liveUrl).toBe('https://youtu.be/abc123');
    expect(cfg.firstPlacePrize).toBeUndefined();
  });

  it('g\'olib qo\'shiladi (ism bazadan), xabar yuboriladi va o\'chiriladi', () => {
    const { env, admin, user } = setup();
    const res = env.api({
      action: 'admin.winner.add', token: admin,
      winner: { phone: '+998910000002', prize: 'Chevrolet DAMAS', month: 'Oktyabr 2026', videoUrl: 'https://www.youtube.com/watch?v=x1', notify: true },
    }).data;
    expect(res.notified).toBe(true);
    expect(res.winners[0]).toMatchObject({ winnerName: 'Botir Moyxona', region: '03 Andijon', prize: 'Chevrolet DAMAS' });
    const msg = env.sent.find((m) => m.url.endsWith('/sendMessage'))!;
    expect(String(msg.payload.chat_id)).toBe('222');
    expect(msg.payload.text).toContain('Tabriklaymiz');

    expect(env.api({ action: 'bootstrap', token: user }).data.winners[0].videoUrl).toBe('https://www.youtube.com/watch?v=x1');
    const after = env.api({ action: 'admin.winner.delete', token: admin, id: res.winners[0].id }).data;
    expect(after.winners).toHaveLength(0);
  });

  it('matnli xabar: tanlangan guruhga yuboriladi, natija "Xabarlar"ga yoziladi', () => {
    const { env, admin } = setup();
    expect(env.api({ action: 'admin.broadcast.preview', token: admin, target: { type: 'all' } }).data.count).toBe(3);
    expect(env.api({ action: 'admin.broadcast.preview', token: admin, target: { type: 'new' } }).data.count).toBe(1);
    expect(env.api({ action: 'admin.broadcast.preview', token: admin, target: { type: 'region', value: '03 Andijon' } }).data.count).toBe(1);

    env.blockedChats.add('555'); // botni bloklagan
    const res = env.api({
      action: 'admin.broadcast.create', token: admin,
      broadcast: { kind: 'text', text: 'Yangi aksiya!', target: { type: 'all' }, buttonText: 'Ilovani ochish', buttonUrl: 'https://example.uz' },
    }).data;
    expect(res.broadcasts[0]).toMatchObject({ total: 3, sent: 2, failed: 1, status: 'Yuborildi' });
    const one = env.sent.find((m) => m.url.endsWith('/sendMessage'))!;
    expect(one.payload.reply_markup.inline_keyboard[0][0].url).toBe('https://example.uz');
  });

  it('rasmli e\'lon: rasm bir marta yuklanadi, keyin file_id bilan yuboriladi', () => {
    const { env, admin } = setup();
    const img = 'data:image/jpeg;base64,' + Buffer.from('fake-image').toString('base64');
    env.api({ action: 'admin.broadcast.create', token: admin, broadcast: { kind: 'photo', text: 'Chegirma!', imageBase64: img, target: { type: 'registered' } } });
    expect(env.sent.filter((m) => m.url.endsWith('/sendPhoto') && m.payload.photo === 'FILE_BIG')).toHaveLength(2);
  });

  it('so\'rovnoma: hammaga forward qilinadi, javoblar varaqqa yoziladi', () => {
    const { env, admin } = setup();
    env.api({
      action: 'admin.broadcast.create', token: admin,
      broadcast: { kind: 'poll', pollQuestion: 'Qaysi moy ko\'p sotiladi?', pollOptions: ['5W-30', '10W-40', ''], target: { type: 'all' } },
    });
    const forwards = env.sent.filter((m) => m.url.endsWith('/forwardMessage'));
    expect(forwards).toHaveLength(3);
    expect(forwards[0].payload.message_id).toBe(77);

    env.webhook({ update_id: 9001, poll_answer: { poll_id: 'POLL1', user: { id: 222, username: 'botir' }, option_ids: [1] } });
    const row = env.sheets['Sorovnoma_javoblari'].getRange(2, 1, 1, 7).getValues()[0];
    expect(row.slice(1)).toEqual(["Qaysi moy ko'p sotiladi?", '+998 (91) 000-00-02', 'Botir Moyxona', '03 Andijon', '@botir', '10W-40']);
  });

  it('ko\'p qabul qiluvchi: vaqt tugasa navbatda qoladi va trigger davom ettiradi', () => {
    const { env, admin } = setup();
    for (let i = 0; i < 60; i++) env.props.set(`tg_chat_93${String(i).padStart(7, '0')}`, String(10000 + i));
    const ctxDate = vm.runInContext('Date', env.ctx);
    const realNow = ctxDate.now;
    let t = realNow();
    ctxDate.now = () => (t += 15000); // har chaqiruvda 15 soniya "o'tadi"
    try {
      const res = env.api({ action: 'admin.broadcast.create', token: admin, broadcast: { kind: 'text', text: 'Salom', target: { type: 'all' } } }).data;
      expect(res.broadcasts[0].status).toBe('Yuborilmoqda');
      expect(res.broadcasts[0].sent).toBeLessThan(63);
    } finally {
      ctxDate.now = realNow;
    }
    env.ctx.processBroadcasts();
    const list = env.api({ action: 'admin.broadcast.list', token: admin }).data.broadcasts;
    expect(list[0]).toMatchObject({ total: 63, sent: 63, status: 'Yuborildi' });
  });
});
