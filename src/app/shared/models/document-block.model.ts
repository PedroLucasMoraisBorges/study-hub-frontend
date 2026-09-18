export type DocumentBlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'bullet'
  | 'link'
  | 'image'
  | 'file'
  | 'hr'
  | 'code'
  | 'quote';

export interface DocumentBlock {
  id: number;
  order: number;
  type: DocumentBlockType;
  contentText: string | null;
  linkUrl: string | null;
  imageFile: string | null;
  documentFile: string | null;
  documentFileName: string | null;
  language: string | null;
}

export interface CreateDocumentBlockRequest {
  type: DocumentBlockType;
  afterId?: number | null;
}

export interface UpdateDocumentBlockRequest {
  contentText?: string | null;
  linkUrl?: string | null;
  imageFile?: string | null;
  documentFile?: string | null;
  documentFileName?: string | null;
  language?: string | null;
}
