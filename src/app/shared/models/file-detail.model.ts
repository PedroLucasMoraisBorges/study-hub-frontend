import { DocumentBlock } from './document-block.model';
import { Flashcard } from './flashcard.model';
import { FileSummary } from './file.model';
import { MindMapNode } from './mindmap-node.model';
import { Slide } from './slide.model';

export interface FileDetail {
  file: FileSummary;
  blocks: DocumentBlock[] | null;
  cards: Flashcard[] | null;
  slides: Slide[] | null;
  nodes: MindMapNode[] | null;
}
