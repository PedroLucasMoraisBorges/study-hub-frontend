import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FilesAggregatorService } from '../../shared/services/files-aggregator.service';
import { TOPIC_COLORS } from '../../shared/constants/topic-colors.constant';
import { FILE_TYPE_ICON_PATHS } from '../../shared/constants/file-type-icons.constant';
import { fileRouteCommands } from '../../shared/utils/file-route.util';
import { FileSummary, FileType } from '../../shared/models';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

const RECENT_FILES_LIMIT = 4;

interface RecentFileVm {
  file: FileSummary;
  topicId: number;
  topicName: string;
  soft: string;
  ink: string;
  iconSvg: SafeHtml;
  isDoc: boolean;
  isCards: boolean;
  isSlides: boolean;
}

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimeAgoPipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  private readonly filesAggregator = inject(FilesAggregatorService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly recentFiles = signal<RecentFileVm[]>([]);

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    const all = await this.filesAggregator.listAll();
    const sorted = [...all].sort(
      (a, b) => new Date(b.file.updatedAt).getTime() - new Date(a.file.updatedAt).getTime(),
    );
    this.recentFiles.set(
      sorted.slice(0, RECENT_FILES_LIMIT).map(({ file, topic }) => ({
        file,
        topicId: topic.id,
        topicName: topic.name,
        soft: TOPIC_COLORS[topic.color.slug].soft,
        ink: TOPIC_COLORS[topic.color.slug].ink,
        iconSvg: this.sanitizer.bypassSecurityTrustHtml(FILE_TYPE_ICON_PATHS[file.type]),
        isDoc: file.type === 'doc',
        isCards: file.type === 'cards',
        isSlides: file.type === 'slides',
      })),
    );
  }

  openFile(item: RecentFileVm): void {
    this.router.navigate(fileRouteCommands(item.topicId, item.file.id, item.file.type) as any[]);
  }

  editFile(item: RecentFileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(fileRouteCommands(item.topicId, item.file.id, item.file.type) as any[]);
  }

  viewDoc(item: RecentFileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(fileRouteCommands(item.topicId, item.file.id, 'doc' as FileType) as any[], {
      queryParams: { mode: 'preview' },
    });
  }

  reviewCards(item: RecentFileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/topics', item.topicId, 'files', item.file.id, 'cards', 'review'], {
      queryParams: { shuffle: 1 },
    });
  }

  presentSlides(item: RecentFileVm, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/topics', item.topicId, 'files', item.file.id, 'slides'], {
      queryParams: { present: 1 },
    });
  }
}
