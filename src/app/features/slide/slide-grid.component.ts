import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { FilesService } from '../../shared/services/files.service';
import { SlidesService } from '../../shared/services/slides.service';
import { Autosaver } from '../../shared/utils/autosave.util';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { HorizontalAlign, Slide, SlideColumn, SlideLayout, SlideRequest, VerticalAlign } from '../../shared/models';

/**
 * Alinhamento "visual" de uma coluna no draft de edição. A API (SlideColumn.align) só aceita
 * left|center|right — não existe "justify" no backend. Guardamos o alinhamento visual aqui
 * (incluindo justify, só para aplicar text-align no textarea) e, ao montar o SlideRequest,
 * "justify" é rebaixado para "left" (o mais próximo semanticamente).
 */
type ColumnVisualAlign = HorizontalAlign | 'justify';

interface SlideColumnDraft {
  /** Id local, só para tracking de UI durante a edição — nunca é enviado à API (o PUT substitui as columns inteiras, sem precisar de id). */
  localId: string;
  text: string;
  /** Valor que efetivamente vai para a API (left|center|right). */
  align: HorizontalAlign;
  /** Valor aplicado ao text-align do textarea — pode ser "justify" (ver ColumnVisualAlign). */
  visualAlign: ColumnVisualAlign;
  image: string | null;
  /**
   * 'normal' (84px) | 'fill' (150px). A API não tem esse campo (SlideColumn não guarda imageMode) —
   * fica só no draft local; ao reabrir um slide salvo, sempre volta para 'normal'.
   */
  imageMode: 'normal' | 'fill';
}

interface SlidesConverting {
  name: string;
  progress: number;
}

const V_ALIGN_TO_FLEX: Record<VerticalAlign, string> = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const H_ALIGN_TO_FLEX: Record<HorizontalAlign, string> = { left: 'flex-start', center: 'center', right: 'flex-end' };

@Component({
  selector: 'app-slide-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  templateUrl: './slide-grid.component.html',
  styleUrl: './slide-grid.component.css',
})
export class SlideGridComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filesApi = inject(FilesService);
  private readonly slidesApi = inject(SlidesService);

  protected readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });
  protected readonly fileId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('fileId')))), {
    initialValue: NaN,
  });

  protected readonly fileName = signal('');
  protected readonly fileDescription = signal('');
  protected readonly slides = signal<Slide[]>([]);
  protected readonly loaded = signal(false);

  private readonly autosaver = new Autosaver();

  // ---- Modal de formulário de slide (criar/editar) ----
  protected readonly slideFormOpen = signal(false);
  protected readonly editingSlideId = signal<number | null>(null);
  protected readonly slideTitleDraft = signal('');
  protected readonly slideLayoutDraft = signal<SlideLayout>('single');
  protected readonly slideColumnsDraft = signal<SlideColumnDraft[]>([]);
  protected readonly slideTitleAlignH = signal<HorizontalAlign>('center');
  protected readonly slideTitleAlignV = signal<VerticalAlign>('center');
  protected readonly slideBgDraft = signal<string | null>(null);

  protected readonly hasColumnContent = computed(() =>
    this.slideColumnsDraft().some((c) => (c.text && c.text.trim().length > 0) || c.image),
  );
  protected readonly showTitleVAlign = computed(() => !this.hasColumnContent());

  protected readonly canvasBackground = computed(() => {
    const bg = this.slideBgDraft();
    return bg ? `url('${bg}') center/cover no-repeat` : 'var(--ink)';
  });

  protected readonly titlePreviewBoxStyle = computed(() => {
    const hasContent = this.hasColumnContent();
    if (hasContent) {
      return 'flex:0 0 auto;min-height:52px;display:flex;align-items:center;padding:18px 26px 6px';
    }
    const vAlign = V_ALIGN_TO_FLEX[this.slideTitleAlignV()];
    return `flex:1;display:flex;align-items:${vAlign};padding:26px`;
  });

  protected readonly titleInputStyle = computed(() => {
    const hasContent = this.hasColumnContent();
    const hAlign = this.slideTitleAlignH();
    return `width:100%;border:none;background:none;outline:none;color:#fff;font-weight:800;font-size:${hasContent ? '21px' : '27px'};text-align:${hAlign};font-family:'Archivo';word-break:break-word`;
  });

  // ---- Modal excluir slide ----
  protected readonly deletingSlide = signal<Slide | null>(null);

  // ---- Apresentação ----
  protected readonly presenting = signal(false);
  protected readonly presentIndex = signal(0);
  protected readonly presentSlide = computed<Slide | null>(() => this.slides()[this.presentIndex()] ?? null);

  // ---- Upload / conversão pptx/pdf ----
  protected readonly slidesConverting = signal<SlidesConverting | null>(null);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const detail = await firstValueFrom(this.filesApi.getDetail(this.fileId()));
    this.fileName.set(detail.file.name);
    this.fileDescription.set(detail.file.description ?? '');
    this.slides.set(detail.slides ?? []);
    this.loaded.set(true);
    if (this.route.snapshot.queryParamMap.get('present') === '1' && this.slides().length > 0) {
      this.startPresent();
    }
  }

  private async reloadSlides(): Promise<void> {
    this.slides.set(await firstValueFrom(this.slidesApi.list(this.fileId())));
  }

  backToTopic(): void {
    this.router.navigate(['/topics', this.topicId()]);
  }

  // ---- Nome / descrição (autosave, sem indicador visual — fiel ao protótipo) ----

  onTitleChange(value: string): void {
    this.fileName.set(value);
    this.autosaver.schedule(() => this.flushFile());
  }

  onDescriptionChange(value: string): void {
    this.fileDescription.set(value);
    this.autosaver.schedule(() => this.flushFile());
  }

  private async flushFile(): Promise<void> {
    await firstValueFrom(
      this.filesApi.update(this.fileId(), { name: this.fileName(), description: this.fileDescription() }),
    );
  }

  // ---- Grade de slides ----

  slideCardStyle(slide: Slide): string {
    const base =
      'border-radius:10px;aspect-ratio:4/3;box-shadow:var(--shadow);display:flex;align-items:center;justify-content:center;padding:10px;position:relative;cursor:pointer';
    return slide.bgImage
      ? `background-image:linear-gradient(rgba(36,31,28,.45),rgba(36,31,28,.45)), url('${slide.bgImage}');background-size:cover;background-position:center;${base}`
      : `background:var(--rose-soft);${base}`;
  }

  slideTitleColor(slide: Slide): string {
    return slide.bgImage ? '#fff' : 'var(--rose-ink)';
  }

  startDeleteSlide(slide: Slide, event: Event): void {
    event.stopPropagation();
    this.deletingSlide.set(slide);
  }

  cancelDeleteSlide(): void {
    this.deletingSlide.set(null);
  }

  async confirmDeleteSlide(): Promise<void> {
    const slide = this.deletingSlide();
    if (!slide) return;
    await firstValueFrom(this.slidesApi.delete(this.fileId(), slide.id));
    this.deletingSlide.set(null);
    await this.reloadSlides();
  }

  // ---- Form de slide ----

  private newColId(): string {
    return 'col' + Date.now() + Math.random().toString(36).slice(2, 6);
  }

  private emptyColumnDraft(): SlideColumnDraft {
    return { localId: this.newColId(), text: '', align: 'left', visualAlign: 'left', image: null, imageMode: 'normal' };
  }

  private toColumnDraft(col: SlideColumn): SlideColumnDraft {
    return {
      localId: this.newColId(),
      text: col.text,
      align: col.align,
      visualAlign: col.align,
      image: col.image,
      imageMode: 'normal',
    };
  }

  private columnsForLayout(layout: SlideLayout, existing: SlideColumnDraft[]): SlideColumnDraft[] {
    const count = layout === 'three' ? 3 : layout === 'two' ? 2 : 1;
    const cols = [...existing];
    while (cols.length < count) cols.push(this.emptyColumnDraft());
    return cols.slice(0, count);
  }

  openNewSlideForm(): void {
    this.slideFormOpen.set(true);
    this.editingSlideId.set(null);
    this.slideTitleDraft.set('');
    this.slideLayoutDraft.set('single');
    this.slideColumnsDraft.set([this.emptyColumnDraft()]);
    this.slideTitleAlignH.set('center');
    this.slideTitleAlignV.set('center');
    this.slideBgDraft.set(null);
  }

  openEditSlideForm(slide: Slide): void {
    this.slideFormOpen.set(true);
    this.editingSlideId.set(slide.id);
    this.slideTitleDraft.set(slide.title);
    const layout = slide.layout || 'single';
    this.slideLayoutDraft.set(layout);
    const columns = slide.columns.length ? slide.columns.map((c) => this.toColumnDraft(c)) : [this.emptyColumnDraft()];
    this.slideColumnsDraft.set(this.columnsForLayout(layout, columns));
    this.slideTitleAlignH.set(slide.titleAlignH || 'center');
    this.slideTitleAlignV.set(slide.titleAlignV || 'center');
    this.slideBgDraft.set(slide.bgImage || null);
  }

  closeSlideForm(): void {
    this.slideFormOpen.set(false);
  }

  onSlideTitleChange(value: string): void {
    this.slideTitleDraft.set(value);
  }

  pickSlideLayout(layout: SlideLayout): void {
    this.slideLayoutDraft.set(layout);
    this.slideColumnsDraft.update((cols) => this.columnsForLayout(layout, cols));
  }

  onColumnTextChange(localId: string, value: string): void {
    this.slideColumnsDraft.update((cols) => cols.map((c) => (c.localId === localId ? { ...c, text: value } : c)));
  }

  pickColumnAlign(localId: string, align: ColumnVisualAlign): void {
    this.slideColumnsDraft.update((cols) =>
      cols.map((c) =>
        c.localId === localId ? { ...c, visualAlign: align, align: align === 'justify' ? 'left' : align } : c,
      ),
    );
  }

  pickTitleAlignH(v: HorizontalAlign): void {
    this.slideTitleAlignH.set(v);
  }

  pickTitleAlignV(v: VerticalAlign): void {
    this.slideTitleAlignV.set(v);
  }

  columnTextStyle(col: SlideColumnDraft): string {
    const textAlign = col.visualAlign === 'justify' ? 'justify' : col.visualAlign;
    return `width:100%;min-height:70px;field-sizing:content;padding:22px 4px 4px;border:none;background:none;color:#fff;font:14px 'Archivo';resize:none;outline:none;text-align:${textAlign}`;
  }

  columnImageBoxStyle(col: SlideColumnDraft): string {
    const isFill = col.imageMode === 'fill';
    return `width:100%;height:${isFill ? '150px' : '84px'};border-radius:8px;background-image:${col.image ? `url('${col.image}')` : 'none'};background-size:cover;background-position:center`;
  }

  async onColumnImagePick(localId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    this.slideColumnsDraft.update((cols) => cols.map((c) => (c.localId === localId ? { ...c, image: dataUrl } : c)));
    input.value = '';
  }

  removeColumnImage(localId: string): void {
    this.slideColumnsDraft.update((cols) => cols.map((c) => (c.localId === localId ? { ...c, image: null } : c)));
  }

  toggleColumnImageMode(localId: string): void {
    this.slideColumnsDraft.update((cols) =>
      cols.map((c) => (c.localId === localId ? { ...c, imageMode: c.imageMode === 'fill' ? 'normal' : 'fill' } : c)),
    );
  }

  async onSlideBgPick(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const dataUrl = await readAsDataUrl(file);
    this.slideBgDraft.set(dataUrl);
    input.value = '';
  }

  removeSlideBg(): void {
    this.slideBgDraft.set(null);
  }

  async saveSlide(): Promise<void> {
    const title = this.slideTitleDraft().trim();
    if (!title) {
      this.slideFormOpen.set(false);
      return;
    }
    const body: SlideRequest = {
      title,
      layout: this.slideLayoutDraft(),
      titleAlignH: this.slideTitleAlignH(),
      titleAlignV: this.slideTitleAlignV(),
      bgImage: this.slideBgDraft(),
      columns: this.slideColumnsDraft().map((c) => ({ text: c.text, align: c.align, image: c.image })),
    };
    const editingId = this.editingSlideId();
    if (editingId === null) {
      await firstValueFrom(this.slidesApi.create(this.fileId(), body));
    } else {
      await firstValueFrom(this.slidesApi.update(this.fileId(), editingId, body));
    }
    this.slideFormOpen.set(false);
    await this.reloadSlides();
  }

  // ---- Apresentação ----

  startPresent(): void {
    this.presenting.set(true);
    this.presentIndex.set(0);
  }

  exitPresent(): void {
    this.presenting.set(false);
  }

  nextPresentSlide(): void {
    this.presentIndex.update((i) => Math.min(i + 1, this.slides().length - 1));
  }

  prevPresentSlide(): void {
    this.presentIndex.update((i) => Math.max(i - 1, 0));
  }

  presentHasContent(slide: Slide): boolean {
    return slide.columns.some((c) => (c.text && c.text.trim().length > 0) || c.image);
  }

  presentColumnAlign(col: SlideColumn): HorizontalAlign {
    return col.align || 'left';
  }

  presentColumnImageStyle(col: SlideColumn): string {
    // imageMode (normal/fill) não é persistido pela API (SlideColumn não tem esse campo) — a
    // apresentação sempre usa a altura padrão (180px) para imagens de coluna.
    return `width:100%;height:180px;border-radius:10px;background-image:${col.image ? `url('${col.image}')` : 'none'};background-size:cover;background-position:center`;
  }

  presentTitleBoxStyle(slide: Slide): string {
    const hasContent = this.presentHasContent(slide);
    const hAlignFlex = H_ALIGN_TO_FLEX[slide.titleAlignH || 'center'];
    const textAlign = slide.titleAlignH || 'center';
    if (hasContent) {
      return `flex:0 0 auto;min-height:120px;display:flex;align-items:center;justify-content:${hAlignFlex};padding:36px 60px 12px;font-weight:800;font-size:40px;text-align:${textAlign}`;
    }
    const vAlignFlex = V_ALIGN_TO_FLEX[slide.titleAlignV || 'center'];
    return `flex:1;display:flex;align-items:${vAlignFlex};justify-content:${hAlignFlex};padding:60px;font-weight:800;font-size:40px;text-align:${textAlign}`;
  }

  // ---- Upload / conversão de arquivo (pptx/pdf → slides, fallback mock) ----

  async onSlidesUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const name = file.name;
    const ext = (name.split('.').pop() || '').toLowerCase();
    this.slidesConverting.set({ name, progress: 5 });

    const runMock = async () => {
      this.bumpConverting(100);
      await this.finishSlidesUpload(name, this.mockSlideSet());
    };

    if (ext !== 'pdf' && ext !== 'pptx') {
      await runMock();
      input.value = '';
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.bumpConverting(15);
      const extracted =
        ext === 'pdf' ? await this.extractPdfSlides(arrayBuffer) : await this.extractPptxSlides(arrayBuffer);
      this.bumpConverting(100);
      await this.finishSlidesUpload(name, extracted.length ? extracted : this.mockSlideSet());
    } catch {
      await runMock();
    }
    input.value = '';
  }

  private bumpConverting(pct: number): void {
    this.slidesConverting.update((c) => (c ? { ...c, progress: pct } : null));
  }

  private emptySlidePayload(title: string, body = ''): SlideRequest {
    return {
      title,
      layout: 'single',
      titleAlignH: 'center',
      titleAlignV: 'center',
      bgImage: null,
      columns: [{ text: body, align: 'left', image: null }],
    };
  }

  private mockSlideSet(): SlideRequest[] {
    const count = 4 + Math.floor(Math.random() * 3);
    return Array.from({ length: count }, (_, i) => this.emptySlidePayload(`Slide ${i + 1}`));
  }

  private textToSlide(index: number, lines: string[]): SlideRequest {
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    const title = (nonEmpty[0] || `Slide ${index + 1}`).slice(0, 90);
    const body = nonEmpty.slice(1).join('\n');
    return this.emptySlidePayload(title, body);
  }

  private async extractPdfSlides(arrayBuffer: ArrayBuffer): Promise<SlideRequest[]> {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
    }
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const slides: SlideRequest[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      this.bumpConverting(15 + Math.round((i / pdf.numPages) * 75));
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const lines: string[] = [];
      let currentLine = '';
      let lastY: number | null = null;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5] as number;
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(currentLine);
          currentLine = '';
        }
        currentLine += item.str + ' ';
        lastY = y;
      }
      if (currentLine.trim()) lines.push(currentLine);
      slides.push(this.textToSlide(i - 1, lines));
    }
    return slides;
  }

  private async extractPptxSlides(arrayBuffer: ArrayBuffer): Promise<SlideRequest[]> {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/)?.[1] ?? 0);
        const nb = Number(b.match(/slide(\d+)\.xml/)?.[1] ?? 0);
        return na - nb;
      });
    const slides: SlideRequest[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      this.bumpConverting(15 + Math.round(((i + 1) / slideFiles.length) * 75));
      const xml = await zip.files[slideFiles[i]].async('text');
      const lines = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
      slides.push(this.textToSlide(i, lines));
    }
    return slides;
  }

  private async finishSlidesUpload(name: string, slidePayloads: SlideRequest[]): Promise<void> {
    await delay(300);
    for (const payload of slidePayloads) {
      await firstValueFrom(this.slidesApi.create(this.fileId(), payload));
    }
    const title = name.replace(/\.(pptx|pdf|key)$/i, '') || 'Apresentação importada';
    await firstValueFrom(this.filesApi.update(this.fileId(), { name: title, description: this.fileDescription() }));
    this.fileName.set(title);
    await this.reloadSlides();
    this.slidesConverting.set(null);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
