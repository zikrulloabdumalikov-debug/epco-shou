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

  const ustalar = {
    getLastRow: () => ROWS.length + 1,
    getLastColumn: () => 9,
    getRange: () => ({ getValues: () => ROWS.map((r) => r.slice()) }),
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
      newBlob: () => {
        let data = Buffer.alloc(0);
        const blob = {
          setDataFromString: (s: string) => {
            data = Buffer.from(s, 'utf8');
            return blob;
          },
          getBytes: () => toSigned(data),
        };
        return blob;
      },
      formatDate: () => '2026-10',
      base64Encode: (bytes: number[]) => fromSigned(bytes).toString('base64'),
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
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    HtmlService: { createHtmlOutput: (content: string) => ({ content, kind: 'html' }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (content: string) => ({ content, setMimeType() { return this; } }),
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (name: string) => sheets[name] || null,
        getSheets: () => Object.values(sheets),
        insertSheet: (name: string) => (sheets[name] = new GridSheet()),
      }),
    },
    UrlFetchApp: {
      fetch: (url: string, opts: any) => {
        sent.push({ url, payload: opts && opts.payload ? JSON.parse(opts.payload) : null });
        return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
      },
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

  return { ctx, props, cache, sent, sheets, api, webhook, shareContact, lastCode };
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
    expect(env.api({ action: 'auth.requestCode', phone: '+998 99 999 99 99' }).data.status).toBe('NOT_FOUND');
    expect(env.api({ action: 'auth.requestCode', phone: '+998 90 000 00 01' }).data.status).toBe('NEED_PHONE_LINK');
    expect(env.lastCode()).toBeNull();
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
    expect(res.data.user.name).toBe('Alisher Usta');
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
  it('rozilik berilmaguncha ism yashirin, rozilikdan keyin ko\'rinadi', () => {
    const env = createEnv();
    const board = () => env.api({ action: 'leaderboard', scope: 'republic' }).data.entries;

    const masked = board().map((e: any) => e.maskedName);
    expect(masked).toEqual(['01 · A***', '03 · B***', '05 · S***']);
    expect(JSON.stringify(board())).not.toContain('Alisher');

    env.shareContact(111, '+998900000001');
    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const { token } = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: env.lastCode() }).data;
    env.api({ action: 'consent.update', token, consent: true });

    expect(board()[0].maskedName).toBe('Alisher Usta');
    expect(board()[1].maskedName).toBe('03 · B***');
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
    expect(sheet.getRange(1, 1, 1, 10).getValues()[0]).toEqual([
      'Telefon', 'Mijoz', 'Hudud', 'Agent', 'Telegram ID', 'Telegram username',
      'Botga ulangan', 'Oxirgi kirish', 'Oxirgi faollik', 'Kirishlar soni',
    ]);
    expect(sheet.getRange('M1').getValue()).toBe('=COUNTA(A2:A)');

    let row = sheet.getRange(2, 1, 1, 10).getValues()[0];
    expect(row.slice(0, 6)).toEqual(['+998 (90) 000-00-01', 'Alisher Usta', '01 Tashkent', 'AG-1', '111', '@user111']);
    expect(Object.prototype.toString.call(row[6])).toBe('[object Date]');
    expect(row[7]).toBe('');
    expect(row[9]).toBe(0);

    env.api({ action: 'auth.requestCode', phone: '+998900000001' });
    const { token } = env.api({ action: 'auth.verifyCode', phone: '+998900000001', code: env.lastCode() }).data;
    env.api({ action: 'me', token });

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
