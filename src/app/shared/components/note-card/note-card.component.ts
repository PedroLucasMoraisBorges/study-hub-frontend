import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Note, NoteColor } from '../../models';
import { NOTE_COLORS, NOTE_COLOR_BY_SLUG } from '../../constants/note-colors.constant';
import { AutoresizeDirective } from '../../directives/autoresize.directive';

export type NoteCardVariant = 'panel' | 'board';

// Painel do editor: organizado (±0.5° alternado). Mural do tópico: leve espalhamento, determinista por índice
// (sem Math.random para o card não "pular" a cada renderização).
const BOARD_ROTATIONS = [-3, 2.5, -4, 3, -2, 4.5];
const BOARD_OFFSETS_Y = [0, 8, -4, 10, 2, -6];

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function formatNoteDate(iso: string): string {
  const parts = DATE_FORMAT.formatToParts(new Date(iso));
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', '');
  return `${day} ${month}`.trim();
}

@Component({
  selector: 'app-note-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoresizeDirective],
  templateUrl: './note-card.component.html',
  styleUrl: './note-card.component.css',
})
export class NoteCardComponent {
  readonly note = input.required<Note>();
  readonly index = input(0);
  readonly editable = input(true);
  readonly variant = input<NoteCardVariant>('panel');

  readonly textChange = output<string>();
  readonly colorChange = output<NoteColor>();
  readonly remove = output<void>();

  protected readonly colors = NOTE_COLORS;
  protected readonly confirmingDelete = signal(false);

  private readonly textarea = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly cancelButton = viewChild<ElementRef<HTMLButtonElement>>('cancelButton');

  protected readonly palette = computed(() => NOTE_COLOR_BY_SLUG[this.note().color]);
  protected readonly dateLabel = computed(() => formatNoteDate(this.note().createdAt));

  protected readonly transform = computed(() => {
    const i = this.index();
    if (this.variant() === 'panel') {
      return `rotate(${i % 2 === 0 ? 0.5 : -0.5}deg)`;
    }
    const n = BOARD_ROTATIONS.length;
    return `translateY(${BOARD_OFFSETS_Y[i % n]}px) rotate(${BOARD_ROTATIONS[i % n]}deg)`;
  });

  constructor() {
    // Ao abrir a confirmação, o foco vai para "Cancelar" (ação segura por padrão).
    effect(() => this.cancelButton()?.nativeElement.focus());
  }

  focus(): void {
    this.textarea()?.nativeElement.focus();
  }

  protected askDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(event?: Event): void {
    // Esc dentro da confirmação só cancela a confirmação (não deve fechar o painel de notas do editor).
    event?.stopPropagation();
    this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    this.confirmingDelete.set(false);
    this.remove.emit();
  }
}
