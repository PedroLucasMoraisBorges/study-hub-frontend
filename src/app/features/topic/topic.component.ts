import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { map } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { TopicsStore } from '../../shared/services/topics-store.service';
import { FilesService } from '../../shared/services/files.service';
import { NotesService } from '../../shared/services/notes.service';
import { TOPIC_COLORS } from '../../shared/constants/topic-colors.constant';
import { ICON_PATHS } from '../../shared/constants/icon-paths.constant';
import { FILE_TYPE_ICON_PATHS, FILE_TYPE_KICKER } from '../../shared/constants/file-type-icons.constant';
import { fileRouteCommands } from '../../shared/utils/file-route.util';
import { Autosaver } from '../../shared/utils/autosave.util';
import { NotesSync } from '../../shared/utils/notes-sync';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NoteCardComponent } from '../../shared/components/note-card/note-card.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { FileSummary, FileType, Note } from '../../shared/models';

type TabId = 'all' | 'notes' | FileType;

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'doc', label: 'Docs' },
  { id: 'cards', label: 'Flashcards' },
  { id: 'slides', label: 'Slides' },
  { id: 'mindmap', label: 'Mapas mentais' },
  { id: 'notes', label: 'Notas' },
];

interface NoteGroup {
  doc: FileSummary;
  notes: Note[];
}

interface FileVm {
  file: FileSummary;
  cardBg: string;
  cardShadow: string;
  ink: string;
  iconSvg: SafeHtml;
  kicker: string;
  isDoc: boolean;
  isCards: boolean;
  isSlides: boolean;
  countLabel: string | null;
}

@Component({
  selector: 'app-topic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent, NoteCardComponent, TimeAgoPipe],
  templateUrl: './topic.component.html',
  styleUrl: './topic.component.css',
})
export class TopicComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly topicsStore = inject(TopicsStore);
  private readonly filesApi = inject(FilesService);
  private readonly notesApi = inject(NotesService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly injector = inject(Injector);

  protected readonly tabs = TABS;
  protected readonly activeTab = signal<TabId>('all');
  protected readonly addFileOpen = signal(false);
  protected readonly deletingFile = signal<FileSummary | null>(null);
  protected readonly files = signal<FileSummary[]>([]);

  protected readonly notes = signal<Note[]>([]);
  private readonly noteDocs = signal<FileSummary[]>([]);
  private readonly autosaver = new Autosaver();
  protected readonly notesSync = new NotesSync(this.notes, this.notesApi, () =>
    this.autosaver.schedule(() => void this.notesSync.flush()),
  );
  private readonly noteCards = viewChildren(NoteCardComponent);

  private readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });

  protected readonly topic = computed(() => this.topicsStore.getById(this.topicId()));

  protected readonly topicSoft = computed(() => {
    const topic = this.topic();
    return topic ? TOPIC_COLORS[topic.color.slug].soft : '#eee';
  });

  protected readonly topicIconSvg = computed<SafeHtml>(() => {
    const topic = this.topic();
    return this.sanitizer.bypassSecurityTrustHtml(topic ? ICON_PATHS[topic.icon] : '');
  });

  protected readonly topicIconColor = computed(() => {
    const topic = this.topic();
    return topic ? TOPIC_COLORS[topic.color.slug].ink : 'var(--ink)';
  });

  protected readonly topicBaseColor = computed(() => {
    const topic = this.topic();
    return topic ? TOPIC_COLORS[topic.color.slug].base : 'var(--ink)';
  });

  protected readonly fileVms = computed<FileVm[]>(() => {
    const topic = this.topic();
    if (!topic) return [];
    const ink = TOPIC_COLORS[topic.color.slug].ink;
    const soft = TOPIC_COLORS[topic.color.slug].soft;
    return this.files().map((file) => ({
      file,
      cardBg: file.type === 'doc' ? '#fff' : soft,
      cardShadow: file.type === 'doc' ? 'var(--shadow)' : 'none',
      ink,
      iconSvg: this.sanitizer.bypassSecurityTrustHtml(FILE_TYPE_ICON_PATHS[file.type]),
      kicker: FILE_TYPE_KICKER[file.type],
      isDoc: file.type === 'doc',
      isCards: file.type === 'cards',
      isSlides: file.type === 'slides',
      countLabel: this.countLabelFor(file),
    }));
  });

  /** Notas de documentos, agrupadas por documento (só os que têm notas), na ordem da listagem de docs. */
  protected readonly noteGroups = computed<NoteGroup[]>(() => {
    const notes = this.notes();
    return this.noteDocs()
      .map((doc) => ({ doc, notes: notes.filter((n) => n.documentId === doc.id) }))
      .filter((group) => group.notes.length > 0);
  });

  protected readonly looseNotes = computed(() => this.notes().filter((n) => n.documentId === null));

  constructor() {
    this.topicsStore.ensureLoaded();
    this.reload();
  }

  private countLabelFor(file: FileSummary): string | null {
    const count = file.metadata?.count ?? 0;
    if (file.type === 'cards') return `${count} carta(s)`;
    if (file.type === 'mindmap') return `${count} nó(s)`;
    if (file.type === 'slides') return `${count} slide(s)`;
    return null;
  }

  private async reload(): Promise<void> {
    const topicId = this.topicId();
    if (!Number.isFinite(topicId)) return;
    const tab = this.activeTab();
    if (tab === 'notes') {
      await this.loadNotesBoard(topicId);
      return;
    }
    const type = tab === 'all' ? undefined : tab;
    const files = await firstValueFrom(this.filesApi.listByTopic(topicId, type));
    this.files.set(files);
  }

  private async loadNotesBoard(topicId: number): Promise<void> {
    // Os documentos só servem para dar título aos grupos; as notas vêm todas numa chamada.
    const [notes, docs] = await Promise.all([
      firstValueFrom(this.notesApi.listByTopic(topicId)),
      firstValueFrom(this.filesApi.listByTopic(topicId, 'doc')),
    ]);
    this.noteDocs.set(docs);
    this.notes.set(notes);
  }

  async addLooseNote(): Promise<void> {
    await this.notesSync.create(this.topicId(), null);
    // Avulsas são a última seção do mural e a nota nova é a última da lista: é o último card renderizado.
    afterNextRender(
      () => {
        const cards = this.noteCards();
        cards[cards.length - 1]?.focus();
      },
      { injector: this.injector },
    );
  }

  openNoteDoc(doc: FileSummary): void {
    this.router.navigate(fileRouteCommands(this.topicId(), doc.id, 'doc') as any[]);
  }

  setTab(tab: TabId): void {
    this.activeTab.set(tab);
    this.addFileOpen.set(false);
    void this.reload();
  }

  openAddFile(): void {
    if (this.activeTab() !== 'all') {
      void this.addFileOfType(this.activeTab() as FileType);
      return;
    }
    this.addFileOpen.set(true);
  }

  closeAddFile(): void {
    this.addFileOpen.set(false);
  }

  async addFileOfType(type: FileType): Promise<void> {
    const topicId = this.topicId();
    const defaultName =
      type === 'doc' ? 'Sem título' : type === 'cards' ? 'Novo deck' : type === 'mindmap' ? 'Novo mapa' : 'Nova apresentação';
    const file = await firstValueFrom(this.filesApi.create(topicId, { name: defaultName, type }));
    this.addFileOpen.set(false);
    await this.topicsStore.refresh();
    this.router.navigate(fileRouteCommands(topicId, file.id, type) as any[]);
  }

  openFile(vm: FileVm): void {
    this.router.navigate(fileRouteCommands(this.topicId(), vm.file.id, vm.file.type) as any[]);
  }

  editFile(vm: FileVm, event: Event): void {
    event.stopPropagation();
    this.openFile(vm);
  }

  viewDoc(vm: FileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(fileRouteCommands(this.topicId(), vm.file.id, 'doc') as any[], {
      queryParams: { mode: 'preview' },
    });
  }

  reviewCards(vm: FileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/topics', this.topicId(), 'files', vm.file.id, 'cards', 'review'], {
      queryParams: { shuffle: 1 },
    });
  }

  presentSlides(vm: FileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/topics', this.topicId(), 'files', vm.file.id, 'slides'], {
      queryParams: { present: 1 },
    });
  }

  startDeleteFile(vm: FileVm, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.deletingFile.set(vm.file);
  }

  cancelDeleteFile(): void {
    this.deletingFile.set(null);
  }

  async confirmDeleteFile(): Promise<void> {
    const file = this.deletingFile();
    if (!file) return;
    await firstValueFrom(this.filesApi.delete(file.id));
    this.deletingFile.set(null);
    await this.topicsStore.refresh();
    await this.reload();
  }
}
