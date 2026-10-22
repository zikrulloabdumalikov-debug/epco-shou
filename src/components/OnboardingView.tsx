import React, { useState } from 'react';
import { LeadForm, PromoConfig } from '../types';
import { apiService } from '../services/apiService';
import { ADMIN_PHONE, ADMIN_PHONE_RAW } from '../services/mastersDb';
import { triggerHaptic } from '../utils/audio';
import { useL, useLanguage, setLanguage } from '../i18n/lang';
import epcoLogo from '../assets/brand/epco-logo.png';

interface OnboardingViewProps {
  phone: string;
  supportPhone?: string;
  leadSubmitted: boolean;
  config?: PromoConfig;
  onLogout: () => void;
}

// [o'zbekcha (Sheets'ga shu yoziladi), ruscha]
type Option = [string, string];

type Question =
  | { key: keyof LeadForm; type: 'text'; title: Option; placeholder: Option; optional?: boolean }
  | { key: keyof LeadForm; type: 'choice'; title: Option; options: Option[]; columns?: 1 | 2 };

const QUESTIONS: Question[] = [
  { key: 'name', type: 'text', title: ['Ismingiz nima?', 'Как вас зовут?'], placeholder: ['Masalan: Jasur', 'Например: Жасур'] },
  {
    key: 'activity',
    type: 'choice',
    title: ['Faoliyatingiz qanday?', 'Чем вы занимаетесь?'],
    options: [
      ['Moyxona (moy almashtirish)', 'Замена масла (моечная)'],
      ['Avtodo\'kon (ehtiyot qismlar)', 'Автомагазин (запчасти)'],
      ['Avtoservis / usta', 'Автосервис / мастер'],
      ['Ulgurji savdo', 'Оптовая торговля'],
      ['Boshqa', 'Другое'],
    ],
  },
  {
    key: 'shopName',
    type: 'text',
    title: ['Do\'kon yoki moyxonangiz nomi', 'Название магазина или сервиса'],
    placeholder: ['Masalan: "Jasur Avto Moy"', 'Например: «Jasur Avto Moy»'],
    optional: true,
  },
  {
    key: 'region',
    type: 'choice',
    title: ['Qaysi viloyatdasiz?', 'В каком вы регионе?'],
    columns: 2,
    options: [
      ['Toshkent shahri', 'г. Ташкент'], ['Toshkent viloyati', 'Ташкентская обл.'], ['Andijon', 'Андижан'],
      ['Farg\'ona', 'Фергана'], ['Namangan', 'Наманган'], ['Samarqand', 'Самарканд'], ['Buxoro', 'Бухара'],
      ['Xorazm', 'Хорезм'], ['Qashqadaryo', 'Кашкадарья'], ['Surxondaryo', 'Сурхандарья'], ['Jizzax', 'Джизак'],
      ['Sirdaryo', 'Сырдарья'], ['Navoiy', 'Навои'], ['Qoraqalpog\'iston', 'Каракалпакстан'],
    ],
  },
  { key: 'district', type: 'text', title: ['Tuman yoki shahar', 'Район или город'], placeholder: ['Masalan: Urgut tumani', 'Например: Ургутский район'] },
  {
    key: 'volume',
    type: 'choice',
    title: ['Oyiga taxminan qancha moy sotasiz yoki ishlatasiz?', 'Сколько масла в месяц вы продаёте или используете?'],
    options: [
      ['100 litrgacha', 'До 100 литров'],
      ['100–500 litr', '100–500 литров'],
      ['500–1000 litr', '500–1000 литров'],
      ['1000 litrdan ko\'p', 'Более 1000 литров'],
    ],
  },
  {
    key: 'brands',
    type: 'text',
    title: ['Hozir qaysi moy brendlari bilan ishlaysiz?', 'С какими марками масла работаете сейчас?'],
    placeholder: ['Masalan: Lukoil, Mobil', 'Например: Lukoil, Mobil'],
    optional: true,
  },
  {
    key: 'source',
    type: 'choice',
    title: ['EPCO aksiyasi haqida qayerdan bildingiz?', 'Откуда вы узнали об акции EPCO?'],
    options: [
      ['EPCO agentidan', 'От агента EPCO'], ['Tanish-bilishdan', 'От знакомых'],
      ['Telegram', 'Telegram'], ['Instagram', 'Instagram'], ['Boshqa', 'Другое'],
    ],
  },
];

const EMPTY_FORM: LeadForm = { name: '', activity: '', shopName: '', region: '', district: '', volume: '', brands: '', source: '' };

export const OnboardingView: React.FC<OnboardingViewProps> = ({ phone, supportPhone, leadSubmitted, config, onLogout }) => {
  const L = useL();
  const language = useLanguage();
  const pick = (o: Option) => (language === 'ru' ? o[1] : o[0]);
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
      setError(res.error?.message || L('Yuborib bo\'lmadi. Qayta urinib ko\'ring.', 'Не удалось отправить. Попробуйте ещё раз.'));
    }
  };

  const next = (answer?: string) => {
    if (!question) return;
    const updated = { ...form, [question.key]: answer !== undefined ? answer : form[question.key] };
    setForm(updated);
    triggerHaptic(15);
    if (step === QUESTIONS.length - 1) submit(updated);
    else setStep(step + 1);
  };

  const primaryBtn = 'btn btn-primary w-full';

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 pt-safe">
        <img src={epcoLogo} alt="EPCO" className="h-8 w-auto" />
        <div className="flex items-center gap-2">
          <button onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')} className="icon-btn w-auto px-3">
            {language === 'uz' ? 'RU' : 'UZ'}
          </button>
          <button onClick={onLogout} className="text-sm text-muted px-2 py-1">
            {L('Chiqish', 'Выйти')}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto px-4 pb-8 flex flex-col">
        {step === -1 && (
          <div className="flex-1 flex flex-col justify-center space-y-5">
            <div className="text-center space-y-2">
              <div className="text-5xl">👋</div>
              <h1 className="text-[28px] font-extrabold">{L('Xush kelibsiz!', 'Добро пожаловать!')}</h1>
              <p className="text-muted leading-relaxed">
                {L('Raqamingiz hali aksiya ishtirokchilari ro\'yxatida yo\'q:', 'Ваш номер пока не в списке участников акции:')}{' '}
                <span className="font-semibold text-ink tabular-nums">{phone}</span>
              </p>
            </div>

            <div className="hero p-5 space-y-3">
              <div className="relative z-10 text-xs font-bold text-white/75 uppercase tracking-wider">{L('Aksiyada nimalar bor?', 'Что разыгрывается?')}</div>
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-2xl">🚐</span>
                <span>
                  {L('Bosh sovg\'a —', 'Главный приз —')} <b>{config?.grandPrize || 'Chevrolet DAMAS'}</b>
                </span>
              </div>
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <span>
                  {L(
                    config?.prizesText || '1 500$ gacha qiymatdagi sovg\'alar va pul mukofotlari',
                    config?.prizesTextRu || 'Подарки и денежные призы до 1 500$'
                  )}
                </span>
              </div>
            </div>

            <p className="text-muted text-center leading-relaxed">
              {L(
                'Bir necha savolga javob bering — menejerimiz siz bilan bog\'lanib, aksiyaga qo\'shib qo\'yadi.',
                'Ответьте на несколько вопросов — наш менеджер свяжется с вами и добавит в акцию.'
              )}
            </p>
            <button onClick={() => setStep(0)} className={primaryBtn}>
              {L('Boshlash →', 'Начать →')}
            </button>
          </div>
        )}

        {question && (
          <div key={step} className="flex-1 flex flex-col pt-2">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep(step - 1)} className="icon-btn shrink-0" aria-label={L('Orqaga', 'Назад')}>
                ←
              </button>
              <div className="flex-1 h-2 rounded-full bg-brand-soft overflow-hidden">
                <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} />
              </div>
              <span className="text-sm text-muted tabular-nums shrink-0">
                {step + 1}/{QUESTIONS.length}
              </span>
            </div>

            <h2 className="text-2xl font-bold leading-snug mb-5">{pick(question.title)}</h2>
            {error && <div className="mb-3 p-3.5 rounded-2xl bg-bad-soft text-bad text-sm">{error}</div>}

            {question.type === 'choice' ? (
              <div className={`grid gap-2 ${question.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {question.options.map((option) => (
                  <button
                    key={option[0]}
                    onClick={() => next(option[0])}
                    disabled={sending}
                    className={`min-h-[54px] px-4 py-3 rounded-2xl text-left text-[15px] font-semibold border-[1.5px] transition-all active:scale-[0.98] ${
                      value === option[0] ? 'bg-brand text-white border-brand' : 'bg-surface border-line hover:border-brand'
                    }`}
                  >
                    {pick(option)}
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
                  placeholder={pick(question.placeholder)}
                  maxLength={100}
                  className="field text-lg"
                />
                <button type="submit" disabled={sending || (!value.trim() && !question.optional)} className={primaryBtn}>
                  {sending
                    ? L('Yuborilmoqda...', 'Отправляем...')
                    : value.trim() || !question.optional
                    ? L('Davom etish →', 'Далее →')
                    : L('O\'tkazib yuborish →', 'Пропустить →')}
                </button>
              </form>
            )}
          </div>
        )}

        {step === QUESTIONS.length && (
          <div className="flex-1 flex flex-col justify-center space-y-5 text-center">
            <div className="text-6xl">✅</div>
            <div className="space-y-2">
              <h1 className="text-[28px] font-extrabold">{L('Arizangiz qabul qilindi!', 'Заявка принята!')}</h1>
              <p className="text-muted leading-relaxed">
                {L(
                  'Aksiyada ishtirok etish uchun quyidagi raqam bilan bog\'laning. Ro\'yxatga qo\'shilgach, biletlaringiz va reytingdagi o\'rningiz shu yerda ko\'rinadi.',
                  'Чтобы участвовать в акции, позвоните по номеру ниже. После добавления в список здесь появятся ваши билеты и место в рейтинге.'
                )}
              </p>
            </div>
            <a
              href={`tel:${contactRaw}`}
              className="btn w-full min-h-[60px] text-lg bg-ok text-white"
            >
              📞 <span className="tabular-nums">{contactPhone}</span>
            </a>
            <p className="text-sm text-muted">{L('Qo\'ng\'iroq qilish uchun bosing', 'Нажмите, чтобы позвонить')}</p>
          </div>
        )}
      </main>
    </div>
  );
};
