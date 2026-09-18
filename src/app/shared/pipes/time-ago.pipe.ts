import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'timeAgo', pure: true })
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Editado agora';
    if (minutes < 60) return `Editado há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Editado há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Editado ontem';
    if (days < 7) return `Editado há ${days} dias`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `Editado há ${weeks} semana(s)`;
    const months = Math.floor(days / 30);
    if (months < 12) return `Editado há ${months} mês(es)`;
    const years = Math.floor(days / 365);
    return `Editado há ${years} ano(s)`;
  }
}
