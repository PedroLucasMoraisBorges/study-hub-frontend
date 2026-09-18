const RICH_TOKEN_RE = /(\*\*[^*]+\*\*|~~[^~]+~~|__[^_]+__|\*[^*]+\*)/g;

export type RichMarker = '**' | '*' | '__' | '~~';

/**
 * Envolve a seleção atual do textarea com o marcador (bold/italic/underline/strike),
 * espelhando o wrapMarker() do protótipo: se nada está selecionado, usa a palavra "texto".
 * Retorna o novo valor e a seleção a restaurar.
 */
export function wrapSelectionWithMarker(
  textarea: HTMLTextAreaElement,
  marker: RichMarker,
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const value = textarea.value;
  const hasSelection = end > start;
  const selected = hasSelection ? value.slice(start, end) : 'texto';
  const wrapped = `${marker}${selected}${marker}`;
  const newValue = value.slice(0, start) + wrapped + value.slice(end);
  return {
    value: newValue,
    selectionStart: start + marker.length,
    selectionEnd: start + marker.length + selected.length,
  };
}

/** Converte marcações estilo Markdown-lite (**b** *i* __u__ ~~s~~) em HTML seguro. */
export function parseRichText(text: string): string {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(RICH_TOKEN_RE, (token) => {
    if (token.startsWith('**')) return `<b>${token.slice(2, -2)}</b>`;
    if (token.startsWith('~~')) return `<s>${token.slice(2, -2)}</s>`;
    if (token.startsWith('__')) return `<u>${token.slice(2, -2)}</u>`;
    return `<i>${token.slice(1, -1)}</i>`;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
