import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { Flashcard, FlashcardRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class FlashcardsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(fileId: number): Observable<Flashcard[]> {
    return this.http.get<Flashcard[]>(`${this.baseUrl}/files/${fileId}/cards`);
  }

  create(fileId: number, body: FlashcardRequest): Observable<Flashcard> {
    return this.http.post<Flashcard>(`${this.baseUrl}/files/${fileId}/cards`, body);
  }

  update(fileId: number, cardId: number, body: FlashcardRequest): Observable<Flashcard> {
    return this.http.put<Flashcard>(`${this.baseUrl}/files/${fileId}/cards/${cardId}`, body);
  }

  delete(fileId: number, cardId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${fileId}/cards/${cardId}`);
  }
}
