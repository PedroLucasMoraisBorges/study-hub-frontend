export type SlideLayout = 'single' | 'two' | 'three';
export type HorizontalAlign = 'left' | 'center' | 'right';
export type VerticalAlign = 'top' | 'center' | 'bottom';

export interface SlideColumn {
  id?: number;
  order?: number;
  text: string;
  align: HorizontalAlign;
  image: string | null;
}

export interface Slide {
  id: number;
  order: number;
  title: string;
  layout: SlideLayout;
  titleAlignH: HorizontalAlign;
  titleAlignV: VerticalAlign;
  bgImage: string | null;
  columns: SlideColumn[];
}

export interface SlideRequest {
  title: string;
  layout: SlideLayout;
  titleAlignH: HorizontalAlign;
  titleAlignV: VerticalAlign;
  bgImage: string | null;
  columns: SlideColumn[];
}
