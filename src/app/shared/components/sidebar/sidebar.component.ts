import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom, map, startWith } from 'rxjs';
import { TopicsStore } from '../../services/topics-store.service';
import { ColorsService } from '../../services/colors.service';
import { FilesAggregatorService, FileWithTopic } from '../../services/files-aggregator.service';
import { ColorSwatchRowComponent } from '../color-swatch-row/color-swatch-row.component';
import { IconSwatchRowComponent } from '../icon-swatch-row/icon-swatch-row.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { TOPIC_COLORS } from '../../constants/topic-colors.constant';
import { ColorSlug, Topic, TopicIcon } from '../../models';

interface SearchResult {
  title: string;
  topicName: string;
  onClick: () => void;
}

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ColorSwatchRowComponent, IconSwatchRowComponent, ConfirmDialogComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly topicsStore = inject(TopicsStore);
  private readonly colorsApi = inject(ColorsService);
  private readonly filesAggregator = inject(FilesAggregatorService);

  protected readonly TOPIC_COLORS = TOPIC_COLORS;
  protected readonly topics = this.topicsStore.topics;

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeTopicId = computed(() => {
    const match = this.currentUrl().match(/^\/topics\/(\d+)/);
    return match ? Number(match[1]) : null;
  });

  // Busca
  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<SearchResult[]>([]);
  protected readonly hasSearchQuery = computed(() => this.searchQuery().trim().length > 0);

  // Novo tópico
  protected readonly newTopicOpen = signal(false);
  protected readonly newTopicName = signal('');
  protected readonly newTopicColor = signal<ColorSlug>('accent');
  protected readonly newTopicIcon = signal<TopicIcon>('code');

  // Editar tópico
  protected readonly editingTopicId = signal<number | null>(null);
  protected readonly editTopicName = signal('');
  protected readonly editTopicColor = signal<ColorSlug>('accent');
  protected readonly editTopicIcon = signal<TopicIcon>('code');

  // Excluir tópico
  protected readonly deletingTopic = signal<Topic | null>(null);

  constructor() {
    this.topicsStore.ensureLoaded();
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  isActive(topicId: number): boolean {
    return this.activeTopicId() === topicId;
  }

  async onSearchChange(value: string): Promise<void> {
    this.searchQuery.set(value);
    const query = value.trim().toLowerCase();
    if (!query) {
      this.searchResults.set([]);
      return;
    }
    const all = await this.filesAggregator.listAll();
    const topicMatches: SearchResult[] = this.topics()
      .filter((t) => t.name.toLowerCase().includes(query))
      .map((t) => ({ title: t.name, topicName: 'Tópico', onClick: () => this.goToTopic(t.id) }));
    const fileMatches: SearchResult[] = all
      .filter((entry: FileWithTopic) => entry.file.name.toLowerCase().includes(query))
      .map((entry) => ({
        title: entry.file.name,
        topicName: entry.topic.name,
        onClick: () => this.goToFile(entry),
      }));
    this.searchResults.set([...topicMatches, ...fileMatches].slice(0, 8));
  }

  private goToTopic(topicId: number): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.router.navigate(['/topics', topicId]);
  }

  private goToFile(entry: FileWithTopic): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    const base = ['/topics', entry.topic.id, 'files', entry.file.id];
    const suffix = entry.file.type === 'doc' ? 'doc' : entry.file.type === 'cards' ? 'cards' : entry.file.type === 'mindmap' ? 'mindmap' : 'slides';
    this.router.navigate([...base, suffix]);
  }

  startNewTopic(): void {
    this.newTopicOpen.set(true);
    this.newTopicName.set('');
    this.newTopicColor.set('accent');
    this.newTopicIcon.set('code');
  }

  cancelNewTopic(): void {
    this.newTopicOpen.set(false);
  }

  onNewTopicNameChange(value: string): void {
    this.newTopicName.set(value.slice(0, 40));
  }

  async confirmNewTopic(): Promise<void> {
    const name = this.newTopicName().trim();
    if (!name) {
      this.newTopicOpen.set(false);
      return;
    }
    const colors = await firstValueFrom(this.colorsApi.list());
    const color = colors.find((c) => c.slug === this.newTopicColor());
    if (!color) return;
    const topic = await this.topicsStore.create({ name, colorId: color.id, icon: this.newTopicIcon() });
    this.newTopicOpen.set(false);
    this.router.navigate(['/topics', topic.id]);
  }

  startEditTopic(topic: Topic, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.editingTopicId.set(topic.id);
    this.editTopicName.set(topic.name);
    this.editTopicColor.set(topic.color.slug);
    this.editTopicIcon.set(topic.icon ?? 'code');
  }

  cancelEditTopic(): void {
    this.editingTopicId.set(null);
  }

  onEditTopicNameChange(value: string): void {
    this.editTopicName.set(value.slice(0, 40));
  }

  async confirmEditTopic(): Promise<void> {
    const name = this.editTopicName().trim();
    const id = this.editingTopicId();
    if (!name || id === null) {
      this.editingTopicId.set(null);
      return;
    }
    const colors = await firstValueFrom(this.colorsApi.list());
    const color = colors.find((c) => c.slug === this.editTopicColor());
    if (!color) return;
    await this.topicsStore.update(id, { name, colorId: color.id, icon: this.editTopicIcon() });
    this.editingTopicId.set(null);
  }

  startDeleteTopic(topic: Topic, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.deletingTopic.set(topic);
  }

  cancelDeleteTopic(): void {
    this.deletingTopic.set(null);
  }

  async confirmDeleteTopic(): Promise<void> {
    const topic = this.deletingTopic();
    if (!topic) return;
    const wasActive = this.activeTopicId() === topic.id;
    await this.topicsStore.remove(topic.id);
    this.deletingTopic.set(null);
    if (wasActive) this.router.navigateByUrl('/');
  }
}
