import { FileType } from '../models';

export function fileRouteSegment(type: FileType): 'doc' | 'cards' | 'mindmap' | 'slides' {
  if (type === 'doc') return 'doc';
  if (type === 'cards') return 'cards';
  if (type === 'mindmap') return 'mindmap';
  return 'slides';
}

export function fileRouteCommands(topicId: number, fileId: number, type: FileType): unknown[] {
  return ['/topics', topicId, 'files', fileId, fileRouteSegment(type)];
}
