import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { API_BASE_URL } from '../../core/config/api-config';
import { Color } from '../models';

@Injectable({ providedIn: 'root' })
export class ColorsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private colors$?: Observable<Color[]>;

  list(): Observable<Color[]> {
    if (!this.colors$) {
      this.colors$ = this.http
        .get<Color[]>(`${this.baseUrl}/colors`)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.colors$;
  }
}
