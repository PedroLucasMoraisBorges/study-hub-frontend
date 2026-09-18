export type ColorSlug =
  | 'accent'
  | 'amber'
  | 'blue'
  | 'rose'
  | 'violet'
  | 'teal'
  | 'coral'
  | 'slate';

export interface Color {
  id: number;
  slug: ColorSlug;
  hexadecimal: string;
}
