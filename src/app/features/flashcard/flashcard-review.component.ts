import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { FilesService } from '../../shared/services/files.service';
import { shuffle } from '../../shared/utils/shuffle.util';
import { Flashcard } from '../../shared/models';

type RatingKind = 'again' | 'hard' | 'good' | 'easy';

interface SessionRatings {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface ReportStat {
  label: string;
  count: number;
  color: string;
  bg: string;
}

const EMPTY_RATINGS: SessionRatings = { again: 0, hard: 0, good: 0, easy: 0 };

@Component({
  selector: 'app-flashcard-review',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flashcard-review.component.html',
  styles: ':host { display: contents; }',
})
export class FlashcardReviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filesApi = inject(FilesService);

  private readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });
  private readonly fileId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('fileId')))), {
    initialValue: NaN,
  });

  protected readonly fileName = signal('');
  protected readonly cards = signal<Flashcard[]>([]);
  protected readonly loaded = signal(false);

  protected readonly cardIndex = signal(0);
  protected readonly flipped = signal(false);
  protected readonly sessionRatings = signal<SessionRatings>({ ...EMPTY_RATINGS });

  protected readonly total = computed(() => this.cards().length);
  protected readonly cardsDone = computed(() => this.cardIndex() >= this.total());

  protected readonly cardsProgress = computed(() => {
    const total = this.total();
    return total ? Math.min(100, Math.round((this.cardIndex() / total) * 100)) : 0;
  });

  protected readonly cardsPositionLabel = computed(() => {
    const total = this.total();
    return `Carta ${Math.min(this.cardIndex() + 1, total)} / ${total}`;
  });

  protected readonly cardFaceText = computed(() => {
    if (this.cardsDone()) return '';
    const card = this.cards()[this.cardIndex()];
    return this.flipped() ? card.back : card.front;
  });

  protected readonly reportStats = computed<ReportStat[]>(() => {
    const ratings = this.sessionRatings();
    return [
      { label: 'Again', count: ratings.again, color: 'var(--rose)', bg: 'var(--rose-soft)' },
      { label: 'Hard', count: ratings.hard, color: 'var(--amber-ink)', bg: 'var(--amber-soft)' },
      { label: 'Good', count: ratings.good, color: 'var(--accent-ink)', bg: 'var(--accent-soft)' },
      { label: 'Easy', count: ratings.easy, color: 'var(--blue-ink)', bg: 'var(--blue-soft)' },
    ];
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const detail = await firstValueFrom(this.filesApi.getDetail(this.fileId()));
    this.fileName.set(detail.file.name);
    this.resetSession(detail.cards ?? []);
    this.loaded.set(true);
  }

  private resetSession(cards: Flashcard[]): void {
    this.cards.set(shuffle(cards));
    this.cardIndex.set(0);
    this.flipped.set(false);
    this.sessionRatings.set({ ...EMPTY_RATINGS });
  }

  backToCardsManage(): void {
    this.router.navigate(['/topics', this.topicId(), 'files', this.fileId(), 'cards']);
  }

  flipCard(): void {
    this.flipped.update((f) => !f);
  }

  private rate(kind: RatingKind): void {
    this.sessionRatings.update((r) => ({ ...r, [kind]: r[kind] + 1 }));
    this.cardIndex.update((i) => i + 1);
    this.flipped.set(false);
  }

  rateAgain(): void {
    this.rate('again');
  }

  rateHard(): void {
    this.rate('hard');
  }

  rateGood(): void {
    this.rate('good');
  }

  rateEasy(): void {
    this.rate('easy');
  }

  restartDeck(): void {
    this.resetSession(this.cards());
  }
}
