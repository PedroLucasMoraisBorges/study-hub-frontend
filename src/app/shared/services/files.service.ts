import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import {
  CreateFileRequest,
  FileDetail,
  FileSummary,
  FileType,
  UpdateFileRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listByTopic(topicId: number, type?: FileType): Observable<FileSummary[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http.get<FileSummary[]>(`${this.baseUrl}/topics/${topicId}/files`, { params });
  }

  create(topicId: number, body: CreateFileRequest): Observable<FileSummary> {
    return this.http.post<FileSummary>(`${this.baseUrl}/topics/${topicId}/files`, body);
  }

  getDetail(id: number): Observable<FileDetail> {
    return this.http.get<FileDetail>(`${this.baseUrl}/files/${id}`);
  }

  update(id: number, body: UpdateFileRequest): Observable<FileSummary> {
    return this.http.put<FileSummary>(`${this.baseUrl}/files/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${id}`);
  }
}
