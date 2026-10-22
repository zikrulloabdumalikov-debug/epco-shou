import React from 'react';
import { Gift, PlayCircle } from 'lucide-react';
import { ClientStats, PromoConfig } from '../types';
import { useL } from '../i18n/lang';
import damasPrizeImg from '../assets/images/damas_prize.webp';

interface PrizeCardProps {
  stats: ClientStats;
  config: PromoConfig;
}

/** Orzu ko'z oldida bo'lishi kerak: DAMAS rasmi va boshqa sovg'alar (foiz/kafolat ko'rsatilmaydi) */
export const PrizeCard: React.FC<PrizeCardProps> = ({ config }) => {
  const L = useL();

  return (
    <section className="card overflow-hidden">
      <div className="relative">
        <img src={damasPrizeImg} alt={config.grandPrize} className="w-full h-44 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-4 bottom-3 right-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/80">{L('Bosh sovg\'a', 'Главный приз')}</div>
          <div className="text-2xl font-extrabold">{config.grandPrize}</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gold-soft text-gold flex items-center justify-center">
            <Gift size={20} />
          </div>
          <div className="text-[15px] leading-snug">
            <div className="font-bold">{L('Yana sovg\'alar', 'И ещё призы')}</div>
            <div className="text-muted">{L(config.prizesText || '', config.prizesTextRu || config.prizesText || '')}</div>
          </div>
        </div>

        {config.liveUrl && (
          <a href={config.liveUrl} target="_blank" rel="noopener noreferrer" className="btn w-full bg-[#FF0033] text-white">
            <PlayCircle size={20} />
            {L('Jonli efir / videoni ko\'rish', 'Смотреть эфир / видео')}
          </a>
        )}
      </div>
    </section>
  );
};
