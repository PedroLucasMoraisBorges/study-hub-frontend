import { TestBed } from '@angular/core/testing';
import { SafeHtml } from '@angular/platform-browser';
import { CodeHighlightPipe } from './code-highlight.pipe';

describe('CodeHighlightPipe', () => {
  let pipe: CodeHighlightPipe;

  // SafeHtml é opaco; lê o HTML bruto que foi marcado como confiável.
  const raw = (value: SafeHtml): string =>
    (value as unknown as { changingThisBreaksApplicationSecurity: string }).changingThisBreaksApplicationSecurity;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CodeHighlightPipe] });
    pipe = TestBed.inject(CodeHighlightPipe);
  });

  it('gera tokens para uma linguagem conhecida', () => {
    expect(raw(pipe.transform('const a = 1;', 'javascript'))).toContain('<span class="token');
  });

  it.each(['plaintext', 'linguagem-inexistente', null, undefined])('escapa HTML quando a linguagem é %s', (lang) => {
    expect(raw(pipe.transform('<script>alert(1)</script>', lang))).toBe('&lt;script>alert(1)&lt;/script>');
  });

  it('escapa HTML também em linguagem conhecida', () => {
    expect(raw(pipe.transform('const s = "<img onerror=x>";', 'javascript'))).not.toContain('<img');
  });

  it('aceita texto nulo', () => {
    expect(raw(pipe.transform(null, 'javascript'))).toBe('');
  });

  it.each(['php', 'cpp', 'csharp', 'html', 'markdown', 'sql', 'bash', 'yaml', 'json', 'css'])(
    'carrega o grammar de %s sem lançar',
    (lang) => {
      expect(() => pipe.transform('x', lang)).not.toThrow();
    },
  );
});
