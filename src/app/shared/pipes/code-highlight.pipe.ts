import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Prism from 'prismjs';
// css, clike, javascript e markup (html) já vêm no core; as demais precisam ser importadas.
// Ordem importa: grammars que estendem outro exigem o pai carregado antes (c → cpp, markup-templating → php).
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';

@Pipe({ name: 'codeHighlight', pure: true })
export class CodeHighlightPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(code: string | null | undefined, language: string | null | undefined): SafeHtml {
    const source = code ?? '';
    const grammar = language ? Prism.languages[language] : undefined;
    // Prism.highlight já escapa o código; o fallback (plaintext/desconhecida/nula) escapa manualmente.
    const html = grammar && language ? Prism.highlight(source, grammar, language) : Prism.util.encode(source).toString();
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
