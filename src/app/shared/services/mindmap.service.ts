import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { CreateMindMapNodeRequest, MindMapNode, UpdateMindMapNodeRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class MindmapService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(fileId: number): Observable<MindMapNode[]> {
    return this.http.get<MindMapNode[]>(`${this.baseUrl}/files/${fileId}/mindmap/nodes`);
  }

  create(fileId: number, body: CreateMindMapNodeRequest): Observable<MindMapNode> {
    return this.http.post<MindMapNode>(`${this.baseUrl}/files/${fileId}/mindmap/nodes`, body);
  }

  update(fileId: number, nodeId: number, body: UpdateMindMapNodeRequest): Observable<MindMapNode> {
    return this.http.patch<MindMapNode>(`${this.baseUrl}/files/${fileId}/mindmap/nodes/${nodeId}`, body);
  }

  delete(fileId: number, nodeId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${fileId}/mindmap/nodes/${nodeId}`);
  }
}
