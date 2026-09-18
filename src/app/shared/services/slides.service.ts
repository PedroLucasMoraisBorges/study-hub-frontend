import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { Slide, SlideRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class SlidesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(fileId: number): Observable<Slide[]> {
    return this.http.get<Slide[]>(`${this.baseUrl}/files/${fileId}/slides`);
  }

  create(fileId: number, body: SlideRequest): Observable<Slide> {
    return this.http.post<Slide>(`${this.baseUrl}/files/${fileId}/slides`, body);
  }

  update(fileId: number, slideId: number, body: SlideRequest): Observable<Slide> {
    return this.http.put<Slide>(`${this.baseUrl}/files/${fileId}/slides/${slideId}`, body);
  }

  delete(fileId: number, slideId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/files/${fileId}/slides/${slideId}`);
  }
}
