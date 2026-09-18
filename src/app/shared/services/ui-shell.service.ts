import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiShellService {
  readonly mindmapFullscreen = signal(false);

  setMindmapFullscreen(value: boolean): void {
    this.mindmapFullscreen.set(value);
  }

  toggleMindmapFullscreen(): void {
    this.mindmapFullscreen.update((v) => !v);
  }
}
