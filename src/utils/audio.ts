/**
 * Ovoz va tebranish: tashqi MP3 fayllarsiz, Web Audio API bilan.
 * Ovoz standart holatda YOQIQ; mijoz profilda o'chirsa, tanlov eslab qolinadi.
 * Telegram ichida Telegram'ning o'z tebranishi (HapticFeedback) ishlatiladi — iPhone'da ham sezildi.
 */

const SOUND_KEY = 'epco_sound';

let audioCtx: AudioContext | null = null;
let soundEnabled = readSoundSetting();
let lastHapticAt = 0;

function readSoundSetting(): boolean {
  try {
    return typeof localStorage === 'undefined' || localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    // saqlab bo'lmasa ham ishlayveradi
  }
  if (enabled) playTap();
}

/** Brauzer ovozni faqat foydalanuvchi bosgandan keyin ruxsat beradi — shuning uchun har safar "uyg'otamiz" */
function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freqFrom: number, freqTo: number, start: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t);
  osc.frequency.exponentialRampToValueAtTime(freqTo, t + duration * 0.6);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

type TelegramHaptic = {
  impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') => void;
  notificationOccurred?: (type: 'success' | 'warning' | 'error') => void;
  selectionChanged?: () => void;
};

function telegramHaptic(): TelegramHaptic | null {
  return (window as any)?.Telegram?.WebApp?.HapticFeedback || null;
}

/**
 * Tebranish. Bir xil bosish uchun ikki marta titramasligi uchun 60 ms ichidagi takrorlar o'tkazib yuboriladi.
 */
export function triggerHaptic(pattern: number | number[] = 15): void {
  const now = Date.now();
  const isStrong = Array.isArray(pattern);
  if (!isStrong && now - lastHapticAt < 60) return;
  lastHapticAt = now;

  const tg = telegramHaptic();
  if (tg?.impactOccurred) {
    tg.impactOccurred(isStrong ? 'medium' : 'light');
    return;
  }
  try {
    navigator.vibrate?.(isStrong ? pattern : Math.min(Number(pattern) || 10, 15));
  } catch {
    // tebranish qo'llab-quvvatlanmaydi
  }
}

/** Har bir tugma bosilganda: yumshoq "tıq" va engil tebranish */
export function playTap(): void {
  triggerHaptic(10);
  if (!soundEnabled) return;
  tone(1300, 1700, 0, 0.06, 0.05);
}

/** Yangi bilet / muvaffaqiyatli kirish: kichik qo'ng'iroq */
export function playTicketChime(): void {
  telegramHaptic()?.notificationOccurred?.('success') ?? triggerHaptic([40, 30, 50]);
  if (!soundEnabled) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, f, i * 0.07, 0.35, 0.12));
}

/** Anketa yoki admin xabari yuborilganda */
export function playSuccessFanfare(): void {
  telegramHaptic()?.notificationOccurred?.('success') ?? triggerHaptic([40, 30, 80]);
  if (!soundEnabled) return;
  [659.25, 880].forEach((f, i) => tone(f, f, i * 0.09, 0.3, 0.1, 'triangle'));
}

/**
 * Butun ilovada har bir tugma/havola bosilishiga ovoz va tebranish beradi.
 * main.tsx da bir marta chaqiriladi.
 */
export function installTapFeedback(): void {
  if (typeof document === 'undefined') return;
  document.addEventListener(
    'pointerdown',
    (e) => {
      const el = (e.target as HTMLElement | null)?.closest?.('button, a, [role="button"], select, label');
      if (!el || (el as HTMLButtonElement).disabled) return;
      playTap();
    },
    { capture: true, passive: true }
  );
}
