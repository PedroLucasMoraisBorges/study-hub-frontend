export type NodeShape = 'rectangle' | 'circle' | 'square' | 'diamond';
export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';
export type NodeFontSize = 'small' | 'medium' | 'large';

export interface MindMapNode {
  id: number;
  parentId: number | null;
  label: string;
  description: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shape: NodeShape;
  color: { id: number; slug: string; hexadecimal: string } | null;
  borderStyle: BorderStyle;
  borderColor: { id: number; slug: string; hexadecimal: string } | null;
  fontSize: NodeFontSize;
}

export interface CreateMindMapNodeRequest {
  parentId?: number | null;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface UpdateMindMapNodeRequest {
  label?: string;
  description?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  shape?: NodeShape;
  colorId?: number;
  borderStyle?: BorderStyle;
  borderColorId?: number;
  fontSize?: NodeFontSize;
}
