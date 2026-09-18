import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../core/config/api-config';
import { Note } from '../models';
import { NotesService } from './notes.service';

const NOTE: Note = {
  id: 7,
  documentId: null,
  topicId: 3,
  text: null,
  color: 'butter',
  createdAt: '2026-09-18T12:00:00Z',
};

describe('NotesService', () => {
  let service: NotesService;
  let http: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotesService);
    http = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => http.verify());

  it('lista as notas de um tópico', () => {
    let result: Note[] = [];
    service.listByTopic(3).subscribe((notes) => (result = notes));

    const req = http.expectOne(`${baseUrl}/topics/3/notes`);
    expect(req.request.method).toBe('GET');
    req.flush([NOTE]);

    expect(result).toEqual([NOTE]);
  });

  it('lista as notas de um documento', () => {
    service.listByFile(9).subscribe();

    const req = http.expectOne(`${baseUrl}/files/9/notes`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cria uma nota avulsa e uma nota vinculada a documento', () => {
    service.create(3, { documentId: null }).subscribe();
    const avulsa = http.expectOne(`${baseUrl}/topics/3/notes`);
    expect(avulsa.request.method).toBe('POST');
    expect(avulsa.request.body).toEqual({ documentId: null });
    avulsa.flush(NOTE);

    service.create(3, { documentId: 9 }).subscribe();
    const vinculada = http.expectOne(`${baseUrl}/topics/3/notes`);
    expect(vinculada.request.body).toEqual({ documentId: 9 });
    vinculada.flush({ ...NOTE, documentId: 9 });
  });

  it('atualiza texto e cor com PUT parcial', () => {
    service.update(7, { color: 'sage' }).subscribe();

    const req = http.expectOne(`${baseUrl}/notes/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ color: 'sage' });
    req.flush({ ...NOTE, color: 'sage' });
  });

  it('exclui uma nota', () => {
    service.delete(7).subscribe();

    const req = http.expectOne(`${baseUrl}/notes/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
