import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TopicsService } from './topics.service';
import { Topic, TopicRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class TopicsStore {
  private readonly api = inject(TopicsService);

  private readonly _topics = signal<Topic[]>([]);
  private readonly _loaded = signal(false);
  private readonly _loading = signal(false);

  readonly topics = this._topics.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly loading = this._loading.asReadonly();

  async ensureLoaded(): Promise<void> {
    if (this._loaded()) return;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    try {
      const topics = await firstValueFrom(this.api.list());
      this._topics.set(topics);
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  getById(id: number): Topic | undefined {
    return this._topics().find((t) => t.id === id);
  }

  async create(body: TopicRequest): Promise<Topic> {
    const topic = await firstValueFrom(this.api.create(body));
    await this.refresh();
    return topic;
  }

  async update(id: number, body: TopicRequest): Promise<Topic> {
    const topic = await firstValueFrom(this.api.update(id, body));
    await this.refresh();
    return topic;
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.api.delete(id));
    await this.refresh();
  }
}
