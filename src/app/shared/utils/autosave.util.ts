import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { WritableSignal, signal } from '@angular/core';

export type SaveStatus = 'saved' | 'saving';

/**
 * Réplica do triggerSave() do protótipo: debounce de 700ms antes de considerar "salvo",
 * mas aqui o disparo real do save (chamada à API) acontece imediatamente após o debounce
 * de digitação (evita floodar a API a cada tecla).
 */
export class Autosaver {
  readonly status: WritableSignal<SaveStatus> = signal('saved');

  private readonly trigger$ = new Subject<() => void>();
  private readonly subscription: Subscription;

  constructor(debounceMs = 700) {
    this.subscription = this.trigger$.pipe(debounceTime(debounceMs)).subscribe((save) => {
      save();
      this.status.set('saved');
    });
  }

  schedule(save: () => void): void {
    this.status.set('saving');
    this.trigger$.next(save);
  }

  destroy(): void {
    this.subscription.unsubscribe();
  }
}
