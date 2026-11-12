import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { SessionCreated, SessionSubmission } from '@chantier/domain';
import { filter } from 'rxjs';
import { ApiError, ApiService } from './api.service';
import { type PendingSession, readPendingSessions, writePendingSessions } from './pending-store';

/** Avancement de l'envoi d'une session au serveur. */
export type SyncStatus =
  | { state: 'sending' }
  /** Acceptée : `result.verified` indique si le rejeu confirme le score. */
  | { state: 'sent'; result: SessionCreated }
  /** Serveur injoignable : conservée sur l'appareil, renvoyée plus tard. */
  | { state: 'pending' }
  /** Refusée (400) : inutile de réessayer, la session est abandonnée. */
  | { state: 'rejected'; message: string };

/**
 * Envoi des sessions terminées, avec mode dégradé (section 7.7) : chaque session est d'abord
 * écrite dans `localStorage`, puis envoyée. En cas d'échec réseau, elle y reste et l'envoi est
 * retenté au prochain chargement, à chaque navigation et au retour du réseau.
 */
@Injectable({ providedIn: 'root' })
export class SessionSyncService {
  private readonly api = inject(ApiService);
  private readonly queue = signal<PendingSession[]>(readPendingSessions());
  private readonly statuses = signal<ReadonlyMap<string, SyncStatus>>(new Map());
  private running?: Promise<void>;
  private rerun = false;

  readonly pendingCount = computed(() => this.queue().length);

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => void this.flush());
    window.addEventListener('online', () => void this.flush());
  }

  /** Met la session en file (persistée) et lance l'envoi ; retourne son identifiant local. */
  submit(submission: SessionSubmission): string {
    const localId = crypto.randomUUID();
    this.updateQueue((queue) => [
      ...queue,
      { localId, savedAt: new Date().toISOString(), submission },
    ]);
    this.setStatus(localId, { state: 'sending' });
    void this.flush();
    return localId;
  }

  status(localId: string): SyncStatus | undefined {
    return this.statuses().get(localId);
  }

  /** Envoie les sessions en attente, une par une, dans l'ordre où elles ont été jouées. */
  flush(): Promise<void> {
    if (this.running) {
      this.rerun = true;
      return this.running;
    }

    this.running = this.drain().finally(() => {
      this.running = undefined;
      if (this.rerun) {
        this.rerun = false;
        void this.flush();
      }
    });
    return this.running;
  }

  private async drain(): Promise<void> {
    for (let item = this.queue()[0]; item; item = this.queue()[0]) {
      this.setStatus(item.localId, { state: 'sending' });
      try {
        const result = await this.api.submitSession(item.submission);
        this.remove(item.localId);
        this.setStatus(item.localId, { state: 'sent', result });
      } catch (error: unknown) {
        if (error instanceof ApiError && error.kind === 'rejected') {
          console.warn('Session refusée par le serveur, abandonnée', error);
          this.remove(item.localId);
          this.setStatus(item.localId, { state: 'rejected', message: error.message });
          continue;
        }

        // Serveur injoignable (ou réponse inattendue) : tout ce qui reste attend le prochain essai.
        for (const waiting of this.queue()) this.setStatus(waiting.localId, { state: 'pending' });
        return;
      }
    }
  }

  private remove(localId: string): void {
    this.updateQueue((queue) => queue.filter((item) => item.localId !== localId));
  }

  private updateQueue(update: (queue: PendingSession[]) => PendingSession[]): void {
    const next = update(this.queue());
    this.queue.set(next);
    writePendingSessions(next);
  }

  private setStatus(localId: string, status: SyncStatus): void {
    this.statuses.update((statuses) => new Map(statuses).set(localId, status));
  }
}
