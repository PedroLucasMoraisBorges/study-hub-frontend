import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { UiShellService } from './shared/services/ui-shell.service';

@Component({
  imports: [RouterOutlet, SidebarComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  private readonly uiShell = inject(UiShellService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showSidebar = computed(
    () => !this.currentUrl().includes('/cards/review') && !this.uiShell.mindmapFullscreen(),
  );
}
