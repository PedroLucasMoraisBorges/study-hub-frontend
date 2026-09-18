import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { FilesService } from '../../shared/services/files.service';
import { MindmapService } from '../../shared/services/mindmap.service';
import { ColorsService } from '../../shared/services/colors.service';
import { TopicsStore } from '../../shared/services/topics-store.service';
import { UiShellService } from '../../shared/services/ui-shell.service';
import { Autosaver } from '../../shared/utils/autosave.util';
import { AutoresizeDirective } from '../../shared/directives/autoresize.directive';
import { ColorSwatchRowComponent } from '../../shared/components/color-swatch-row/color-swatch-row.component';
import { TOPIC_COLORS } from '../../shared/constants/topic-colors.constant';
import {
  BorderStyle,
  Color,
  ColorSlug,
  MindMapNode,
  NodeFontSize,
  NodeShape,
  UpdateMindMapNodeRequest,
} from '../../shared/models';

interface NodeVm {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  bg: string;
  color: string;
  radius: string;
  clip: string;
  border: string;
  shadow: string;
  outline: string;
  fontSize: number;
  deleteDisplay: 'none' | 'flex';
}

interface LineVm {
  d: string;
}

const SHAPE_OPTIONS: { key: NodeShape; label: string }[] = [
  { key: 'diamond', label: 'Losango' },
  { key: 'rectangle', label: 'Retângulo' },
  { key: 'circle', label: 'Círculo' },
  { key: 'square', label: 'Quadrado' },
];

const BORDER_STYLE_OPTIONS: { key: BorderStyle; label: string }[] = [
  { key: 'none', label: 'Nenhuma' },
  { key: 'solid', label: 'Sólida' },
  { key: 'dashed', label: 'Tracejada' },
  { key: 'dotted', label: 'Pontilhada' },
];

const FONT_SIZE_OPTIONS: { key: NodeFontSize; label: string }[] = [
  { key: 'small', label: 'P' },
  { key: 'medium', label: 'M' },
  { key: 'large', label: 'G' },
];

const FONT_SIZE_PX: Record<NodeFontSize, number> = { small: 13, medium: 16, large: 20 };

function shapeVisual(shape: NodeShape): { radius: string; clip: string } {
  if (shape === 'circle') return { radius: '50%', clip: 'none' };
  if (shape === 'square') return { radius: '6px', clip: 'none' };
  if (shape === 'diamond') return { radius: '0', clip: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
  return { radius: '12px', clip: 'none' };
}

@Component({
  selector: 'app-mindmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoresizeDirective, ColorSwatchRowComponent],
  templateUrl: './mindmap.component.html',
  styleUrl: './mindmap.component.css',
})
export class MindmapComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly filesApi = inject(FilesService);
  private readonly mindmapApi = inject(MindmapService);
  private readonly colorsApi = inject(ColorsService);
  private readonly topicsStore = inject(TopicsStore);
  private readonly uiShell = inject(UiShellService);

  protected readonly shapeOptions = SHAPE_OPTIONS;
  protected readonly borderStyleOptions = BORDER_STYLE_OPTIONS;
  protected readonly fontSizeOptions = FONT_SIZE_OPTIONS;

  private readonly canvasRef = viewChild<ElementRef<HTMLDivElement>>('canvas');

  protected readonly topicId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('topicId')))), {
    initialValue: NaN,
  });
  protected readonly fileId = toSignal(this.route.paramMap.pipe(map((p) => Number(p.get('fileId')))), {
    initialValue: NaN,
  });

  protected readonly topic = computed(() => this.topicsStore.getById(this.topicId()));

  protected readonly loaded = signal(false);
  protected readonly fileName = signal('');
  protected readonly fileDescription = signal('');
  protected readonly nodes = signal<MindMapNode[]>([]);
  protected readonly colors = signal<Color[]>([]);

  protected readonly selectedNodeId = signal<number | null>(null);
  protected readonly selectedNode = computed(
    () => this.nodes().find((n) => n.id === this.selectedNodeId()) ?? null,
  );

  protected readonly pan = signal({ x: 0, y: 0 });
  protected readonly zoom = signal(1);
  protected readonly zoomLabel = computed(() => `${Math.round(this.zoom() * 100)}%`);
  protected readonly panning = signal(false);

  private panStart: { x: number; y: number; origX: number; origY: number } | null = null;
  private draggingId: number | null = null;
  private dragOffset = { x: 0, y: 0 };

  private readonly fileAutosaver = new Autosaver();
  private fileDirty = false;

  private readonly nodeAutosaver = new Autosaver();
  private pendingNodePatch: UpdateMindMapNodeRequest = {};
  private pendingNodeId: number | null = null;

  protected readonly nodeVms = computed<NodeVm[]>(() => {
    const list = this.nodes();
    const rootId = list[0]?.id;
    const selectedId = this.selectedNodeId();
    return list.map((n) => {
      const isRoot = n.parentId === null;
      const visual = shapeVisual(n.shape);
      const custom = n.color;
      const borderColorBase = n.borderColor ? TOPIC_COLORS[n.borderColor.slug as ColorSlug].base : 'var(--ink)';
      return {
        id: n.id,
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
        label: n.label,
        bg: custom ? TOPIC_COLORS[custom.slug as ColorSlug].base : isRoot ? 'var(--accent)' : '#fff',
        color: custom ? '#fff' : isRoot ? '#fff' : 'var(--ink)',
        radius: visual.radius,
        clip: visual.clip,
        border: n.borderStyle === 'none' ? 'none' : `2px ${n.borderStyle} ${borderColorBase}`,
        shadow: isRoot ? 'var(--shadow-lg)' : 'var(--shadow)',
        outline: selectedId === n.id ? '2px solid var(--accent)' : 'none',
        fontSize: FONT_SIZE_PX[n.fontSize],
        deleteDisplay: n.id === rootId ? 'none' : 'flex',
      };
    });
  });

  protected readonly mmLines = computed<LineVm[]>(() => {
    const list = this.nodes();
    const byId = new Map(list.map((n) => [n.id, n]));
    return list
      .filter((n) => n.parentId !== null && byId.has(n.parentId))
      .map((n) => {
        const p = byId.get(n.parentId as number)!;
        const x1 = p.x + p.w / 2;
        const y1 = p.y + p.h / 2;
        const x2 = n.x + n.w / 2;
        const y2 = n.y + n.h / 2;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - 30;
        return { d: `M${x1},${y1} Q${midX},${midY} ${x2},${y2}` };
      });
  });

  private readonly onWindowMouseMove = (e: MouseEvent): void => {
    if (this.panning() && this.panStart) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.pan.set({ x: this.panStart.origX + dx, y: this.panStart.origY + dy });
      return;
    }
    if (this.draggingId === null) return;
    const canvasEl = this.canvasRef()?.nativeElement;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const z = this.zoom();
    const p = this.pan();
    const worldX = (e.clientX - rect.left - p.x) / z;
    const worldY = (e.clientY - rect.top - p.y) / z;
    const nodeId = this.draggingId;
    const offset = this.dragOffset;
    this.nodes.update((list) =>
      list.map((n) => (n.id === nodeId ? { ...n, x: worldX - offset.x, y: worldY - offset.y } : n)),
    );
  };

  private readonly onWindowMouseUp = (): void => {
    if (this.draggingId !== null) {
      const nodeId = this.draggingId;
      const node = this.nodes().find((n) => n.id === nodeId);
      this.draggingId = null;
      if (node) {
        void firstValueFrom(this.mindmapApi.update(this.fileId(), nodeId, { x: node.x, y: node.y }));
      }
    }
    this.panning.set(false);
    this.panStart = null;
  };

  private readonly onCanvasWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const canvasEl = this.canvasRef()?.nativeElement;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = this.zoom();
    const newZoom = Math.max(0.4, Math.min(2, +(oldZoom + (e.deltaY > 0 ? -0.1 : 0.1)).toFixed(2)));
    const p = this.pan();
    const worldX = (mx - p.x) / oldZoom;
    const worldY = (my - p.y) / oldZoom;
    this.zoom.set(newZoom);
    this.pan.set({ x: mx - worldX * newZoom, y: my - worldY * newZoom });
  };

  constructor() {
    this.topicsStore.ensureLoaded();
    void this.load();
    void firstValueFrom(this.colorsApi.list()).then((colors) => this.colors.set(colors));

    // O canvas só existe no DOM depois que `loaded()` vira true (dado assíncrono), então o
    // listener de wheel (precisa ser non-passive pra poder chamar preventDefault e evitar o
    // scroll da página) é anexado reativamente via effect() assim que o elemento aparecer,
    // em vez de ngAfterViewInit (que rodaria cedo demais, antes do @if renderizar o canvas).
    effect((onCleanup) => {
      const el = this.canvasRef()?.nativeElement;
      if (!el) return;
      el.addEventListener('wheel', this.onCanvasWheel, { passive: false });
      onCleanup(() => el.removeEventListener('wheel', this.onCanvasWheel));
    });
  }

  ngOnInit(): void {
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  ngOnDestroy(): void {
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
    this.fileAutosaver.destroy();
    this.nodeAutosaver.destroy();
    this.uiShell.setMindmapFullscreen(false);
  }

  private async load(): Promise<void> {
    const detail = await firstValueFrom(this.filesApi.getDetail(this.fileId()));
    this.fileName.set(detail.file.name);
    this.fileDescription.set(detail.file.description ?? '');
    this.nodes.set(detail.nodes ?? []);
    this.loaded.set(true);
  }

  private async reloadNodes(): Promise<void> {
    this.nodes.set(await firstValueFrom(this.mindmapApi.list(this.fileId())));
  }

  backToTopic(): void {
    this.router.navigate(['/topics', this.topicId()]);
  }

  toggleMindmapFullscreen(): void {
    this.uiShell.toggleMindmapFullscreen();
  }

  onTitleChange(value: string): void {
    this.fileName.set(value);
    this.fileDirty = true;
    this.fileAutosaver.schedule(() => this.flushFile());
  }

  onDescriptionChange(value: string): void {
    this.fileDescription.set(value);
    this.fileDirty = true;
    this.fileAutosaver.schedule(() => this.flushFile());
  }

  private async flushFile(): Promise<void> {
    if (!this.fileDirty) return;
    this.fileDirty = false;
    await firstValueFrom(
      this.filesApi.update(this.fileId(), { name: this.fileName(), description: this.fileDescription() }),
    );
  }

  // ---- Pan / zoom ----

  startPan(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    this.panStart = { x: event.clientX, y: event.clientY, origX: this.pan().x, origY: this.pan().y };
    this.panning.set(true);
    this.selectedNodeId.set(null);
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(2, +(z + 0.1).toFixed(2)));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(0.4, +(z - 0.1).toFixed(2)));
  }

  zoomReset(): void {
    this.zoom.set(1);
  }

  // ---- Drag de nó ----

  startDrag(nodeId: number, event: MouseEvent): void {
    event.stopPropagation();
    const node = this.nodes().find((n) => n.id === nodeId);
    const canvasEl = this.canvasRef()?.nativeElement;
    if (!node || !canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const z = this.zoom();
    const p = this.pan();
    const worldX = (event.clientX - rect.left - p.x) / z;
    const worldY = (event.clientY - rect.top - p.y) / z;
    this.draggingId = nodeId;
    this.dragOffset = { x: worldX - node.x, y: worldY - node.y };
    this.selectedNodeId.set(nodeId);
  }

  // ---- Adicionar / excluir nó ----

  addChildNode(): void {
    void this.insertChildNode(this.selectedNodeId());
  }

  addChildFrom(nodeId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.insertChildNode(nodeId);
  }

  private async insertChildNode(parentId: number | null): Promise<void> {
    const list = this.nodes();
    const root = list[0] ?? null;
    let effectiveParentId = parentId;
    if (effectiveParentId === null || !list.some((n) => n.id === effectiveParentId)) {
      effectiveParentId = root ? root.id : null;
    }
    const parent = list.find((n) => n.id === effectiveParentId) ?? null;
    const siblingCount = list.filter((n) => n.parentId === effectiveParentId).length;
    const x = parent ? parent.x + 180 : 300;
    const y = parent
      ? parent.y + (siblingCount % 2 === 0 ? 90 : -90) * (Math.floor(siblingCount / 2) + 1)
      : 260;
    const created = await firstValueFrom(
      this.mindmapApi.create(this.fileId(), {
        parentId: effectiveParentId,
        label: 'Novo nó',
        x,
        y,
        w: 120,
        h: 58,
      }),
    );
    await this.reloadNodes();
    this.selectedNodeId.set(created.id);
  }

  deleteNodeDirect(nodeId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    void this.deleteNode(nodeId);
  }

  deleteSelectedNode(): void {
    const id = this.selectedNodeId();
    if (id === null) return;
    void this.deleteNode(id);
  }

  private async deleteNode(nodeId: number): Promise<void> {
    const root = this.nodes()[0];
    if (!root || nodeId === root.id) return;
    await firstValueFrom(this.mindmapApi.delete(this.fileId(), nodeId));
    await this.reloadNodes();
    const selected = this.selectedNodeId();
    if (selected !== null && !this.nodes().some((n) => n.id === selected)) {
      this.selectedNodeId.set(null);
    }
  }

  clearSelectedNode(): void {
    this.selectedNodeId.set(null);
  }

  // ---- Edição do nó selecionado ----

  private updateNodeLocal(nodeId: number, patch: Partial<MindMapNode>): void {
    this.nodes.update((list) => list.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)));
  }

  onSelectedLabelChange(value: string): void {
    const node = this.selectedNode();
    if (!node) return;
    this.updateNodeLocal(node.id, { label: value });
    this.schedulePendingNodePatch(node.id, { label: value });
  }

  onSelectedDescriptionChange(value: string): void {
    const node = this.selectedNode();
    if (!node) return;
    this.updateNodeLocal(node.id, { description: value });
    this.schedulePendingNodePatch(node.id, { description: value });
  }

  private schedulePendingNodePatch(nodeId: number, patch: UpdateMindMapNodeRequest): void {
    if (this.pendingNodeId !== nodeId) {
      this.pendingNodePatch = {};
    }
    this.pendingNodeId = nodeId;
    this.pendingNodePatch = { ...this.pendingNodePatch, ...patch };
    this.nodeAutosaver.schedule(() => this.flushNodePatch());
  }

  private async flushNodePatch(): Promise<void> {
    const nodeId = this.pendingNodeId;
    const patch = this.pendingNodePatch;
    if (nodeId === null || Object.keys(patch).length === 0) return;
    this.pendingNodePatch = {};
    this.pendingNodeId = null;
    await firstValueFrom(this.mindmapApi.update(this.fileId(), nodeId, patch));
  }

  resizeSelectedNode(dim: 'w' | 'h', delta: number): void {
    const node = this.selectedNode();
    if (!node) return;
    const next = Math.max(50, Math.min(400, node[dim] + delta));
    this.updateNodeLocal(node.id, { [dim]: next } as Partial<MindMapNode>);
    void firstValueFrom(
      this.mindmapApi.update(this.fileId(), node.id, { [dim]: next } as UpdateMindMapNodeRequest),
    );
  }

  pickSelectedShape(shape: NodeShape): void {
    const node = this.selectedNode();
    if (!node) return;
    let w: number;
    let h: number;
    if (shape === 'circle' || shape === 'square') {
      w = 90;
      h = 90;
    } else if (shape === 'diamond') {
      w = 130;
      h = 130;
    } else {
      w = 140;
      h = 64;
    }
    this.updateNodeLocal(node.id, { shape, w, h });
    void firstValueFrom(this.mindmapApi.update(this.fileId(), node.id, { shape, w, h }));
  }

  pickSelectedBorderStyle(borderStyle: BorderStyle): void {
    const node = this.selectedNode();
    if (!node) return;
    this.updateNodeLocal(node.id, { borderStyle });
    void firstValueFrom(this.mindmapApi.update(this.fileId(), node.id, { borderStyle }));
  }

  pickSelectedFontSize(fontSize: NodeFontSize): void {
    const node = this.selectedNode();
    if (!node) return;
    this.updateNodeLocal(node.id, { fontSize });
    void firstValueFrom(this.mindmapApi.update(this.fileId(), node.id, { fontSize }));
  }

  /**
   * Limitação conhecida da API (ver API.md): uma vez setado, colorId/borderColorId não pode
   * ser "limpo" de volta pra null via PATCH (enviar null é tratado como "não alterar").
   * Por isso o swatch "nenhuma" só tem efeito enquanto a cor ainda não foi definida (estado
   * inicial, sem PATCH nenhum) — clicar nele depois de já ter escolhido uma cor não faz nada,
   * sem necessidade de mensagem de erro.
   */
  pickSelectedColor(slug: ColorSlug | null): void {
    const node = this.selectedNode();
    if (!node) return;
    if (slug === null) return;
    const color = this.colors().find((c) => c.slug === slug);
    if (!color) return;
    this.updateNodeLocal(node.id, { color });
    void firstValueFrom(this.mindmapApi.update(this.fileId(), node.id, { colorId: color.id }));
  }

  pickSelectedBorderColor(slug: ColorSlug | null): void {
    const node = this.selectedNode();
    if (!node) return;
    if (slug === null) return;
    const color = this.colors().find((c) => c.slug === slug);
    if (!color) return;
    this.updateNodeLocal(node.id, { borderColor: color });
    void firstValueFrom(this.mindmapApi.update(this.fileId(), node.id, { borderColorId: color.id }));
  }
}
