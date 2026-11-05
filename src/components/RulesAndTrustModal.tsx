import React from 'react';
import { Banknote, ShieldCheck, Shuffle, Gift, Phone, CalendarDays, Car } from 'lucide-react';
import { PromoConfig } from '../types';
import { useL, useLanguage, MONTHS, money } from '../i18n/lang';
import { Sheet } from './Sheet';

interface RulesAndTrustModalProps {
  isOpen: boolean;
  config: PromoConfig;
  onClose: () => void;
}

export const RulesAndTrustModal: React.FC<RulesAndTrustModalProps> = ({ isOpen, config, onClose }) => {
  const L = useL();
  const language = useLanguage();
  const K = config.totalShowWinners;
  const price = money(config.ticketPrice || 500);

  // Aksiya oylari: boshlanish va tugash sanalari orasidagi oylar (masalan: oktyabr, noyabr, dekabr)
  const months: string[] = [];
  const [sy, sm] = (config.startDate || '').split('-').map(Number);
  const [ey, em] = (config.endDate || '').split('-').map(Number);
  if (sy && sm && ey && em) {
    for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, (m = 1)) : m++) {
      months.push(MONTHS[language][m - 1].toLowerCase());
      if (months.length > 12) break;
    }
  }

  const rules = [
    {
      icon: <CalendarDays size={20} />,
      title: L("Har oy — alohida o'yin", 'Каждый месяц — отдельная игра'),
      text: L(
        `Aksiya ${months.join(', ')} oylarida. Har oy: 1 ta ${config.grandPrize} va 15 000$ lik sovg'alar. Har oy hisob 0 dan boshlanadi — o'tgan oy to'lovi keyingi oyga o'tmaydi.`,
        `Акция в ${months.join(', ')}. Каждый месяц: 1 ${config.grandPrize} и подарки на 15 000$. Счёт каждый месяц начинается с 0 — оплаты прошлого месяца не переносятся.`
      ),
    },
    {
      icon: <Banknote size={20} />,
      title: L(`Har ${price} to'lov = 1 bilet`, `Каждые ${price} оплаты = 1 билет`),
      text: L(
        `Biletlar va ${price} dan kam qoldiq har oy boshida nolga tushadi.`,
        `Билеты и остаток меньше ${price} обнуляются в начале каждого месяца.`
      ),
    },
    {
      icon: <ShieldCheck size={20} />,
      title: L('Qarz bo\'lsa — biletlar nofaol', 'Есть долг — билеты неактивны'),
      text: L(
        'Biletlar o\'yinda qatnashishi uchun qarzingizni 0 qiling. Qarz yopilishi bilan barcha biletlar darhol faollashadi.',
        'Чтобы билеты участвовали в розыгрыше, погасите долг до 0. Как только долг погашен, все билеты сразу активируются.'
      ),
    },
    {
      icon: <Car size={20} />,
      title: L(`Bosh sovrin — ${config.grandPrize}`, `Главный приз — ${config.grandPrize}`),
      text: L(
        'Barcha faol bilet egalari orasida o\'ynaladi — biletingiz qancha ko\'p bo\'lsa, imkoniyat shuncha yuqori.',
        'Разыгрывается среди всех владельцев активных билетов — чем больше билетов, тем выше шанс.'
      ),
    },
    {
      icon: <Shuffle size={20} />,
      title: L(`Super o'yin — ${K} ta chipta`, `Супер-игра — ${K} билетов`),
      text: L(
        `Jonli efirda lototron orqali ${K} ta chipta tanlanadi. Qimmatbaho sovg'alar shu chipta egalari orasida o'ynaladi.`,
        `В прямом эфире лототрон выбирает ${K} билетов. Ценные подарки разыгрываются среди их владельцев.`
      ),
    },
    {
      icon: <Gift size={20} />,
      title: L('Sovg\'alar', 'Призы'),
      text: L(config.prizesText || '', config.prizesTextRu || config.prizesText || ''),
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
