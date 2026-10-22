import React from 'react';
import { Banknote, ShieldCheck, Shuffle, Gift, Phone } from 'lucide-react';
import { PromoConfig } from '../types';
import { useL } from '../i18n/lang';
import { Sheet } from './Sheet';

interface RulesAndTrustModalProps {
  isOpen: boolean;
  config: PromoConfig;
  onClose: () => void;
}

export const RulesAndTrustModal: React.FC<RulesAndTrustModalProps> = ({ isOpen, config, onClose }) => {
  const L = useL();
  const K = config.totalShowWinners;

  const rules = [
    {
      icon: <Banknote size={20} />,
      title: L('Har $1,000 to\'lov = 1 bilet', 'Каждые $1,000 = 1 билет'),
      text: L(
        'Biletlar va $1,000 dan kam qoldiq har oy boshida nolga tushadi.',
        'Билеты и остаток меньше $1,000 обнуляются в начале каждого месяца.'
      ),
    },
    {
      icon: <ShieldCheck size={20} />,
      title: L('Qarz bo\'lsa — biletlar nofaol', 'Есть долг — билеты неактивны'),
      text: L('Qarz to\'liq yopilishi bilan barcha biletlar darhol faollashadi.', 'Как только долг погашен, все билеты сразу активируются.'),
    },
    {
      icon: <Shuffle size={20} />,
      title: L(`Har oy ${K} ta bilet — jonli shouga`, `Каждый месяц ${K} билетов — на шоу`),
      text: L(
        `Reyting bo'yicha emas: barcha faol biletlar orasidan ${K} tasi tasodifiy tanlanadi.`,
        `Не по рейтингу: ${K} билетов случайно выбирают среди всех активных.`
      ),
    },
    {
      icon: <Gift size={20} />,
      title: L('Sovg\'alar', 'Призы'),
      text: L(
        `Bosh sovg'a — ${config.grandPrize}. ${config.prizesText || ''}`,
        `Главный приз — ${config.grandPrize}. ${config.prizesTextRu || config.prizesText || ''}`
      ),
    },
  ];

  return (
    <Sheet open={isOpen} onClose={onClose} title={L('Aksiya qoidalari', 'Правила акции')}>
      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={i} className="flex gap-3 rounded-2xl bg-page p-3.5">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center">{rule.icon}</div>
            <div className="text-[15px] leading-snug">
              <div className="font-bold">{rule.title}</div>
              <div className="text-muted">{rule.text}</div>
            </div>
          </div>
        ))}
        <a href={`tel:+${config.supportPhone.replace(/\D/g, '')}`} className="btn btn-soft w-full">
          <Phone size={18} />
          {config.supportPhone}
        </a>
      </div>
    </Sheet>
  );
};
