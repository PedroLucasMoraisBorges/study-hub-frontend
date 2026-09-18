import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FilesService } from './files.service';
import { TopicsStore } from './topics-store.service';
import { FileSummary, Topic } from '../models';

export interface FileWithTopic {
  file: FileSummary;
  topic: Topic;
}

/**
 * A API não expõe um endpoint global de "todos os arquivos" (só por tópico) —
 * este serviço agrega os arquivos de todos os tópicos, usado pela busca da sidebar
 * e pela lista de "Atividade recente" da home.
 */
@Injectable({ providedIn: 'root' })
export class FilesAggregatorService {
  private readonly filesApi = inject(FilesService);
  private readonly topicsStore = inject(TopicsStore);

  async listAll(): Promise<FileWithTopic[]> {
    await this.topicsStore.ensureLoaded();
    const topics = this.topicsStore.topics();
    const lists = await Promise.all(topics.map((t) => firstValueFrom(this.filesApi.listByTopic(t.id))));
    const combined: FileWithTopic[] = [];
    topics.forEach((topic, i) => {
      for (const file of lists[i]) combined.push({ file, topic });
    });
    return combined;
  }
}
