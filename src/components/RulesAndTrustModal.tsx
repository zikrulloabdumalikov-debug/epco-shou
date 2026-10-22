import React from 'react';
import { PromoConfig } from '../types';
import { useL } from '../i18n/lang';
import damasPrizeImg from '../assets/images/damas_prize.webp';

interface RulesAndTrustModalProps {
  isOpen: boolean;
  config: PromoConfig;
  isLargeText?: boolean;
  onClose: () => void;
}

export const RulesAndTrustModal: React.FC<RulesAndTrustModalProps> = ({ isOpen, config, isLargeText, onClose }) => {
  const L = useL();
  if (!isOpen) return null;

  const rules = [
    {
      icon: '💵',
      tone: 'bg-amber-500/10 border-amber-400/40 text-amber-300',
      title: L('Har $1,000 to\'lov = 1 ta bilet', 'Каждые $1,000 оплаты = 1 билет'),
      text: L(
        'Har $1,000 to\'lov (pul kirim) uchun 1 ta raqamli bilet beriladi. Biletlar va $1,000 dan kam qoldiq har oy boshida nolga tushadi.',
        'За каждые $1,000 оплаты выдаётся 1 номерной билет. Билеты и остаток меньше $1,000 обнуляются в начале каждого месяца.'
      ),
    },
    {
      icon: '🛡️',
      tone: 'bg-rose-950/40 border-rose-500/50 text-rose-300',
      title: L('Qarz bo\'lsa biletlar nofaol', 'При долге билеты неактивны'),
      text: L(
        'Qarzi bor mijozning biletlari nofaol bo\'ladi. Qarz to\'liq yopilishi bilan barcha biletlar avtomatik faollashadi va shouda qatnashadi.',
        'Если есть долг, билеты неактивны. Как только долг погашен полностью, все билеты автоматически активируются и участвуют в шоу.'
      ),
    },
    {
      icon: '🎲',
      tone: 'bg-sky-950/40 border-sky-400/40 text-sky-300',
      title: L(`Har oy ${config.totalShowWinners} ta bilet jonli shouga`, `Каждый месяц ${config.totalShowWinners} билетов — на шоу`),
      text: L(
        `Reyting bo'yicha emas: barcha faol biletlar orasidan tasodifiy ${config.totalShowWinners} ta bilet tanlanadi va egalari jonli efir shousiga taklif qilinadi.`,
        `Не по рейтингу: среди всех активных билетов случайно выбирают ${config.totalShowWinners} билетов, их владельцев приглашают в прямой эфир.`
      ),
    },
    {
      icon: '🎁',
      tone: 'bg-emerald-950/40 border-emerald-400/40 text-emerald-300',
      title: L('Sovg\'alar', 'Призы'),
      text: L(
        `Bosh sovg'a — ${config.grandPrize}. Shuningdek: ${config.prizesText || 'turli sovg\'alar va pul mukofotlari'}.`,
        `Главный приз — ${config.grandPrize}. А также: ${config.prizesTextRu || config.prizesText || 'подарки и денежные призы'}.`
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="w-full max-w-lg bg-[#0D121F] rounded-3xl border border-amber-500/35 shadow-[0_20px_70px_rgba(0,0,0,0.95)] p-5 max-h-[85vh] flex flex-col text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className={`font-black ${isLargeText ? 'text-xl' : 'text-lg'}`}>📜 {L('Aksiya qoidalari', 'Правила акции')}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label={L('Yopish', 'Закрыть')}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 text-xs no-scrollbar">
          <div className="rounded-2xl overflow-hidden border border-amber-400/40 relative">
            <img src={damasPrizeImg} alt={config.grandPrize} className="w-full h-36 object-cover" />
            <div className="p-3 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 inset-x-0">
              <span className="text-[10px] uppercase font-bold text-amber-300">{L('Bosh sovg\'a', 'Главный приз')}</span>
              <div className="text-base font-black text-white">{config.grandPrize}</div>
            </div>
          </div>

          {rules.map((rule, i) => (
            <div key={rule.icon} className={`p-3 rounded-2xl border space-y-1 ${rule.tone}`}>
              <div className="font-extrabold text-sm">
                {rule.icon} {i + 1}. {rule.title}
              </div>
              <p className="text-slate-200 leading-relaxed text-[12px]">{rule.text}</p>
            </div>
          ))}

          <a
            href={`tel:+${config.supportPhone.replace(/\D/g, '')}`}
            className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] text-slate-400 block">{L('Savollar bo\'yicha', 'По вопросам')}</span>
              <span className="text-sm font-extrabold text-amber-300">{config.supportPhone}</span>
            </div>
            <span className="text-2xl">📞</span>
          </a>
        </div>

        <div className="border-t border-white/10 pt-3">
          <button onClick={onClose} className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-[#06154A] font-extrabold text-sm">
            {L('Yopish', 'Закрыть')}
          </button>
        </div>
      </div>
    </div>
  );
};
