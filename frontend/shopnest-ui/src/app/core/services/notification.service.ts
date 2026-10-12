import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private toastsSignal = signal<Toast[]>([]);
  readonly toasts = this.toastsSignal.asReadonly();
  private nextId = 1;

  success(message: string) {
    this.push('success', message);
  }
  error(message: string) {
    this.push('error', message);
  }
  info(message: string) {
    this.push('info', message);
  }
  warning(message: string) {
    this.push('warning', message);
  }

  dismiss(id: number) {
    this.toastsSignal.update((list) => list.filter((t) => t.id !== id));
  }

  private push(type: ToastType, message: string) {
    const id = this.nextId++;
    const toast: Toast = { id, type, message };
    this.toastsSignal.update((list) => [...list, toast]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => this.dismiss(id), 4000);
  }
}