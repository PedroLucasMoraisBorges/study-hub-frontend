import { AfterViewInit, Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Auto-resize de textarea baseado em scrollHeight, réplica de measureAndStore() do protótipo.
 */
@Directive({
  selector: 'textarea[appAutoresize]',
})
export class AutoresizeDirective implements AfterViewInit {
  readonly minHeight = input(60, { alias: 'appAutoresize' });

  private readonly el = inject(ElementRef<HTMLTextAreaElement>);

  ngAfterViewInit(): void {
    this.resize();
  }

  @HostListener('input')
  onInput(): void {
    this.resize();
  }

  private resize(): void {
    const textarea = this.el.nativeElement;
    textarea.style.height = 'auto';
    const height = Math.max(this.minHeight(), textarea.scrollHeight);
    textarea.style.height = `${height}px`;
  }
}
