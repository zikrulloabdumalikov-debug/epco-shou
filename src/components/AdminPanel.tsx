import React, { useCallback, useEffect, useState } from 'react';
import { Search, Send, Trash2, Phone, CalendarClock, Dices, Archive, MonitorPlay, UserPlus } from 'lucide-react';
import { PastWinner } from '../types';
import { apiService } from '../services/apiService';
import { playSuccessFanfare } from '../utils/audio';
import { money } from '../i18n/lang';
import { DrawShow, DrawWinner } from './DrawShow';

// ── Server javoblari ─────────────────────────────────────────────────────

interface Broadcast {
  id: string;
  date: string;
  kind: string;
  text: string;
  target: string;
  total: number;
  sent: number;
  failed: number;
  status: string;
  sendAt: string;
  pollResults: { voters: number; options: { option: string; count: number }[] } | null;
}

interface Template {
  id: string;
  title: string;
  text: string;
}

interface TeamMember {
  phone: string;
  name: string;
  role: 'admin' | 'agent';
  agentCode: string;
}

interface Overview {
  role: 'admin' | 'agent';
  agentCode: string;
  mastersTotal: number;
  linkedTotal: number;
  debtFreeTotal: number;
  activeToday: number;
  month: string;
  monthName: string;
  regions: string[];
  // faqat admin uchun
  leadsTotal?: number;
  recentLeads?: { date: string; phone: string; name: string; activity: string; region: string }[];
  settings?: { grandPrize: string; prizesText: string; prizesTextRu: string; liveUrl: string };
  winners?: PastWinner[];
  broadcasts?: Broadcast[];
  templates?: Template[];
  team?: TeamMember[];
  draw?: DrawWinner[];
  agents?: string[];
}

interface ClientCard {
  phone: string;
  name: string;
  region: string;
  agent: string;
  paid: number;
  debt: number;
  tickets: number;
  isDebtCleared: boolean;
  gapToNextTicket: number;
  rank: number;
  linked: boolean;
  linkedAt: string;
  lastLogin: string;
  lastActive: string;
}

interface StatRow {
  key: string;
  clients: number;
  linked: number;
  debtFree: number;
  tickets: number;
  activeTickets: number;
  paid: number;
}

type Section = 'overview' | 'search' | 'broadcast' | 'draw' | 'winners' | 'stats' | 'team' | 'settings';
type TargetType = 'all' | 'registered' | 'new' | 'region' | 'phone';
type Kind = 'text' | 'photo' | 'poll';

const card = 'card p-4 space-y-3';

const formatDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** Telefondan tanlangan rasmni 1280px gacha kichraytirib JPEG (base64) qiladi */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Rasmni o\'qib bo\'lmadi'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Rasm formati qo\'llab-quvvatlanmaydi'));
      img.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="card p-3">
    <div className="text-xs text-muted">{label}</div>
    <div className="text-2xl font-extrabold text-brand tabular-nums">{money(value)}</div>
  </div>
);

export const AdminPanel: React.FC<{ currentMonth: string }> = ({ currentMonth }) => {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isAdmin = data?.role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiService.admin<Overview>('overview');
    setLoading(false);
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.error?.message || 'Ma\'lumotni yuklab bo\'lmadi');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (p: Partial<Overview>) => setData((prev) => (prev ? { ...prev, ...p } : prev));

  const run = async <T,>(action: string, payload: Record<string, any>, success: string | null, apply?: (d: T) => void) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await apiService.admin<T>(action, payload);
    setBusy(false);
    if (res.success && res.data) {
      if (success) {
        playSuccessFanfare();
        setNotice(success);
      }
      apply?.(res.data); // apply aniqroq xabar qo'yishi mumkin
      return res.data;
    }
    setError(res.error?.message || 'Xatolik yuz berdi');
    return null;
  };

  // ── Qidiruv ──
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState<ClientCard[] | null>(null);

  // ── Xabar ──
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetValue, setTargetValue] = useState('');
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);
  const [sendAt, setSendAt] = useState('');

  // ── Boshqalar ──
  const [winner, setWinner] = useState({ month: currentMonth, phone: '', name: '', region: '', prize: '', videoUrl: '', notify: true });
  const [settings, setSettings] = useState({ grandPrize: '', prizesText: '', prizesTextRu: '', liveUrl: '' });
  const [member, setMember] = useState({ phone: '', name: '', role: 'agent' as 'admin' | 'agent', agentCode: '' });
  const [stats, setStats] = useState<{ regions: StatRow[]; agents: StatRow[] } | null>(null);
  const [drawNotify, setDrawNotify] = useState(true);
  const [showDraw, setShowDraw] = useState(false);

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data?.settings]);

  useEffect(() => {
    if (section === 'stats' && !stats) {
      apiService.admin<{ regions: StatRow[]; agents: StatRow[] }>('stats').then((res) => {
        if (res.success && res.data) setStats(res.data);
        else setError(res.error?.message || 'Statistikani yuklab bo\'lmadi');
      });
    }
  }, [section, stats]);

  const searchClients = async () => {
    const d = await run<{ clients: ClientCard[] }>('client.search', { query }, null);
    if (d) setClients(d.clients);
  };

  const messageClient = (phone: string) => {
    setTargetType('phone');
    setTargetValue(phone);
    setSection('broadcast');
    window.scrollTo({ top: 0 });
  };

  const sendBroadcast = async () => {
    const target = { type: targetType, value: targetValue.trim() };
    const scheduledIso = sendAt ? new Date(sendAt).toISOString() : '';
    if (!scheduledIso) {
      const preview = await apiService.admin<{ count: number }>('broadcast.preview', { target });
      const count = preview.data?.count || 0;
      if (!preview.success || count === 0) {
        setError(preview.error?.message || 'Tanlangan guruhda botga ulangan mijoz yo\'q');
        return;
      }
      if (!confirm(`Xabar ${count} ta mijozga yuboriladi. Davom etasizmi?`)) return;
    } else if (!confirm(`Xabar ${formatDate(scheduledIso)} da yuboriladi. Tasdiqlaysizmi?`)) {
      return;
    }

    const d = await run<{ broadcasts: Broadcast[] }>(
      'broadcast.create',
      {
        broadcast: {
          kind,
          text,
          target,
          sendAt: scheduledIso || undefined,
          imageBase64: kind === 'photo' ? image : undefined,
          buttonText: kind !== 'poll' ? buttonText : undefined,
          buttonUrl: kind !== 'poll' ? buttonUrl : undefined,
          pollQuestion: kind === 'poll' ? text : undefined,
          pollOptions: kind === 'poll' ? pollOptions : undefined,
          pollMultiple,
        },
      },
      scheduledIso ? 'Xabar rejalashtirildi.' : 'Xabar yuborilmoqda. Ko\'p mijozga bir necha daqiqa ketadi.',
      (r) => patch({ broadcasts: r.broadcasts })
    );
    if (d) {
      setText('');
      setImage(null);
      setButtonText('');
      setButtonUrl('');
      setPollOptions(['', '']);
      setSendAt('');
    }
  };

  const tabs: [Section, string][] = isAdmin
    ? [
        ['overview', 'Umumiy'],
        ['search', 'Qidiruv'],
        ['broadcast', 'Xabar'],
        ['draw', 'Tanlov'],
        ['winners', 'G\'oliblar'],
        ['stats', 'Statistika'],
        ['team', 'Jamoa'],
        ['settings', 'Sozlama'],
      ]
    : [
        ['overview', 'Umumiy'],
        ['search', 'Mijozlarim'],
        ['stats', 'Statistika'],
      ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">{isAdmin ? 'Admin panel' : 'Agent paneli'}</h2>
          {data && !isAdmin && <div className="text-sm text-muted">Agent: {data.agentCode}</div>}
        </div>
        <button onClick={load} disabled={loading} className="icon-btn w-auto px-3">
          {loading ? '...' : 'Yangilash'}
        </button>
      </div>

      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setSection(key);
                setNotice(null);
                setError(null);
              }}
              className={`h-10 px-4 rounded-full text-sm font-bold whitespace-nowrap border ${
                section === key ? 'bg-brand text-white border-brand' : 'bg-surface text-muted border-line'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="p-3.5 rounded-2xl bg-bad-soft text-bad text-sm">{error}</div>}
      {notice && <div className="p-3.5 rounded-2xl bg-ok-soft text-ok text-sm">{notice}</div>}
      {!data && loading && <div className="text-center text-muted py-10">Yuklanmoqda...</div>}

      {/* ── UMUMIY ── */}
      {data && section === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={isAdmin ? 'Bazadagi mijozlar' : 'Mijozlarim'} value={data.mastersTotal} />
            <Stat label="Botga ulanganlar" value={data.linkedTotal} />
            <Stat label="Qarzsizlar" value={data.debtFreeTotal} />
            <Stat label="Bugun faol" value={data.activeToday} />
          </div>

          {isAdmin && (
            <div className={card}>
              <h3 className="font-bold">Yangi anketalar · {data.leadsTotal}</h3>
              {!data.recentLeads?.length && <p className="text-sm text-muted">Hozircha yo'q</p>}
              {data.recentLeads?.map((l, i) => (
                <div key={i} className="text-sm border-t border-line pt-2 first:border-0 first:pt-0">
                  <div className="font-semibold">
                    {l.name} · <a href={`tel:+${l.phone.replace(/\D/g, '')}`} className="text-brand tabular-nums">{l.phone}</a>
                  </div>
                  <div className="text-xs text-muted">
                    {l.activity} · {l.region} · {formatDate(l.date)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isAdmin && data.broadcasts && (
            <BroadcastList
              broadcasts={data.broadcasts}
              onCancel={(id) => run<{ broadcasts: Broadcast[] }>('broadcast.cancel', { id }, 'Bekor qilindi', (r) => patch({ broadcasts: r.broadcasts }))}
            />
          )}
        </div>
      )}

      {/* ── QIDIRUV ── */}
      {data && section === 'search' && (
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchClients();
            }}
            className="flex gap-2"
          >
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ism, telefon yoki agent kodi" className="field" />
            <button type="submit" disabled={busy || query.trim().length < 2} className="btn btn-primary px-4 shrink-0" aria-label="Qidirish">
              <Search size={20} />
            </button>
          </form>
          {clients && clients.length === 0 && <div className="text-center text-muted py-6">Hech narsa topilmadi</div>}
          {clients?.map((c) => (
            <div key={c.phone} className={card}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold">{c.name}</div>
                  <a href={`tel:+${c.phone.replace(/\D/g, '')}`} className="text-sm text-brand tabular-nums flex items-center gap-1">
                    <Phone size={13} /> {c.phone}
                  </a>
                  <div className="text-xs text-muted">
                    {c.region} · {c.agent || '—'} · #{c.rank}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${c.linked ? 'bg-ok-soft text-ok' : 'bg-page text-muted'}`}>
                  {c.linked ? 'Botda' : 'Botga ulanmagan'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-page p-2">
                  <div className="font-bold tabular-nums">{money(c.paid)}</div>
                  <div className="text-[11px] text-muted">pul kirim</div>
                </div>
                <div className={`rounded-xl p-2 ${c.isDebtCleared ? 'bg-page' : 'bg-bad-soft'}`}>
                  <div className={`font-bold tabular-nums ${c.isDebtCleared ? '' : 'text-bad'}`}>{money(c.debt)}</div>
                  <div className="text-[11px] text-muted">qarz</div>
                </div>
                <div className="rounded-xl bg-page p-2">
                  <div className="font-bold tabular-nums">{c.tickets}</div>
                  <div className="text-[11px] text-muted">{c.isDebtCleared ? 'faol bilet' : 'nofaol bilet'}</div>
                </div>
              </div>
              <div className="text-xs text-muted">
                Keyingi biletgacha: {money(c.gapToNextTicket)} · Oxirgi faollik: {formatDate(c.lastActive)}
              </div>
              {isAdmin && c.linked && (
                <button onClick={() => messageClient(c.phone)} className="btn btn-soft w-full min-h-[44px] text-sm">
                  <Send size={16} /> Shaxsiy xabar yuborish
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── XABAR ── */}
      {data && isAdmin && section === 'broadcast' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-bold">Kimga?</h3>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} className="field">
              <option value="all">Hammaga (botga ulangan barcha)</option>
              <option value="registered">Faqat bazadagi mijozlarga</option>
              <option value="new">Faqat yangi (bazada yo'q) mijozlarga</option>
              <option value="region">Viloyat bo'yicha</option>
              <option value="phone">Bitta raqamga</option>
            </select>
            {targetType === 'region' && (
              <select value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="field">
                <option value="">— viloyatni tanlang —</option>
                {data.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
            {targetType === 'phone' && (
              <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="+998 90 123 45 67" className="field" />
            )}
          </div>

          <div className={card}>
            <div className="grid grid-cols-3 gap-1 p-1 bg-page rounded-xl">
              {([['text', 'Matn'], ['photo', 'Rasm'], ['poll', 'So\'rovnoma']] as [Kind, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`min-h-[40px] rounded-lg text-sm font-bold ${kind === k ? 'bg-brand text-white' : 'text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {kind !== 'poll' && !!data.templates?.length && (
              <div className="flex flex-wrap gap-2">
                {data.templates.map((t) => (
                  <span key={t.id} className="inline-flex items-center rounded-full bg-brand-soft text-brand-dark text-sm">
                    <button onClick={() => setText(t.text)} className="pl-3 pr-1 py-1.5 font-semibold">
                      {t.title}
                    </button>
                    <button
                      onClick={() =>
                        confirm(`"${t.title}" shabloni o'chirilsinmi?`) &&
                        run<{ templates: Template[] }>('template.delete', { id: t.id }, null, (r) => patch({ templates: r.templates }))
                      }
                      className="pr-2 pl-1 py-1.5 text-muted"
                      aria-label="O'chirish"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {kind === 'photo' && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      setImage(await compressImage(file));
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-soft file:text-brand"
                />
                {image && <img src={image} alt="" className="w-full max-h-56 object-contain rounded-xl border border-line" />}
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={kind === 'poll' ? 2 : 5}
              maxLength={kind === 'poll' ? 300 : kind === 'photo' ? 1000 : 4000}
              placeholder={kind === 'poll' ? 'Savol: masalan, qaysi moy ko\'proq sotiladi?' : 'Xabar matni...'}
              className="field"
            />

            {kind === 'text' && text.trim() && (
              <button
                onClick={() => {
                  const title = prompt('Shablon nomi (masalan: Oy oxiri eslatmasi)');
                  if (title) run<{ templates: Template[] }>('template.save', { template: { title, text } }, 'Shablon saqlandi', (r) => patch({ templates: r.templates }));
                }}
                className="text-sm font-bold text-brand"
              >
                + Shablon sifatida saqlash
              </button>
            )}

            {kind === 'poll' ? (
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))}
                      placeholder={`${i + 1}-javob`}
                      className="field"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="icon-btn shrink-0 self-center">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-sm font-bold text-brand">
                    + Javob qo'shish
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={pollMultiple} onChange={(e) => setPollMultiple(e.target.checked)} className="accent-[var(--color-brand)] w-4 h-4" />
                  Bir nechta javob tanlash mumkin
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Tugma matni (ixtiyoriy)" className="field" />
                <input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." className="field" />
              </div>
            )}

            <label className="block space-y-1">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <CalendarClock size={16} /> Yuborish vaqti (bo'sh qoldirsangiz — hozir)
              </span>
              <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="field" />
            </label>

            <button
              onClick={sendBroadcast}
              disabled={busy || !text.trim() || (kind === 'photo' && !image) || ((targetType === 'region' || targetType === 'phone') && !targetValue.trim())}
              className="btn btn-primary w-full"
            >
              <Send size={18} /> {busy ? 'Yuborilmoqda...' : sendAt ? 'Rejalashtirish' : 'Yuborish'}
            </button>
          </div>

          {data.broadcasts && (
            <BroadcastList
              broadcasts={data.broadcasts}
              onCancel={(id) => run<{ broadcasts: Broadcast[] }>('broadcast.cancel', { id }, 'Bekor qilindi', (r) => patch({ broadcasts: r.broadcasts }))}
            />
          )}
        </div>
      )}

      {/* ── TANLOV ── */}
      {data && isAdmin && section === 'draw' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-bold">{data.monthName} — jonli shou tanlovi</h3>
            <p className="text-sm text-muted leading-relaxed">
              Barcha faol (qarzsiz) biletlar orasidan 30 tasi tasodifiy tanlanadi. Natija "Tanlov" varag'iga yoziladi va oyda bir marta o'tkaziladi.
            </p>
            {!data.draw?.length ? (
              <>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={drawNotify} onChange={(e) => setDrawNotify(e.target.checked)} className="accent-[var(--color-brand)] w-4 h-4" />
                  Tanlanganlarga botda tabrik yuborish
                </label>
                <button
                  disabled={busy}
                  onClick={() =>
                    confirm('Tanlov o\'tkazilsinmi? Bu oy uchun natija qayd etiladi.') &&
                    run<{ winners: DrawWinner[]; poolSize: number; notified: number }>(
                      'draw.run',
                      { options: { count: 30, notify: drawNotify } },
                      null,
                      (r) => {
                        patch({ draw: r.winners });
                        setNotice(`Tanlov o'tkazildi: ${r.poolSize} ta faol biletdan ${r.winners.length} tasi tanlandi. Xabar yuborildi: ${r.notified} kishiga.`);
                        setShowDraw(true);
                      }
                    )
                  }
                  className="btn btn-primary w-full"
                >
                  <Dices size={18} /> Tanlovni o'tkazish
                </button>
              </>
            ) : (
              <button onClick={() => setShowDraw(true)} className="btn btn-primary w-full">
                <MonitorPlay size={18} /> Natijani katta ekranda ko'rsatish
              </button>
            )}
          </div>

          {!!data.draw?.length && (
            <div className="card divide-y divide-line">
              {data.draw.map((w) => (
                <div key={w.n} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-7 text-muted tabular-nums">{w.n}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold block truncate">{w.name}</span>
                    <span className="text-xs text-muted">
                      {w.region} · {w.phone}
                    </span>
                  </span>
                  <span className="font-mono text-xs">{w.ticket}</span>
                </div>
              ))}
            </div>
          )}

          <div className={card}>
            <h3 className="font-bold">Oyni yopish</h3>
            <p className="text-sm text-muted">Yangi oy uchun "Ustalar"ni tozalashdan oldin bosing — joriy holat "Arxiv ..." varag'iga nusxalanadi.</p>
            <button
              disabled={busy}
              onClick={() =>
                confirm(`${data.monthName} arxivlansinmi?`) &&
                run<{ archived: string }>('month.archive', {}, null, (r) => setNotice(`Saqlandi: "${r.archived}" varag'i`))
              }
              className="btn btn-soft w-full"
            >
              <Archive size={18} /> Oyni arxivlash
            </button>
          </div>

          {showDraw && !!data.draw?.length && <DrawShow monthName={data.monthName} winners={data.draw} onClose={() => setShowDraw(false)} />}
        </div>
      )}

      {/* ── G'OLIBLAR ── */}
      {data && isAdmin && section === 'winners' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-bold">G'olib qo'shish</h3>
            <input value={winner.month} onChange={(e) => setWinner({ ...winner, month: e.target.value })} placeholder="Oy (masalan: Oktyabr 2026)" className="field" />
            <input value={winner.phone} onChange={(e) => setWinner({ ...winner, phone: e.target.value })} placeholder="Telefon (bazada bo'lsa ism avtomatik)" className="field" />
            <input value={winner.name} onChange={(e) => setWinner({ ...winner, name: e.target.value })} placeholder="Ism (telefon bo'lmasa)" className="field" />
            <input value={winner.region} onChange={(e) => setWinner({ ...winner, region: e.target.value })} placeholder="Viloyat (ixtiyoriy)" className="field" />
            <input value={winner.prize} onChange={(e) => setWinner({ ...winner, prize: e.target.value })} placeholder="Sovg'a (masalan: Chevrolet DAMAS)" className="field" />
            <input value={winner.videoUrl} onChange={(e) => setWinner({ ...winner, videoUrl: e.target.value })} placeholder="YouTube havola (ixtiyoriy)" className="field" />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={winner.notify} onChange={(e) => setWinner({ ...winner, notify: e.target.checked })} className="accent-[var(--color-brand)] w-4 h-4" />
              G'olibga botda tabrik xabari yuborish
            </label>
            <button
              disabled={busy || !winner.prize.trim() || (!winner.phone.trim() && !winner.name.trim())}
              onClick={() =>
                run<{ winners: PastWinner[]; notified: boolean }>('winner.add', { winner }, 'G\'olib qo\'shildi', (d) => {
                  patch({ winners: d.winners });
                  setWinner({ ...winner, phone: '', name: '', region: '', prize: '', videoUrl: '' });
                  if (winner.notify && !d.notified) setNotice('G\'olib qo\'shildi, lekin tabrik yuborilmadi: raqam botga ulanmagan');
                })
              }
              className="btn btn-primary w-full"
            >
              Qo'shish
            </button>
          </div>

          <div className={card}>
            <h3 className="font-bold">G'oliblar · {data.winners?.length || 0}</h3>
            {!data.winners?.length && <p className="text-sm text-muted">Hozircha yo'q</p>}
            {data.winners?.map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-2 border-t border-line pt-2 first:border-0 first:pt-0">
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{w.winnerName}</div>
                  <div className="text-xs text-muted">
                    {w.month} · {w.region} · {w.prize}
                  </div>
                  {w.videoUrl && (
                    <a href={w.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-bad underline">
                      video
                    </a>
                  )}
                </div>
                <button
                  onClick={() =>
                    confirm(`${w.winnerName} o'chirilsinmi?`) &&
                    run<{ winners: PastWinner[] }>('winner.delete', { id: w.id }, 'O\'chirildi', (d) => patch({ winners: d.winners }))
                  }
                  className="icon-btn shrink-0 text-bad"
                  aria-label="O'chirish"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STATISTIKA ── */}
      {data && section === 'stats' && (
        <div className="space-y-4">
          {!stats && <div className="text-center text-muted py-6">Yuklanmoqda...</div>}
          {stats && <StatTable title="Agentlar bo'yicha" rows={stats.agents} />}
          {stats && <StatTable title="Viloyatlar bo'yicha" rows={stats.regions} />}
        </div>
      )}

      {/* ── JAMOA ── */}
      {data && isAdmin && section === 'team' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-bold">Jamoaga qo'shish</h3>
            <input value={member.phone} onChange={(e) => setMember({ ...member, phone: e.target.value })} placeholder="Telefon raqami" className="field" />
            <input value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} placeholder="Ism" className="field" />
            <div className="grid grid-cols-2 gap-1 p-1 bg-page rounded-xl">
              {(['agent', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setMember({ ...member, role: r })}
                  className={`min-h-[40px] rounded-lg text-sm font-bold ${member.role === r ? 'bg-brand text-white' : 'text-muted'}`}
                >
                  {r === 'agent' ? 'Agent' : 'Admin'}
                </button>
              ))}
            </div>
            {member.role === 'agent' && (
              <select value={member.agentCode} onChange={(e) => setMember({ ...member, agentCode: e.target.value })} className="field">
                <option value="">— agent kodini tanlang —</option>
                {data.agents?.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-muted">
              {member.role === 'agent'
                ? 'Agent faqat o\'z mijozlarini ko\'radi: biletlar, qarz, summalar va botdagi faollik. Xabar yubora olmaydi.'
                : 'Admin hamma narsaga ega: xabarlar, tanlov, g\'oliblar, jamoa va sozlamalar.'}
            </p>
            <button
              disabled={busy || !member.phone.trim() || (member.role === 'agent' && !member.agentCode)}
              onClick={() =>
                run<{ team: TeamMember[] }>('team.add', { member }, `${member.name || member.phone} qo'shildi. U o'z raqami bilan kirsa, panel ochiladi.`, (r) => {
                  patch({ team: r.team });
                  setMember({ phone: '', name: '', role: 'agent', agentCode: '' });
                })
              }
              className="btn btn-primary w-full"
            >
              <UserPlus size={18} /> Qo'shish
            </button>
          </div>

          <div className="card divide-y divide-line">
            {!data.team?.length && <div className="p-4 text-sm text-muted">Hozircha jamoada hech kim yo'q</div>}
            {data.team?.map((m) => (
              <div key={m.phone} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.name || m.phone}</div>
                  <div className="text-xs text-muted tabular-nums">
                    {m.phone} · {m.role === 'admin' ? 'Admin' : `Agent ${m.agentCode}`}
                  </div>
                </div>
                <button
                  onClick={() =>
                    confirm(`${m.name || m.phone} jamoadan chiqarilsinmi?`) &&
                    run<{ team: TeamMember[] }>('team.remove', { phone: m.phone }, 'Chiqarildi', (r) => patch({ team: r.team }))
                  }
                  className="icon-btn shrink-0 text-bad"
                  aria-label="Chiqarish"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Script Properties'dagi ADMIN_PHONES raqamlari har doim admin va bu ro'yxatda ko'rinmaydi.</p>
        </div>
      )}

      {/* ── SOZLAMA ── */}
      {data && isAdmin && section === 'settings' && (
        <div className={card}>
          <h3 className="font-bold">Ilovada ko'rinadigan sozlamalar</h3>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Bosh sovg'a</span>
            <input value={settings.grandPrize} onChange={(e) => setSettings({ ...settings, grandPrize: e.target.value })} className="field" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Boshqa sovg'alar (o'zbekcha)</span>
            <textarea value={settings.prizesText} onChange={(e) => setSettings({ ...settings, prizesText: e.target.value })} rows={3} className="field" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Boshqa sovg'alar (ruscha)</span>
            <textarea value={settings.prizesTextRu} onChange={(e) => setSettings({ ...settings, prizesTextRu: e.target.value })} rows={3} className="field" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-muted">Jonli efir / video (YouTube; bo'sh bo'lsa tugma yashiriladi)</span>
            <input value={settings.liveUrl} onChange={(e) => setSettings({ ...settings, liveUrl: e.target.value })} placeholder="https://youtube.com/..." className="field" />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              run<{ settings: NonNullable<Overview['settings']> }>('settings.update', { settings }, 'Saqlandi. Mijozlar ilovani qayta ochganda ko\'rinadi.', (d) =>
                patch({ settings: d.settings })
              )
            }
            className="btn btn-primary w-full"
          >
            Saqlash
          </button>
        </div>
      )}
    </div>
  );
};

const StatTable: React.FC<{ title: string; rows: StatRow[] }> = ({ title, rows }) => (
  <div className="card overflow-hidden">
    <h3 className="font-bold px-4 pt-4 pb-2">{title}</h3>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line">
            <th className="text-left font-semibold px-4 py-2">Nomi</th>
            <th className="text-right font-semibold px-2 py-2">Mijoz</th>
            <th className="text-right font-semibold px-2 py-2">Botda</th>
            <th className="text-right font-semibold px-2 py-2">Qarzsiz</th>
            <th className="text-right font-semibold px-2 py-2">Bilet</th>
            <th className="text-right font-semibold px-4 py-2">Pul kirim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line last:border-0 tabular-nums">
              <td className="px-4 py-2 font-semibold whitespace-nowrap">{r.key}</td>
              <td className="text-right px-2">{r.clients}</td>
              <td className="text-right px-2">
                {r.linked}
                <span className="text-muted text-xs"> ({r.clients ? Math.round((r.linked / r.clients) * 100) : 0}%)</span>
              </td>
              <td className="text-right px-2">{r.debtFree}</td>
              <td className="text-right px-2">
                {r.activeTickets}/{r.tickets}
              </td>
              <td className="text-right px-4 whitespace-nowrap">{money(r.paid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const BroadcastList: React.FC<{ broadcasts: Broadcast[]; onCancel: (id: string) => void }> = ({ broadcasts, onCancel }) => (
  <div className={card}>
    <h3 className="font-bold">Xabarlar</h3>
    {broadcasts.length === 0 && <p className="text-sm text-muted">Hozircha yo'q</p>}
    {broadcasts.map((b) => {
      const done = b.sent + b.failed;
      const canCancel = b.status === 'Rejalashtirilgan' || b.status === 'Navbatda';
      return (
        <div key={b.id} className="text-sm border-t border-line pt-3 first:border-0 first:pt-0 space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="font-semibold truncate">
              {b.kind} · {b.text || '—'}
            </span>
            <span
              className={`shrink-0 text-xs font-bold ${
                b.status === 'Yuborildi' ? 'text-ok' : b.status === 'Bekor qilindi' ? 'text-muted' : 'text-gold'
              }`}
            >
              {b.status}
            </span>
          </div>
          <div className="text-xs text-muted">
            {b.target} · {b.sendAt ? `rejada: ${formatDate(b.sendAt)}` : formatDate(b.date)} · {b.sent}/{b.total} yetkazildi
            {b.failed ? ` · ${b.failed} botni bloklagan` : ''}
          </div>
          {b.total > 0 && (
            <div className="h-1.5 rounded-full bg-page overflow-hidden">
              <div className="h-full bg-ok" style={{ width: `${(done / b.total) * 100}%` }} />
            </div>
          )}
          {b.pollResults && (
            <div className="space-y-1 pt-1">
              <div className="text-xs text-muted">{b.pollResults.voters} kishi javob berdi</div>
              {b.pollResults.options.map((o) => {
                const pct = b.pollResults!.voters ? Math.round((o.count / b.pollResults!.voters) * 100) : 0;
                return (
                  <div key={o.option}>
                    <div className="flex justify-between text-xs">
                      <span>{o.option}</span>
                      <span className="tabular-nums">
                        {o.count} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-page overflow-hidden">
                      <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {canCancel && (
            <button onClick={() => confirm('Xabar bekor qilinsinmi?') && onCancel(b.id)} className="text-xs font-bold text-bad">
              Bekor qilish
            </button>
          )}
        </div>
      );
    })}
  </div>
);
