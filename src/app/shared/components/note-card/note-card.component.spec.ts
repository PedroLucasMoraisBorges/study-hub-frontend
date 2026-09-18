import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Note, NoteColor } from '../../models';
import { NoteCardComponent } from './note-card.component';

const NOTE: Note = {
  id: 1,
  documentId: null,
  topicId: 1,
  text: 'texto inicial',
  color: 'sage',
  createdAt: '2026-09-18T12:00:00Z',
};

describe('NoteCardComponent', () => {
  let fixture: ComponentFixture<NoteCardComponent>;
  let el: HTMLElement;

  const q = <T extends HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const button = (label: string) => q<HTMLButtonElement>(`button[aria-label="${label}"]`);

  function render(inputs: Record<string, unknown> = {}): void {
    fixture.componentRef.setInput('note', NOTE);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    fixture.detectChanges();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(NoteCardComponent);
    el = fixture.nativeElement;
  });

  it('modo edição: mostra o texto num textarea e propaga a digitação', () => {
    render();
    const textarea = q<HTMLTextAreaElement>('textarea')!;
    expect(textarea.value).toBe('texto inicial');

    const emitted: string[] = [];
    fixture.componentInstance.textChange.subscribe((v) => emitted.push(v));
    textarea.value = 'novo texto';
    textarea.dispatchEvent(new Event('input'));

    expect(emitted).toEqual(['novo texto']);
  });

  it('modo visualização: texto estático, sem textarea nem controles', () => {
    render({ editable: false });

    expect(q('textarea')).toBeNull();
    expect(el.textContent).toContain('texto inicial');
    expect(button('Excluir nota')).toBeNull();
    expect(button('Cor Verde')).toBeNull();
  });

  it('marca só a cor ativa com aria-pressed e emite a cor escolhida', () => {
    render();
    expect(button('Cor Verde')!.getAttribute('aria-pressed')).toBe('true');
    expect(button('Cor Amarelo')!.getAttribute('aria-pressed')).toBe('false');

    const emitted: NoteColor[] = [];
    fixture.componentInstance.colorChange.subscribe((c) => emitted.push(c));
    button('Cor Lavanda')!.click();

    expect(emitted).toEqual(['lavender']);
  });

  it('usa os tokens da cor da nota no fundo e no texto', () => {
    render();
    const card = q<HTMLElement>('.note')!;
    expect(card.style.background).toContain('--note-sage');
    expect(card.style.color).toContain('--note-sage-ink');
  });

  it('exclusão pede confirmação: Cancelar não emite, Excluir emite', () => {
    render();
    let removed = 0;
    fixture.componentInstance.remove.subscribe(() => removed++);

    button('Excluir nota')!.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Excluir esta nota?');
    expect(removed).toBe(0);

    Array.from(el.querySelectorAll<HTMLButtonElement>('[role="group"] button'))[0].click(); // Cancelar
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Excluir esta nota?');
    expect(removed).toBe(0);

    button('Excluir nota')!.click();
    fixture.detectChanges();
    Array.from(el.querySelectorAll<HTMLButtonElement>('[role="group"] button'))[1].click(); // Excluir
    fixture.detectChanges();

    expect(removed).toBe(1);
    expect(el.textContent).not.toContain('Excluir esta nota?');
  });

  it('Esc na confirmação cancela só a confirmação (não propaga para fechar o painel)', () => {
    render();
    const onDocument = vi.fn();
    document.addEventListener('keydown', onDocument);

    button('Excluir nota')!.click();
    fixture.detectChanges();
    q('[role="group"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    document.removeEventListener('keydown', onDocument);

    expect(el.textContent).not.toContain('Excluir esta nota?');
    expect(onDocument).not.toHaveBeenCalled();
  });

  it('focus() foca o textarea', () => {
    render();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(q('textarea'));
  });

  it('formata a data em pt-BR curto (dia + mês)', () => {
    render();
    expect(q('.note-head span')!.textContent).toMatch(/^\d{1,2} [a-zç]{3,}$/i);
  });

  it('painel alterna ±0.5°; mural usa rotação/deslocamento por índice', () => {
    render({ variant: 'panel', index: 0 });
    expect(q<HTMLElement>('.note')!.style.transform).toBe('rotate(0.5deg)');

    fixture.componentRef.setInput('index', 1);
    fixture.detectChanges();
    expect(q<HTMLElement>('.note')!.style.transform).toBe('rotate(-0.5deg)');

    fixture.componentRef.setInput('variant', 'board');
    fixture.componentRef.setInput('index', 0);
    fixture.detectChanges();
    expect(q<HTMLElement>('.note')!.style.transform).toBe('translateY(0px) rotate(-3deg)');
  });
});
