import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TopicIcon } from '../../models';
import { ICON_PATHS, ICON_SLUGS } from '../../constants/icon-paths.constant';
import { TOPIC_COLORS } from '../../constants/topic-colors.constant';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-icon-swatch-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex;justify-content:space-between">
      @for (icon of slugs; track icon) {
        <div
          (click)="iconSelected.emit(icon)"
          [style]="
            'width:26px;height:26px;flex:none;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'background:' + TOPIC_COLORS[activeColor()].soft + ';color:' + TOPIC_COLORS[activeColor()].ink + ';' +
            'outline:' + (icon === selected() ? '2px solid ' + TOPIC_COLORS[activeColor()].base : 'none') + ';outline-offset:2px'
          "
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [innerHTML]="svg(icon)"></svg>
        </div>
      }
    </div>
  `,
  styles: ':host { display: contents; }',
})
export class IconSwatchRowComponent {
  readonly selected = input<TopicIcon | null>(null);
  readonly activeColor = input.required<keyof typeof TOPIC_COLORS>();

  readonly iconSelected = output<TopicIcon>();

  protected readonly slugs = ICON_SLUGS;
  protected readonly TOPIC_COLORS = TOPIC_COLORS;

  private readonly sanitizer = inject(DomSanitizer);

  protected svg(icon: TopicIcon): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(ICON_PATHS[icon]);
  }
}
