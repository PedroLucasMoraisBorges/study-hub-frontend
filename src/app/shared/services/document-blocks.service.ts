import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { CreateDocumentBlockRequest, DocumentBlock, UpdateDocumentBlockRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class DocumentBlocksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(fileId: number): Observable<DocumentBlock[]> {
    return this.http.get<DocumentBlock[]>(`${this.baseUrl}/files/${fileId}/blocks`);
  }

  create(fileId: number, body: CreateDocumentBlockRequest): Observable<DocumentBlock> {
    return this.http.post<DocumentBlock>(`${this.baseUrl}/files/${fileId}/blocks`, body);
  }

  update(fileId: number, blockId: number, body: UpdateDocumentBlockRequest): Observable<DocumentBlock> {
    return this.http.put<DocumentBlock>(`${this.baseUrl}/files/${fileId}/blocks/${blockId}`, body);
  }

  moveUp(fileId: number, blockId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/files/${fileId}/blocks/${blockId}/move-up`, {});
  }

  moveDown(fileId: number, blockId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/files/${fileId}/blocks/${blockId}/move-down`, {});
  }

  delete(fileId: number, blockId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${fileId}/blocks/${blockId}`);
  }
}
