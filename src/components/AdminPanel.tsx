import React, { useCallback, useEffect, useState } from 'react';
import { PastWinner } from '../types';
import { apiService } from '../services/apiService';

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
}

interface Overview {
  mastersTotal: number;
  linkedTotal: number;
  activeToday: number;
  leadsTotal: number;
  recentLeads: { date: string; phone: string; name: string; activity: string; region: string }[];
  regions: string[];
  settings: { grandPrize: string; prizesText: string; prizesTextRu: string; liveUrl: string };
  winners: PastWinner[];
  broadcasts: Broadcast[];
}

type Section = 'overview' | 'broadcast' | 'winners' | 'settings';
type TargetType = 'all' | 'registered' | 'new' | 'region' | 'phone';
type Kind = 'text' | 'photo' | 'poll';

const input =
  'w-full min-h-[46px] px-3 rounded-xl bg-slate-950/80 border border-white/15 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';
const primaryBtn =
  'w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#06154A] font-black text-sm disabled:opacity-40 active:scale-[0.98] transition-transform';
const card = 'glass-card p-4 rounded-2xl border border-white/10 space-y-3';

const formatDate = (iso: string) => {
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

export const AdminPanel: React.FC<{ currentMonth: string }> = ({ currentMonth }) => {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const run = async <T,>(action: string, payload: Record<string, any>, success: string, apply?: (d: T) => void) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await apiService.admin<T>(action, payload);
    setBusy(false);
    if (res.success && res.data) {
      setNotice(success);
      apply?.(res.data); // apply aniqroq xabar qo'yishi mumkin
      return true;
    }
    setError(res.error?.message || 'Xatolik yuz berdi');
    return false;
  };

  // ── Xabar yuborish holati ──
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetValue, setTargetValue] = useState('');
  const [kind, setKind] = useState<Kind>('text');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollMultiple, setPollMultiple] = useState(false);

  // ── G'olib formasi ──
  const [winner, setWinner] = useState({ month: currentMonth, phone: '', name: '', region: '', prize: '', videoUrl: '', notify: true });

  // ── Sozlamalar ──
  const [settings, setSettings] = useState({ grandPrize: '', prizesText: '', prizesTextRu: '', liveUrl: '' });
  useEffect(() => {
    if (data) setSettings(data.settings);
  }, [data]);

  const target = () => ({ type: targetType, value: targetValue.trim() });

  const sendBroadcast = async () => {
    const preview = await apiService.admin<{ count: number }>('broadcast.preview', { target: target() });
    if (!preview.success) {
      setError(preview.error?.message || 'Qabul qiluvchilarni aniqlab bo\'lmadi');
      return;
    }
    const count = preview.data?.count || 0;
    if (count === 0) {
      setError('Tanlangan guruhda botga ulangan mijoz yo\'q');
      return;
    }
    if (!confirm(`Xabar ${count} ta mijozga yuboriladi. Davom etasizmi?`)) return;

    const ok = await run<{ broadcasts: Broadcast[] }>(
      'broadcast.create',
      {
        broadcast: {
          kind,
          text,
          target: target(),
          imageBase64: kind === 'photo' ? image : undefined,
          buttonText: kind !== 'poll' ? buttonText : undefined,
          buttonUrl: kind !== 'poll' ? buttonUrl : undefined,
          pollQuestion: kind === 'poll' ? text : undefined,
          pollOptions: kind === 'poll' ? pollOptions : undefined,
          pollMultiple,
        },
      },
      `Xabar navbatga qo'yildi (${count} ta mijoz). Ko'p bo'lsa, bir necha daqiqada yuborib bo'linadi.`,
      (d) => setData((prev) => (prev ? { ...prev, broadcasts: d.broadcasts } : prev))
    );
    if (ok) {
      setText('');
      setImage(null);
      setButtonText('');
      setButtonUrl('');
      setPollOptions(['', '']);
    }
  };

  const tabs: [Section, string][] = [
    ['overview', '📊 Umumiy'],
    ['broadcast', '📣 Xabar'],
    ['winners', '🏅 G\'oliblar'],
    ['settings', '⚙️ Sozlama'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">🛠 Admin panel</h2>
        <button onClick={load} disabled={loading} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15">
          {loading ? '...' : '🔄 Yangilash'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1 bg-[#090D17]/90 rounded-2xl border border-amber-500/20">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setSection(key);
              setNotice(null);
              setError(null);
            }}
            className={`min-h-[42px] rounded-xl text-[11px] font-bold ${section === key ? 'bg-amber-400 text-[#06154A]' : 'text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-sm">{error}</div>}
      {notice && <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm">{notice}</div>}
      {!data && loading && <div className="text-center text-slate-400 py-10">Yuklanmoqda...</div>}

      {data && section === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Bazadagi mijozlar', data.mastersTotal],
              ['Botga ulanganlar', data.linkedTotal],
              ['Bugun faol', data.activeToday],
              ['Yangi anketalar', data.leadsTotal],
            ].map(([label, value]) => (
              <div key={label as string} className="glass-card p-3 rounded-2xl border border-white/10">
                <div className="text-[11px] text-slate-400">{label}</div>
                <div className="text-2xl font-black text-amber-300 tabular-nums">{Number(value).toLocaleString('en-US')}</div>
              </div>
            ))}
          </div>

          <div className={card}>
            <h3 className="font-black">🆕 Oxirgi anketalar</h3>
            {data.recentLeads.length === 0 && <p className="text-sm text-slate-400">Hozircha anketa yo'q</p>}
            {data.recentLeads.map((l, i) => (
              <div key={i} className="text-sm border-t border-white/5 pt-2 first:border-0 first:pt-0">
                <div className="font-bold">{l.name} · <span className="font-mono text-slate-300">{l.phone}</span></div>
                <div className="text-xs text-slate-400">{l.activity} · {l.region} · {formatDate(l.date)}</div>
              </div>
            ))}
          </div>

          <BroadcastList broadcasts={data.broadcasts} />
        </div>
      )}

      {data && section === 'broadcast' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-black">Kimga?</h3>
            <select value={targetType} onChange={(e) => setTargetType(e.target.value as TargetType)} className={input}>
              <option value="all">Hammaga (botga ulangan barcha)</option>
              <option value="registered">Faqat bazadagi mijozlarga</option>
              <option value="new">Faqat yangi (bazada yo'q) mijozlarga</option>
              <option value="region">Viloyat bo'yicha</option>
              <option value="phone">Bitta raqamga</option>
            </select>
            {targetType === 'region' && (
              <select value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className={input}>
                <option value="">— viloyatni tanlang —</option>
                {data.regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
            {targetType === 'phone' && (
              <input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="+998 90 123 45 67" className={input} />
            )}
          </div>

          <div className={card}>
            <div className="grid grid-cols-3 gap-1 p-1 bg-black/30 rounded-xl">
              {([['text', '✉️ Matn'], ['photo', '🖼 Rasm'], ['poll', '📊 So\'rovnoma']] as [Kind, string][]).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`min-h-[40px] rounded-lg text-xs font-bold ${kind === k ? 'bg-amber-400 text-[#06154A]' : 'text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {kind === 'photo' && (
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs text-slate-400">Rasm (telefon galereyasidan)</span>
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
                    className="block w-full text-sm text-slate-300 mt-1 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-white/10 file:text-white"
                  />
                </label>
                {image && <img src={image} alt="" className="w-full max-h-56 object-contain rounded-xl border border-white/10" />}
              </div>
            )}

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={kind === 'poll' ? 2 : 5}
              maxLength={kind === 'poll' ? 300 : kind === 'photo' ? 1000 : 4000}
              placeholder={kind === 'poll' ? 'Savol: masalan, qaysi moy ko\'proq sotiladi?' : 'Xabar matni...'}
              className={`${input} py-2.5`}
            />

            {kind === 'poll' ? (
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => setPollOptions(pollOptions.map((o, j) => (j === i ? e.target.value : o)))}
                      placeholder={`${i + 1}-javob`}
                      className={input}
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))} className="px-3 rounded-xl bg-white/10">✕</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 10 && (
                  <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-sm font-bold text-amber-300">
                    + Javob qo'shish
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={pollMultiple} onChange={(e) => setPollMultiple(e.target.checked)} className="accent-amber-400 w-4 h-4" />
                  Bir nechta javob tanlash mumkin
                </label>
                <p className="text-[11px] text-slate-400">Javoblar «Sorovnoma_javoblari» varag'iga mijoz ismi va raqami bilan yoziladi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Tugma matni (ixtiyoriy)" className={input} />
                <input value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://..." className={input} />
              </div>
            )}

            <button
              onClick={sendBroadcast}
              disabled={busy || !text.trim() || (kind === 'photo' && !image) || ((targetType === 'region' || targetType === 'phone') && !targetValue.trim())}
              className={primaryBtn}
            >
              {busy ? 'Yuborilmoqda...' : '📣 Yuborish'}
            </button>
          </div>

          <BroadcastList broadcasts={data.broadcasts} />
        </div>
      )}

      {data && section === 'winners' && (
        <div className="space-y-4">
          <div className={card}>
            <h3 className="font-black">G'olib qo'shish</h3>
            <input value={winner.month} onChange={(e) => setWinner({ ...winner, month: e.target.value })} placeholder="Oy (masalan: Oktyabr 2026)" className={input} />
            <input value={winner.phone} onChange={(e) => setWinner({ ...winner, phone: e.target.value })} placeholder="Telefon (bazada bo'lsa ism avtomatik)" className={input} />
            <input value={winner.name} onChange={(e) => setWinner({ ...winner, name: e.target.value })} placeholder="Ism (telefon bo'lmasa)" className={input} />
            <input value={winner.region} onChange={(e) => setWinner({ ...winner, region: e.target.value })} placeholder="Viloyat (ixtiyoriy)" className={input} />
            <input value={winner.prize} onChange={(e) => setWinner({ ...winner, prize: e.target.value })} placeholder="Sovg'a (masalan: Chevrolet DAMAS)" className={input} />
            <input value={winner.videoUrl} onChange={(e) => setWinner({ ...winner, videoUrl: e.target.value })} placeholder="YouTube havola (ixtiyoriy)" className={input} />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={winner.notify} onChange={(e) => setWinner({ ...winner, notify: e.target.checked })} className="accent-amber-400 w-4 h-4" />
              G'olibga botda tabrik xabari yuborish
            </label>
            <button
              disabled={busy || !winner.prize.trim() || (!winner.phone.trim() && !winner.name.trim())}
              onClick={() =>
                run<{ winners: PastWinner[]; notified: boolean }>('winner.add', { winner }, 'G\'olib qo\'shildi', (d) => {
                  setData((prev) => (prev ? { ...prev, winners: d.winners } : prev));
                  setWinner({ ...winner, phone: '', name: '', region: '', prize: '', videoUrl: '' });
                  if (winner.notify && !d.notified) setNotice('G\'olib qo\'shildi, lekin tabrik yuborilmadi: raqam botga ulanmagan');
                })
              }
              className={primaryBtn}
            >
              ➕ Qo'shish
            </button>
          </div>

          <div className={card}>
            <h3 className="font-black">G'oliblar ro'yxati ({data.winners.length})</h3>
            {data.winners.length === 0 && <p className="text-sm text-slate-400">Hozircha yo'q</p>}
            {data.winners.map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-2 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                <div className="min-w-0 text-sm">
                  <div className="font-bold">{w.winnerName}</div>
                  <div className="text-xs text-slate-400">{w.month} · {w.region} · 🎁 {w.prize}</div>
                  {w.videoUrl && (
                    <a href={w.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 underline">▶️ video</a>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`${w.winnerName} ro'yxatdan o'chirilsinmi?`)) {
                      run<{ winners: PastWinner[] }>('winner.delete', { id: w.id }, 'O\'chirildi', (d) =>
                        setData((prev) => (prev ? { ...prev, winners: d.winners } : prev))
                      );
                    }
                  }}
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300"
                >
                  O'chirish
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && section === 'settings' && (
        <div className={card}>
          <h3 className="font-black">Ilovada ko'rinadigan sozlamalar</h3>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Bosh sovg'a</span>
            <input value={settings.grandPrize} onChange={(e) => setSettings({ ...settings, grandPrize: e.target.value })} className={input} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Boshqa sovg'alar (o'zbekcha)</span>
            <textarea value={settings.prizesText} onChange={(e) => setSettings({ ...settings, prizesText: e.target.value })} rows={3} className={`${input} py-2.5`} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Boshqa sovg'alar (ruscha)</span>
            <textarea value={settings.prizesTextRu} onChange={(e) => setSettings({ ...settings, prizesTextRu: e.target.value })} rows={3} className={`${input} py-2.5`} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Jonli efir / video (YouTube havola, bo'sh qoldirsa tugma yashiriladi)</span>
            <input value={settings.liveUrl} onChange={(e) => setSettings({ ...settings, liveUrl: e.target.value })} placeholder="https://youtube.com/..." className={input} />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              run<{ settings: Overview['settings'] }>('settings.update', { settings }, 'Saqlandi. Mijozlar ilovani qayta ochganda ko\'rinadi.', (d) =>
                setData((prev) => (prev ? { ...prev, settings: d.settings } : prev))
              )
            }
            className={primaryBtn}
          >
            💾 Saqlash
          </button>
        </div>
      )}
    </div>
  );
};

const BroadcastList: React.FC<{ broadcasts: Broadcast[] }> = ({ broadcasts }) => (
  <div className={card}>
    <h3 className="font-black">📨 Yuborilgan xabarlar</h3>
    {broadcasts.length === 0 && <p className="text-sm text-slate-400">Hozircha yo'q</p>}
    {broadcasts.map((b) => {
      const done = b.sent + b.failed;
      return (
        <div key={b.id} className="text-sm border-t border-white/5 pt-2 first:border-0 first:pt-0 space-y-1">
          <div className="flex justify-between gap-2">
            <span className="font-bold truncate">{b.kind} · {b.text || '—'}</span>
            <span className={`shrink-0 text-xs font-bold ${b.status === 'Yuborildi' ? 'text-emerald-300' : 'text-amber-300'}`}>{b.status}</span>
          </div>
          <div className="text-xs text-slate-400">
            {b.target} · {formatDate(b.date)} · ✓ {b.sent} / {b.total}{b.failed ? ` · ✕ ${b.failed} (botni bloklagan)` : ''}
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${b.total ? (done / b.total) * 100 : 0}%` }} />
          </div>
        </div>
      );
    })}
  </div>
);
