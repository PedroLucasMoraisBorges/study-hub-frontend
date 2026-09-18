import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { FilesService } from '../../shared/services/files.service';
import { FlashcardsService } from '../../shared/services/flashcards.service';
import { Autosaver } from '../../shared/utils/autosave.util';
import { AutoresizeDirective } from '../../shared/directives/autoresize.directive';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Flashcard } from '../../shared/models';

@Component({
  selector: 'app-flashcard-manage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoresizeDirective, ConfirmDialogComponent],
  templateUrl: './flashcard-manage.component.html',
  styleUrl: './flashcard-manage.component.css',
})
export class FlashcardManageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filesApi = inject(FilesService);
  private readonly cardsApi = inject(FlashcardsService);

  private readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });
  private readonly fileId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('fileId')))), {
    initialValue: NaN,
  });

  protected readonly fileName = signal('');
  protected readonly fileDescription = signal('');
  protected readonly cards = signal<Flashcard[]>([]);
  protected readonly loaded = signal(false);

  protected readonly cardCount = computed(() => this.cards().length);
  protected readonly noCards = computed(() => this.cardCount() === 0);

  protected readonly cardFormOpen = signal(false);
  protected readonly editingCardId = signal<number | null>(null);
  protected readonly cardFrontDraft = signal('');
  protected readonly cardBackDraft = signal('');
  protected readonly cardFormTitle = computed(() => (this.editingCardId() === null ? 'Nova carta' : 'Editar carta'));

  protected readonly deletingCard = signal<Flashcard | null>(null);

  private readonly autosaver = new Autosaver();
  private fileDirty = false;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const detail = await firstValueFrom(this.filesApi.getDetail(this.fileId()));
    this.fileName.set(detail.file.name);
    this.fileDescription.set(detail.file.description ?? '');
    this.cards.set(detail.cards ?? []);
    this.loaded.set(true);
  }

  backToTopic(): void {
    this.router.navigate(['/topics', this.topicId()]);
  }

  onTitleChange(value: string): void {
    this.fileName.set(value);
    this.fileDirty = true;
    this.autosaver.schedule(() => this.flush());
  }

  onDescriptionChange(value: string): void {
    this.fileDescription.set(value);
    this.fileDirty = true;
    this.autosaver.schedule(() => this.flush());
  }

  private async flush(): Promise<void> {
    if (!this.fileDirty) return;
    this.fileDirty = false;
    await firstValueFrom(
      this.filesApi.update(this.fileId(), { name: this.fileName(), description: this.fileDescription() }),
    );
  }

  startReview(): void {
    if (this.noCards()) return;
    this.router.navigate(['/topics', this.topicId(), 'files', this.fileId(), 'cards', 'review']);
  }

  openNewCardForm(): void {
    this.editingCardId.set(null);
    this.cardFrontDraft.set('');
    this.cardBackDraft.set('');
    this.cardFormOpen.set(true);
  }

  openEditCardForm(card: Flashcard): void {
    this.editingCardId.set(card.id);
    this.cardFrontDraft.set(card.front);
    this.cardBackDraft.set(card.back);
    this.cardFormOpen.set(true);
  }

  onCardFrontChange(value: string): void {
    this.cardFrontDraft.set(value);
  }

  onCardBackChange(value: string): void {
    this.cardBackDraft.set(value);
  }

  closeCardForm(): void {
    this.cardFormOpen.set(false);
  }

  async saveCard(): Promise<void> {
    const front = this.cardFrontDraft().trim();
    if (!front) {
      this.cardFormOpen.set(false);
      return;
    }
    const back = this.cardBackDraft().trim();
    const editingId = this.editingCardId();
    if (editingId === null) {
      const created = await firstValueFrom(this.cardsApi.create(this.fileId(), { front, back }));
      this.cards.update((list) => [...list, created]);
    } else {
      const updated = await firstValueFrom(this.cardsApi.update(this.fileId(), editingId, { front, back }));
      this.cards.update((list) => list.map((c) => (c.id === editingId ? updated : c)));
    }
    this.cardFormOpen.set(false);
  }

  startDeleteCard(card: Flashcard): void {
    this.deletingCard.set(card);
  }

  cancelDeleteCard(): void {
    this.deletingCard.set(null);
  }

  async confirmDeleteCard(): Promise<void> {
    const card = this.deletingCard();
    if (!card) return;
    await firstValueFrom(this.cardsApi.delete(this.fileId(), card.id));
    this.cards.update((list) => list.filter((c) => c.id !== card.id));
    this.deletingCard.set(null);
  }
}
