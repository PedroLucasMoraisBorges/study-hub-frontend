import { ColorSlug } from '../models';

export interface TopicColorTheme {
  soft: string;
  ink: string;
  base: string;
}

export const TOPIC_COLORS: Record<ColorSlug, TopicColorTheme> = {
  accent: { soft: 'var(--accent-soft)', ink: 'var(--accent-ink)', base: 'var(--accent)' },
  amber: { soft: 'var(--amber-soft)', ink: 'var(--amber-ink)', base: 'var(--amber)' },
  blue: { soft: 'var(--blue-soft)', ink: 'var(--blue-ink)', base: 'var(--blue)' },
  rose: { soft: 'var(--rose-soft)', ink: 'var(--rose-ink)', base: 'var(--rose)' },
  violet: { soft: 'var(--violet-soft)', ink: 'var(--violet-ink)', base: 'var(--violet)' },
  teal: { soft: 'var(--teal-soft)', ink: 'var(--teal-ink)', base: 'var(--teal)' },
  coral: { soft: 'var(--coral-soft)', ink: 'var(--coral-ink)', base: 'var(--coral)' },
  slate: { soft: 'var(--slate-soft)', ink: 'var(--slate-ink)', base: 'var(--slate)' },
};

export const COLOR_SLUGS: ColorSlug[] = [
  'accent', 'amber', 'blue', 'rose', 'violet', 'teal', 'coral', 'slate',
];
