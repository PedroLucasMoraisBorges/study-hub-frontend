export type FileType = 'doc' | 'cards' | 'mindmap' | 'slides';

export interface FileMetadata {
  count: number;
}

export interface FileSummary {
  id: number;
  topicId: number;
  name: string;
  description: string | null;
  type: FileType;
  metadata: FileMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileRequest {
  name: string;
  type: FileType;
}

export interface UpdateFileRequest {
  name: string;
  description?: string | null;
}
