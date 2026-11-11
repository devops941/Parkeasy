import { Platform, Vibration } from 'react-native';

// --- Web Audio API helpers -------------------------------------------
const webBeep = (ctx, freq, startTime, duration, volume = 0.4) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return Ctx ? new Ctx() : null;
};

// --- Subtle scanning tick (plays every poll cycle) -------------------
export const playSearchTick = () => {
  if (Platform.OS === 'web') {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      webBeep(ctx, 660, t, 0.08, 0.15);
    } catch (_) {}
  } else {
    Vibration.vibrate(40);
  }
};

// --- Prominent "parking found" alert (plays once, auto-stops) --------
export const playParkingFoundAlert = () => {
  if (Platform.OS === 'web') {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      // Three ascending tones: found!
      webBeep(ctx, 880,  t,        0.18, 0.5);
      webBeep(ctx, 1100, t + 0.22, 0.18, 0.5);
      webBeep(ctx, 1320, t + 0.44, 0.35, 0.5);
      webBeep(ctx, 1100, t + 0.66, 0.18, 0.4);
      webBeep(ctx, 1320, t + 0.88, 0.5,  0.5);
    } catch (_) {}
  } else {
    // Mobile: strong vibration pattern + notification sound fires separately
    Vibration.vibrate([0, 250, 120, 250, 120, 500]);
  }
};

// --- Cancel any ongoing vibration (mobile only) ----------------------
export const cancelAlert = () => {
  if (Platform.OS !== 'web') {
    Vibration.cancel();
  }
};
