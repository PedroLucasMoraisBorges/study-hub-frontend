import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ColorSlug } from '../../models';
import { COLOR_SLUGS, TOPIC_COLORS } from '../../constants/topic-colors.constant';

@Component({
  selector: 'app-color-swatch-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [style]="'display:flex;flex-wrap:wrap;justify-content:space-between;gap:' + gap()">
      @for (slug of slugs; track slug) {
        <div
          (click)="colorSelected.emit(slug)"
          [style]="
            'width:' + size() + 'px;height:' + size() + 'px;flex:none;border-radius:50%;cursor:pointer;' +
            'background:' + TOPIC_COLORS[slug].base + ';' +
            'outline:' + (slug === selected() ? '2px solid ' + TOPIC_COLORS[slug].base : 'none') + ';outline-offset:2px'
          "
        ></div>
      }
    </div>
  `,
  styles: ':host { display: contents; }',
})
export class ColorSwatchRowComponent {
  readonly selected = input<ColorSlug | null>(null);
  readonly size = input<number>(22);
  readonly gap = input<string>('0px');

  readonly colorSelected = output<ColorSlug>();

  protected readonly slugs = COLOR_SLUGS;
  protected readonly TOPIC_COLORS = TOPIC_COLORS;
}
