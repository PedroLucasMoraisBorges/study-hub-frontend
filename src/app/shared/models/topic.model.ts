import { Color } from './color.model';

export type TopicIcon = 'code' | 'book' | 'star' | 'flag' | 'target' | 'bulb';

export interface Topic {
  id: number;
  name: string;
  color: Color;
  icon: TopicIcon;
  fileCount: number;
}

export interface TopicRequest {
  name: string;
  colorId: number;
  icon: TopicIcon;
}
