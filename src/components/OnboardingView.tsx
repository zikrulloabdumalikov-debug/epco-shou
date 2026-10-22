import React, { useState } from 'react';
import { LeadForm, PromoConfig } from '../types';
import { apiService } from '../services/apiService';
import { ADMIN_PHONE, ADMIN_PHONE_RAW } from '../services/mastersDb';
import { triggerHaptic } from '../utils/audio';

interface OnboardingViewProps {
  phone: string;
  supportPhone?: string;
  leadSubmitted: boolean;
  config?: PromoConfig;
  onLogout: () => void;
}

type Question =
  | { key: keyof LeadForm; type: 'text'; title: string; hint?: string; placeholder: string; optional?: boolean }
  | { key: keyof LeadForm; type: 'choice'; title: string; hint?: string; options: string[]; columns?: 1 | 2 };

const QUESTIONS: Question[] = [
  { key: 'name', type: 'text', title: 'Ismingiz nima?', placeholder: 'Masalan: Jasur' },
  {
    key: 'activity',
    type: 'choice',
    title: 'Faoliyatingiz qanday?',
    options: ['Moyxona (moy almashtirish)', 'Avtodo\'kon (ehtiyot qismlar)', 'Avtoservis / usta', 'Ulgurji savdo', 'Boshqa'],
  },
  {
    key: 'shopName',
    type: 'text',
    title: 'Do\'kon yoki moyxonangiz nomi',
    placeholder: 'Masalan: "Jasur Avto Moy"',
    optional: true,
  },
  {
    key: 'region',
    type: 'choice',
    title: 'Qaysi viloyatdasiz?',
    columns: 2,
    options: [
      'Toshkent shahri', 'Toshkent viloyati', 'Andijon', 'Farg\'ona', 'Namangan', 'Samarqand', 'Buxoro',
      'Xorazm', 'Qashqadaryo', 'Surxondaryo', 'Jizzax', 'Sirdaryo', 'Navoiy', 'Qoraqalpog\'iston',
    ],
  },
  { key: 'district', type: 'text', title: 'Tuman yoki shahar', placeholder: 'Masalan: Urgut tumani' },
  {
    key: 'volume',
    type: 'choice',
    title: 'Oyiga taxminan qancha moy sotasiz yoki ishlatasiz?',
    options: ['100 litrgacha', '100–500 litr', '500–1000 litr', '1000 litrdan ko\'p'],
  },
  {
    key: 'brands',
    type: 'text',
    title: 'Hozir qaysi moy brendlari bilan ishlaysiz?',
    placeholder: 'Masalan: Lukoil, Mobil',
    optional: true,
  },
  {
    key: 'source',
    type: 'choice',
    title: 'EPCO aksiyasi haqida qayerdan bildingiz?',
    options: ['EPCO agentidan', 'Tanish-bilishdan', 'Telegram', 'Instagram', 'Boshqa'],
  },
];

const EMPTY_FORM: LeadForm = {
  name: '', activity: '', shopName: '', region: '', district: '', volume: '', brands: '', source: '',
};

export const OnboardingView: React.FC<OnboardingViewProps> = ({ phone, supportPhone, leadSubmitted, config, onLogout }) => {
  // -1 = tanishtiruv, 0..N-1 = savollar, N = yakun
  const [step, setStep] = useState(leadSubmitted ? QUESTIONS.length : -1);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contactPhone = supportPhone || ADMIN_PHONE;
  const contactRaw = supportPhone ? `+${supportPhone.replace(/\D/g, '')}` : ADMIN_PHONE_RAW;
  const question = step >= 0 && step < QUESTIONS.length ? QUESTIONS[step] : null;
  const value = question ? form[question.key] : '';

  const submit = async (finalForm: LeadForm) => {
    setSending(true);
    setError(null);
    const res = await apiService.submitLead(finalForm);
    setSending(false);
    if (res.success) {
      triggerHaptic([30, 40]);
      setStep(QUESTIONS.length);
    } else {
      setError(res.error?.message || 'Yuborib bo\'lmadi. Qayta urinib ko\'ring.');
    }
  };

  const next = (answer?: string) => {
    if (!question) return;
    const updated = { ...form, [question.key]: answer !== undefined ? answer : form[question.key] };
    setForm(updated);
    triggerHaptic(15);
    if (step === QUESTIONS.length - 1) {
      submit(updated);
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-ambient-mesh bg-[#06154A] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#06154A] font-black">
            E
          </div>
          <span className="font-black text-lg">EPCO <span className="text-amber-400">Shou</span></span>
        </div>
        <button onClick={onLogout} className="text-xs text-slate-400 hover:text-white px-2 py-1">
          Chiqish
        </button>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-8 flex flex-col">
        {/* Tanishtiruv */}
        {step === -1 && (
          <div className="flex-1 flex flex-col justify-center space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-2">
              <div className="text-5xl">👋</div>
              <h1 className="text-2xl font-black leading-tight">Xush kelibsiz!</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                <span className="font-mono text-white">{phone}</span> raqami hali aksiya ishtirokchilari ro'yxatida yo'q.
              </p>
            </div>

            <div className="glass-card-gold p-4 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">Aksiyada nimalar bor?</div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-2xl">🚐</span>
                <span>Bosh sovg'a — <b>{config?.grandPrize || 'Chevrolet DAMAS'}</b></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-2xl">📱</span>
                <span>Har oy 1-o'ringa — <b>{config?.firstPlacePrize || 'iPhone 18 Pro Max'}</b></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-2xl">💰</span>
                <span>Umumiy sovg'a fondi — <b>${(config?.totalPrizePoolUsd || 15000).toLocaleString('en-US')}</b></span>
              </div>
            </div>

            <p className="text-sm text-slate-300 text-center leading-relaxed">
              Bir necha savolga javob bering — menejerimiz siz bilan bog'lanib, aksiyaga qo'shib qo'yadi.
            </p>
            <button
              onClick={() => setStep(0)}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#06154A] font-black text-base shadow-[0_8px_30px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-transform"
            >
              Boshlash →
            </button>
          </div>
        )}

        {/* Savollar */}
        {question && (
          <div key={step} className="flex-1 flex flex-col pt-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setStep(step - 1)}
                className="w-9 h-9 shrink-0 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center"
                aria-label="Orqaga"
              >
                ←
              </button>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-300"
                  style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 tabular-nums shrink-0">
                {step + 1}/{QUESTIONS.length}
              </span>
            </div>

            <h2 className="text-xl font-black leading-snug mb-4">{question.title}</h2>

            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-sm">{error}</div>
            )}

            {question.type === 'choice' ? (
              <div className={`grid gap-2 ${question.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => next(option)}
                    disabled={sending}
                    className={`min-h-[52px] px-4 py-3 rounded-2xl text-left text-sm font-bold border transition-all active:scale-[0.98] ${
                      value === option
                        ? 'bg-amber-400 text-[#06154A] border-amber-300'
                        : 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-amber-400/50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (value.trim() || question.optional) next();
                }}
              >
                <input
                  autoFocus
                  value={value}
                  onChange={(e) => setForm({ ...form, [question.key]: e.target.value })}
                  placeholder={question.placeholder}
                  maxLength={100}
                  className="w-full min-h-[54px] px-4 rounded-2xl bg-slate-950/80 border border-amber-400/50 text-white text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={sending || (!value.trim() && !question.optional)}
                  className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#06154A] font-black disabled:opacity-40 active:scale-[0.98] transition-transform"
                >
                  {sending ? 'Yuborilmoqda...' : value.trim() || !question.optional ? 'Davom etish →' : 'O\'tkazib yuborish →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Yakun: aloqa raqami */}
        {step === QUESTIONS.length && (
          <div className="flex-1 flex flex-col justify-center space-y-5 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="text-6xl">✅</div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black">Arizangiz qabul qilindi!</h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Aksiyada ishtirok etish uchun quyidagi raqam bilan bog'laning. Menejerimiz sizni ro'yxatga qo'shgach,
                biletlaringiz va reytingdagi o'rningiz shu yerda ko'rinadi.
              </p>
            </div>
            <a
              href={`tel:${contactRaw}`}
              className="w-full min-h-[60px] rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black text-lg flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-transform"
            >
              <span>📞</span>
              <span className="tabular-nums">{contactPhone}</span>
            </a>
            <p className="text-xs text-slate-400">Qo'ng'iroq qilish uchun raqam ustiga bosing</p>
          </div>
        )}
      </main>
    </div>
  );
};
