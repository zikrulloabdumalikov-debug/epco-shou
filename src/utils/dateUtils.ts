export interface MonthTimeRemaining {
  currentDate: Date;
  formattedDate: string; // e.g. "30-Sentyabr, 2026"
  currentMonthName: string; // "Sentyabr 2026"
  dayOfMonth: number; // 30
  daysInMonth: number; // 30
  isLastDayOfMonth: boolean; // true on the 30th of September
  isMonthEndWarning: boolean; // true (within last 7 days)
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  timeRemainingLabel: string; // e.g. "Bugun so'nggi kun! (16soat 36daq)"
  urgencyText: string;
}

export function getMonthTimeRemaining(
  dateInput?: Date | string | number,
  language: 'uz' | 'ru' = 'uz'
): MonthTimeRemaining {
  const now = dateInput ? new Date(dateInput) : new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed (8 = September)
  const dayOfMonth = now.getDate();

  // Last millisecond of current month (e.g. 2026-09-30 23:59:59.999)
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const daysInMonth = endOfMonth.getDate();

  const diffMs = Math.max(0, endOfMonth.getTime() - now.getTime());
  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const daysRemaining = Math.floor(hoursRemaining / 24);

  // If today is the last calendar day of the month or less than 24 hours remain
  const isLastDayOfMonth = dayOfMonth === daysInMonth || hoursRemaining < 24;
  const isMonthEndWarning = daysRemaining <= 7 || isLastDayOfMonth;

  const monthNamesUz = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const monthName = (language === 'ru' ? monthNamesRu : monthNamesUz)[month];
  const currentMonthName = `${monthName} ${year}`;
  const formattedDate = `${dayOfMonth}-${monthName}, ${year}`;

  let timeRemainingLabel = '';
  let urgencyText = '';

  if (isLastDayOfMonth) {
    if (language === 'ru') {
      timeRemainingLabel = `Сегодня последний день! (${hoursRemaining}ч ${minutesRemaining}м)`;
      urgencyText = `Сегодня в 23:59 завершается этап месяца. Не сгорайте остаток!`;
    } else {
      timeRemainingLabel = `Bugun so'nggi kun! (${hoursRemaining}soat ${minutesRemaining}daq)`;
      urgencyText = `Bugun soat 23:59 da oylik bosqich yakunlanadi. Biletga to'ldirib oling!`;
    }
  } else if (daysRemaining === 1) {
    timeRemainingLabel = language === 'ru' ? 'Остался 1 день!' : '1 kun qoldi!';
    urgencyText = language === 'ru' ? 'Завтра завершение месяца!' : 'Ertaga oy yakunlanadi!';
  } else {
    timeRemainingLabel = language === 'ru' ? `${daysRemaining} дн. осталось` : `${daysRemaining} kun qoldi`;
    urgencyText = language === 'ru' ? `До конца месяца осталось ${daysRemaining} дней` : `Oy oxirigacha ${daysRemaining} kun qoldi`;
  }

  return {
    currentDate: now,
    formattedDate,
    currentMonthName,
    dayOfMonth,
    daysInMonth,
    isLastDayOfMonth,
    isMonthEndWarning,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    timeRemainingLabel,
    urgencyText,
  };
}
