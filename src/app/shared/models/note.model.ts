export type NoteColor = 'butter' | 'sage' | 'peach' | 'lavender' | 'mist';

export interface Note {
  id: number;
  documentId: number | null; // null = nota avulsa do tópico
  topicId: number;
  text: string | null;
  color: NoteColor; // default 'butter'
  createdAt: string; // ISO
}

export interface CreateNoteRequest {
  documentId?: number | null;
}

export interface UpdateNoteRequest {
  text?: string | null;
  color?: NoteColor;
}
