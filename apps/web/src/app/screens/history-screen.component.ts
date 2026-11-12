import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getScenario, replay, type SessionSummary } from '@chantier/domain';
import { ApiService } from '../api/api.service';
import { SessionSyncService } from '../api/session-sync.service';

/** Résultat du rejeu d'un journal dans le navigateur, sans 3D (tâche 9.8). */
type LocalReplay =
  | { state: 'loading' }
  | { state: 'done'; score: number; events: number; matchesServer: boolean }
  | { state: 'error'; message: string };

type ListState =
  | { state: 'loading' }
  | { state: 'ready'; sessions: SessionSummary[] }
  | { state: 'error'; message: string };

/** Historique des parties enregistrées par le serveur, plus les parties en attente d'envoi. */
@Component({
  selector: 'app-history-screen',
  imports: [RouterLink],
  templateUrl: './history-screen.component.html',
  styleUrl: './history-screen.component.css',
})
export class HistoryScreenComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly sync = inject(SessionSyncService);

  readonly list = signal<ListState>({ state: 'loading' });
  readonly replays = signal<ReadonlyMap<string, LocalReplay>>(new Map());
  readonly pendingCount = this.sync.pendingCount;
  readonly sessions = computed(() => {
    const list = this.list();
    return list.state === 'ready' ? list.sessions : [];
  });
  readonly listError = computed(() => {
    const list = this.list();
    return list.state === 'error' ? list.message : null;
  });

  private readonly dateFormat = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  ngOnInit(): void {
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.list.set({ state: 'loading' });
    await this.sync.flush();
    try {
      this.list.set({ state: 'ready', sessions: await this.api.listSessions() });
    } catch (error: unknown) {
      this.list.set({ state: 'error', message: messageOf(error) });
    }
  }

  formatDate(iso: string): string {
    return this.dateFormat.format(new Date(iso));
  }

  reasonLabel(session: SessionSummary): string {
    if (session.reason === 'arrivee') return 'Arrivée';
    if (session.reason === 'panne_seche') return 'Panne sèche';
    return 'Non terminée';
  }

  /** Texte et ton du rejeu local d'une session, ou `null` s'il n'a pas été demandé. */
  replayLabel(id: string): { tone: 'ok' | 'warn' | 'error' | 'muted'; text: string } | null {
    const result = this.replays().get(id);
    switch (result?.state) {
      case undefined:
        return null;
      case 'loading':
        return { tone: 'muted', text: '…' };
      case 'error':
        return { tone: 'error', text: `échec : ${result.message}` };
      case 'done':
        return {
          tone: result.matchesServer ? 'ok' : 'warn',
          text: `${result.score} (${result.events} évts) ${result.matchesServer ? '= serveur' : '≠ serveur'}`,
        };
    }
  }

  /** Recharge le journal et le rejoue avec le paquet `domain`, comme le fait le serveur. */
  async replayLocally(id: string): Promise<void> {
    this.setReplay(id, { state: 'loading' });
    try {
      const detail = await this.api.getSession(id);
      const scenario = getScenario(detail.scenarioId, detail.scenarioVersion);
      if (!scenario) {
        this.setReplay(id, {
          state: 'error',
          message: `Scénario ${detail.scenarioId} v${detail.scenarioVersion} absent de la copie locale`,
        });
        return;
      }

      const state = replay(scenario, detail.events);
      const score = state.result?.score ?? 0;
      this.setReplay(id, {
        state: 'done',
        score,
        events: detail.events.length,
        matchesServer: score === detail.serverScore,
      });
    } catch (error: unknown) {
      this.setReplay(id, { state: 'error', message: messageOf(error) });
    }
  }

  private setReplay(id: string, value: LocalReplay): void {
    this.replays.update((replays) => new Map(replays).set(id, value));
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
