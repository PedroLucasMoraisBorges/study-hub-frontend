import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { Topic, TopicRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class TopicsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.baseUrl}/topics`);
  }

  create(body: TopicRequest): Observable<Topic> {
    return this.http.post<Topic>(`${this.baseUrl}/topics`, body);
  }

  update(id: number, body: TopicRequest): Observable<Topic> {
    return this.http.put<Topic>(`${this.baseUrl}/topics/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/topics/${id}`);
  }
}
