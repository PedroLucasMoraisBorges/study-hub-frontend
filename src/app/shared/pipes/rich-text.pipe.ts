import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { parseRichText } from '../utils/rich-text.util';

@Pipe({ name: 'richText', pure: true })
export class RichTextPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(parseRichText(value ?? ''));
  }
}
