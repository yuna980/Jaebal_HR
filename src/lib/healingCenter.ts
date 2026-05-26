export type HealingMoodId = 'anger' | 'calm' | 'peace';

export interface HealingMood {
  id: HealingMoodId;
  label: string;
  threshold: number;
  message: string;
  emojis: string[];
  accent: string;
  accentDark: string;
  accentSoft: string;
  ring: string;
  face: 'tense' | 'breathing' | 'smile';
}

export const HEALING_MOODS: HealingMood[] = [
  {
    id: 'anger',
    label: '분노',
    threshold: 0,
    message: '야구로 화내지 말자',
    emojis: ['💧', '💨', '💬'],
    accent: '#FB7185',
    accentDark: '#F43F5E',
    accentSoft: '#FFF1F2',
    ring: 'rgba(251, 113, 133, 0.2)',
    face: 'tense',
  },
  {
    id: 'calm',
    label: '진정',
    threshold: 50,
    message: '야구로 화내지 말자',
    emojis: ['✨', '🍃', '🫧'],
    accent: '#60A5FA',
    accentDark: '#3B82F6',
    accentSoft: '#EFF6FF',
    ring: 'rgba(96, 165, 250, 0.2)',
    face: 'breathing',
  },
  {
    id: 'peace',
    label: '평온',
    threshold: 100,
    message: '야구로 화내지 말자',
    emojis: ['🌸', '💖', '🍀'],
    accent: '#34D399',
    accentDark: '#10B981',
    accentSoft: '#ECFDF5',
    ring: 'rgba(52, 211, 153, 0.2)',
    face: 'smile',
  },
];

export function getHealingMood(count: number) {
  if (count >= 100) return HEALING_MOODS[2];
  if (count >= 50) return HEALING_MOODS[1];
  return HEALING_MOODS[0];
}

export function getHealingProgress(count: number) {
  return Math.min(100, Math.max(0, count));
}

export function getRandomHealingEmoji(mood: HealingMood) {
  return mood.emojis[Math.floor(Math.random() * mood.emojis.length)];
}
