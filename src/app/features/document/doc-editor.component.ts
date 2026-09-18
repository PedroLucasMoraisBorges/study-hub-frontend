import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { firstValueFrom, map } from 'rxjs';
import { FilesService } from '../../shared/services/files.service';
import { DocumentBlocksService } from '../../shared/services/document-blocks.service';
import { TopicsStore } from '../../shared/services/topics-store.service';
import { TOPIC_COLORS } from '../../shared/constants/topic-colors.constant';
import { Autosaver } from '../../shared/utils/autosave.util';
import { RichMarker, wrapSelectionWithMarker } from '../../shared/utils/rich-text.util';
import { AutoresizeDirective } from '../../shared/directives/autoresize.directive';
import { ImageSlotComponent } from '../../shared/components/image-slot/image-slot.component';
import { RichTextPipe } from '../../shared/pipes/rich-text.pipe';
import { CodeHighlightPipe } from '../../shared/pipes/code-highlight.pipe';
import { DocumentBlock, DocumentBlockType } from '../../shared/models';

type ViewMode = 'edit' | 'preview';

const BLOCK_TYPE_LABELS: { type: DocumentBlockType; label: string }[] = [
  { type: 'h1', label: 'Título 1' },
  { type: 'h2', label: 'Título 2' },
  { type: 'h3', label: 'Título 3' },
  { type: 'paragraph', label: 'Parágrafo' },
  { type: 'bullet', label: 'Tópico' },
  { type: 'link', label: 'Link' },
  { type: 'image', label: 'Imagem' },
  { type: 'file', label: 'Anexo' },
  { type: 'code', label: 'Código' },
  { type: 'quote', label: 'Citação' },
  { type: 'hr', label: 'Linha horizontal' },
];

@Component({
  selector: 'app-doc-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, AutoresizeDirective, ImageSlotComponent, RichTextPipe, CodeHighlightPipe],
  templateUrl: './doc-editor.component.html',
  styleUrl: './doc-editor.component.css',
})
export class DocEditorComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filesApi = inject(FilesService);
  private readonly blocksApi = inject(DocumentBlocksService);
  private readonly topicsStore = inject(TopicsStore);

  protected readonly blockTypes = BLOCK_TYPE_LABELS;

  private readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });
  private readonly fileId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('fileId')))), {
    initialValue: NaN,
  });

  protected readonly topic = computed(() => this.topicsStore.getById(this.topicId()));
  protected readonly topicSoft = computed(() => {
    const t = this.topic();
    return t ? TOPIC_COLORS[t.color.slug].soft : '#eee';
  });

  protected readonly fileName = signal('');
  protected readonly fileDescription = signal('');
  protected readonly blocks = signal<DocumentBlock[]>([]);
  protected readonly loaded = signal(false);

  protected readonly viewMode = signal<ViewMode>(
    this.route.snapshot.queryParamMap.get('mode') === 'preview' ? 'preview' : 'edit',
  );

  protected readonly hoveredBlockId = signal<number | null>(null);
  protected readonly insertAfterId = signal<number | null>(null);
  protected readonly endMenuOpen = signal(false);

  private readonly autosaver = new Autosaver();
  protected readonly saveStatus = this.autosaver.status;
  private fileDirty = false;
  private readonly blockPatches = new Map<number, Partial<DocumentBlock>>();

  protected readonly blockVms = computed(() =>
    this.blocks().map((b) => ({
      block: b,
      isH1: b.type === 'h1',
      isH2: b.type === 'h2',
      isH3: b.type === 'h3',
      isParagraph: b.type === 'paragraph',
      isBullet: b.type === 'bullet',
      isLink: b.type === 'link',
      isImage: b.type === 'image',
      isFile: b.type === 'file',
      isHr: b.type === 'hr',
      isCode: b.type === 'code',
      isQuote: b.type === 'quote',
    })),
  );

  constructor() {
    this.topicsStore.ensureLoaded();
    void this.load();
  }

  private async load(): Promise<void> {
    const detail = await firstValueFrom(this.filesApi.getDetail(this.fileId()));
    this.fileName.set(detail.file.name);
    this.fileDescription.set(detail.file.description ?? '');
    this.blocks.set(detail.blocks ?? []);
    this.loaded.set(true);
  }

  backToTopic(): void {
    this.router.navigate(['/topics', this.topicId()]);
  }

  toggleViewMode(): void {
    this.viewMode.update((m) => (m === 'edit' ? 'preview' : 'edit'));
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
    const tasks: Promise<unknown>[] = [];
    if (this.fileDirty) {
      this.fileDirty = false;
      tasks.push(
        firstValueFrom(
          this.filesApi.update(this.fileId(), { name: this.fileName(), description: this.fileDescription() }),
        ),
      );
    }
    for (const [blockId, patch] of this.blockPatches) {
      tasks.push(firstValueFrom(this.blocksApi.update(this.fileId(), blockId, patch)));
    }
    this.blockPatches.clear();
    await Promise.all(tasks);
  }

  private patchBlockLocal(blockId: number, patch: Partial<DocumentBlock>): void {
    this.blocks.update((list) => list.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  }

  onBlockTextChange(block: DocumentBlock, value: string): void {
    this.patchBlockLocal(block.id, { contentText: value });
    this.blockPatches.set(block.id, { ...this.blockPatches.get(block.id), contentText: value });
    this.autosaver.schedule(() => this.flush());
  }

  onBlockUrlChange(block: DocumentBlock, value: string): void {
    this.patchBlockLocal(block.id, { linkUrl: value });
    this.blockPatches.set(block.id, { ...this.blockPatches.get(block.id), linkUrl: value });
    this.autosaver.schedule(() => this.flush());
  }

  onBlockLanguageChange(block: DocumentBlock, value: string): void {
    this.patchBlockLocal(block.id, { language: value });
    this.blockPatches.set(block.id, { ...this.blockPatches.get(block.id), language: value });
    this.autosaver.schedule(() => this.flush());
  }

  onCodeKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const el = event.target as HTMLTextAreaElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = el.value.slice(0, start) + '  ' + el.value.slice(end);
    // Atribui direto ao DOM e dispara `input`: o AutoresizeDirective só recalcula a altura nesse evento
    // e o handler (input) já propaga o valor para onBlockTextChange.
    el.value = next;
    el.selectionStart = el.selectionEnd = start + 2;
    el.dispatchEvent(new Event('input'));
  }

  async onImageChange(block: DocumentBlock, dataUrl: string | null): Promise<void> {
    this.patchBlockLocal(block.id, { imageFile: dataUrl });
    await firstValueFrom(this.blocksApi.update(this.fileId(), block.id, { imageFile: dataUrl }));
  }

  async onFilePick(block: DocumentBlock, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    this.patchBlockLocal(block.id, { documentFile: dataUrl, documentFileName: file.name });
    await firstValueFrom(
      this.blocksApi.update(this.fileId(), block.id, { documentFile: dataUrl, documentFileName: file.name }),
    );
    input.value = '';
  }

  wrapSelection(block: DocumentBlock, marker: RichMarker, textarea: HTMLTextAreaElement): void {
    const result = wrapSelectionWithMarker(textarea, marker);
    this.onBlockTextChange(block, result.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  onBlockEnter(block: DocumentBlock): void {
    this.hoveredBlockId.set(block.id);
  }

  onBlockLeave(): void {
    this.hoveredBlockId.set(null);
  }

  controlsOpacity(block: DocumentBlock): number {
    return this.hoveredBlockId() === block.id ? 1 : 0.12;
  }

  showMenuHere(block: DocumentBlock): boolean {
    return this.insertAfterId() === block.id;
  }

  openBlockMenu(afterId: number): void {
    this.insertAfterId.set(afterId);
    this.endMenuOpen.set(false);
  }

  openEndMenu(): void {
    this.endMenuOpen.set(true);
    this.insertAfterId.set(null);
  }

  closeBlockMenu(): void {
    this.insertAfterId.set(null);
    this.endMenuOpen.set(false);
  }

  async insertBlock(type: DocumentBlockType): Promise<void> {
    const afterId = this.insertAfterId();
    await firstValueFrom(this.blocksApi.create(this.fileId(), { type, afterId }));
    this.closeBlockMenu();
    await this.reloadBlocks();
  }

  private async reloadBlocks(): Promise<void> {
    this.blocks.set(await firstValueFrom(this.blocksApi.list(this.fileId())));
  }

  async moveBlockUp(block: DocumentBlock): Promise<void> {
    const list = this.blocks();
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx <= 0) return;
    const next = [...list];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    this.blocks.set(next);
    await firstValueFrom(this.blocksApi.moveUp(this.fileId(), block.id));
  }

  async moveBlockDown(block: DocumentBlock): Promise<void> {
    const list = this.blocks();
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx === -1 || idx >= list.length - 1) return;
    const next = [...list];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    this.blocks.set(next);
    await firstValueFrom(this.blocksApi.moveDown(this.fileId(), block.id));
  }

  async deleteBlock(block: DocumentBlock): Promise<void> {
    this.blocks.update((list) => list.filter((b) => b.id !== block.id));
    this.blockPatches.delete(block.id);
    await firstValueFrom(this.blocksApi.delete(this.fileId(), block.id));
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
