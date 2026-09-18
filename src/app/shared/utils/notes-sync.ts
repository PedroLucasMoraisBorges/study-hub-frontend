import { WritableSignal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Note, NoteColor, UpdateNoteRequest } from '../models';
import { NotesService } from '../services/notes.service';

/**
 * Estado + persistência de uma lista de notas, compartilhado pelo editor de documento e pelo mural
 * do tópico. Mesmo padrão dos blocos: atualização otimista no signal e patches incrementais por id,
 * enviados em lote quando o `schedule` do host (Autosaver) dispara `flush()`.
 */
export class NotesSync {
  private readonly patches = new Map<number, UpdateNoteRequest>();

  constructor(
    private readonly notes: WritableSignal<Note[]>,
    private readonly api: NotesService,
    /** Agenda um `flush()` no Autosaver do host. */
    private readonly schedule: () => void,
  ) {}

  async create(topicId: number, documentId: number | null): Promise<Note> {
    const note = await firstValueFrom(this.api.create(topicId, { documentId }));
    this.notes.update((list) => [...list, note]);
    return note;
  }

  changeText(noteId: number, text: string): void {
    this.patch(noteId, { text });
  }

  changeColor(noteId: number, color: NoteColor): void {
    this.patch(noteId, { color });
  }

  async remove(noteId: number): Promise<void> {
    this.patches.delete(noteId);
    this.notes.update((list) => list.filter((n) => n.id !== noteId));
    await firstValueFrom(this.api.delete(noteId));
  }

  async flush(): Promise<void> {
    const tasks: Promise<unknown>[] = [];
    for (const [noteId, patch] of this.patches) {
      tasks.push(firstValueFrom(this.api.update(noteId, patch)));
    }
    this.patches.clear();
    await Promise.all(tasks);
  }

  private patch(noteId: number, patch: UpdateNoteRequest): void {
    this.notes.update((list) => list.map((n) => (n.id === noteId ? ({ ...n, ...patch } as Note) : n)));
    this.patches.set(noteId, { ...this.patches.get(noteId), ...patch });
    this.schedule();
  }
}
