import { NoteColor } from '../models';

export interface NoteColorOption {
  slug: NoteColor;
  label: string;
  bg: string;
  ink: string;
}

const option = (slug: NoteColor, label: string): NoteColorOption => ({
  slug,
  label,
  bg: `var(--note-${slug})`,
  ink: `var(--note-${slug}-ink)`,
});

export const NOTE_COLORS: NoteColorOption[] = [
  option('butter', 'Amarelo'),
  option('sage', 'Verde'),
  option('peach', 'Pêssego'),
  option('lavender', 'Lavanda'),
  option('mist', 'Azul'),
];

export const NOTE_COLOR_BY_SLUG: Record<NoteColor, NoteColorOption> = Object.fromEntries(
  NOTE_COLORS.map((c) => [c.slug, c]),
) as Record<NoteColor, NoteColorOption>;
