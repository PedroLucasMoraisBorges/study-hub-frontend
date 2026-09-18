import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { CreateNoteRequest, Note, UpdateNoteRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listByTopic(topicId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.baseUrl}/topics/${topicId}/notes`);
  }

  listByFile(documentId: number): Observable<Note[]> {
    return this.http.get<Note[]>(`${this.baseUrl}/files/${documentId}/notes`);
  }

  create(topicId: number, body: CreateNoteRequest): Observable<Note> {
    return this.http.post<Note>(`${this.baseUrl}/topics/${topicId}/notes`, body);
  }

  update(noteId: number, body: UpdateNoteRequest): Observable<Note> {
    return this.http.put<Note>(`${this.baseUrl}/notes/${noteId}`, body);
  }

  delete(noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/notes/${noteId}`);
  }
}
