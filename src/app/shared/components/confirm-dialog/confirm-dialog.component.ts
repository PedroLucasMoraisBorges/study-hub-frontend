import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="position:fixed;inset:0;background:rgba(36,31,28,.5);display:flex;align-items:center;justify-content:center;z-index:100">
      <div style="width:300px;background:#fff;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow-lg)">
        <div style="font-weight:800;font-size:18px">{{ title() }}</div>
        <div style="font-size:13px;opacity:.7">{{ description() }}</div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button (click)="cancel.emit()" style="padding:8px 14px;border-radius:9px;border:1.5px solid var(--divider);background:#fff;font:800 13px 'Archivo'">Cancelar</button>
          <button (click)="confirm.emit()" style="padding:8px 14px;border-radius:9px;border:none;background:var(--rose);color:#fff;font:800 13px 'Archivo'">{{ confirmLabel() }}</button>
        </div>
      </div>
    </div>
  `,
  styles: ':host { display: contents; }',
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly confirmLabel = input<string>('Excluir');

  readonly cancel = output<void>();
  readonly confirm = output<void>();
}
