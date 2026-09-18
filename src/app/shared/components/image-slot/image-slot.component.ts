import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

/**
 * Slot de imagem simples: clique ou arraste-e-solte para enviar, com preview,
 * substituir/remover no hover. Réplica visual do <image-slot> do protótipo
 * (sem crop/reframe, que nunca funcionou fora do editor Claude-Design — ver spec seção 5).
 */
@Component({
  selector: 'app-image-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-slot.component.html',
  styleUrl: './image-slot.component.css',
})
export class ImageSlotComponent {
  readonly value = input<string | null>(null);
  readonly placeholder = input('Arraste uma imagem');
  readonly readonlyMode = input(false, { alias: 'readonly' });

  readonly valueChange = output<string | null>();

  protected readonly dragOver = signal(false);

  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  pick(): void {
    if (this.readonlyMode()) return;
    this.fileInput().nativeElement.click();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.readAsDataUrl(file);
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    if (this.readonlyMode()) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    if (this.readonlyMode()) return;
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readAsDataUrl(file);
  }

  remove(event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(null);
  }

  private readAsDataUrl(file: File): void {
    const reader = new FileReader();
    reader.onload = () => this.valueChange.emit(reader.result as string);
    reader.readAsDataURL(file);
  }
}
