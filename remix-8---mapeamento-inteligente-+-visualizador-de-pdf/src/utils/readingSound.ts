import { useSyncExternalStore } from 'react';
let audio: AudioContext | undefined;
const listeners = new Set<() => void>();
let enabled = true;
try { enabled = localStorage.getItem('ai-reading-sound') !== 'off'; } catch { /* Default on. */ }
export const readingSoundEnabled = () => enabled;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => {listeners.delete(listener);}; };
export const useReadingSound = () => useSyncExternalStore(subscribe, readingSoundEnabled, () => true);
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === 'ai-reading-sound') {enabled = event.newValue !== 'off';listeners.forEach(listener => listener());}
});
export async function prepareReadingSound() {
  if (!enabled || typeof AudioContext === 'undefined') return;
  try { audio ||= new AudioContext(); if (audio.state === 'suspended') await audio.resume(); } catch { /* Visual notices still work. */ }
}
export function setReadingSound(enabledNext: boolean) {
  enabled = enabledNext;
  listeners.forEach(listener => listener());
  try { localStorage.setItem('ai-reading-sound', enabled ? 'on' : 'off'); } catch { /* Session preference remains. */ }
  if (enabled) void prepareReadingSound();
}
export function playReadingSound() {
  if (!enabled || !audio || audio.state !== 'running') return;
  const now = audio.currentTime;
  for (const [index, frequency] of [660, 880].entries()) {
    const tone = audio.createOscillator(), gain = audio.createGain();
    tone.type = 'sine'; tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now + index * 0.18);
    gain.gain.linearRampToValueAtTime(0.12, now + index * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.18 + 0.2);
    tone.connect(gain); gain.connect(audio.destination);
    tone.start(now + index * 0.18); tone.stop(now + index * 0.18 + 0.22);
    tone.onended = () => { tone.disconnect(); gain.disconnect(); };
  }
}
