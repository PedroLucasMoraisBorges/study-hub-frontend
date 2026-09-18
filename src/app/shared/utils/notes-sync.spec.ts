import { signal } from '@angular/core';
import { of } from 'rxjs';
import { Note } from '../models';
import { NotesService } from '../services/notes.service';
import { NotesSync } from './notes-sync';

const note = (id: number, over: Partial<Note> = {}): Note => ({
  id,
  documentId: null,
  topicId: 1,
  text: null,
  color: 'butter',
  createdAt: '2026-09-18T12:00:00Z',
  ...over,
});

function setup(initial: Note[] = [note(1), note(2)]) {
  const notes = signal<Note[]>(initial);
  const api = {
    create: vi.fn((_topicId: number, body: { documentId?: number | null }) =>
      of(note(99, { documentId: body.documentId ?? null })),
    ),
    update: vi.fn((id: number) => of(note(id))),
    delete: vi.fn(() => of(undefined)),
  };
  const schedule = vi.fn();
  const sync = new NotesSync(notes, api as unknown as NotesService, schedule);
  return { notes, api, schedule, sync };
}

describe('NotesSync', () => {
  it('cria a nota e a acrescenta no fim da lista', async () => {
    const { notes, api, sync } = setup();

    const created = await sync.create(1, 7);

    expect(api.create).toHaveBeenCalledWith(1, { documentId: 7 });
    expect(created.documentId).toBe(7);
    expect(notes().map((n) => n.id)).toEqual([1, 2, 99]);
  });

  it('atualiza o signal na hora e agenda o flush', () => {
    const { notes, schedule, sync } = setup();

    sync.changeText(1, 'oi');
    sync.changeColor(2, 'mist');

    expect(notes()[0].text).toBe('oi');
    expect(notes()[1].color).toBe('mist');
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it('junta texto e cor da mesma nota num único PUT parcial e limpa os patches', async () => {
    const { api, sync } = setup();

    sync.changeText(1, 'a');
    sync.changeText(1, 'ab');
    sync.changeColor(1, 'sage');
    await sync.flush();

    expect(api.update).toHaveBeenCalledTimes(1);
    expect(api.update).toHaveBeenCalledWith(1, { text: 'ab', color: 'sage' });

    await sync.flush();
    expect(api.update).toHaveBeenCalledTimes(1);
  });

  it('envia só o campo alterado (patch parcial)', async () => {
    const { api, sync } = setup();

    sync.changeColor(2, 'peach');
    await sync.flush();

    expect(api.update).toHaveBeenCalledWith(2, { color: 'peach' });
  });

  it('excluir descarta o patch pendente e não faz PUT de nota removida', async () => {
    const { notes, api, sync } = setup();

    sync.changeText(1, 'pendente');
    await sync.remove(1);
    await sync.flush();

    expect(api.delete).toHaveBeenCalledWith(1);
    expect(api.update).not.toHaveBeenCalled();
    expect(notes().map((n) => n.id)).toEqual([2]);
  });
});
