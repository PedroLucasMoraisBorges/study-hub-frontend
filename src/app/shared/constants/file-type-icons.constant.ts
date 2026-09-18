import { FileType } from '../models';

export const FILE_TYPE_ICON_PATHS: Record<FileType, string> = {
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  cards: '<rect x="3" y="5" width="14" height="10" rx="2"/><path d="M7 15v2M13 15v2M5 19h10"/>',
  mindmap: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5L6.5 16M12 7.5l5.5 8.5"/>',
  slides: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
};

export const FILE_TYPE_KICKER: Record<FileType, string> = {
  doc: 'Doc',
  cards: 'Flashcards',
  mindmap: 'Mapa mental',
  slides: 'Slides',
};
