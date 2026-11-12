import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionSyncService, type SyncStatus } from '../api/session-sync.service';
import { GameSessionService } from '../game/session.service';

/** Écran de fin : raison, score et statistiques de la dernière partie. */
@Component({
  selector: 'app-end-screen',
  imports: [RouterLink],
  templateUrl: './end-screen.component.html',
  styleUrl: './end-screen.component.css',
})
export class EndScreenComponent {
  private readonly session = inject(GameSessionService);
  private readonly sync = inject(SessionSyncService);

  readonly outcome = this.session.outcome;
  readonly succeeded = computed(() => this.outcome()?.result.reason === 'arrivee');
  readonly duration = computed(() => formatDuration(this.outcome()?.durationMs ?? 0));
  /** Envoi au serveur et vérification par rejeu de la dernière partie. */
  readonly syncMessage = computed(() => {
    const outcome = this.outcome();
    return outcome ? describeSync(this.sync.status(outcome.syncId)) : null;
  });
}

/** Durée lisible : `12,3 s` en dessous d'une minute, `1 min 05 s` au-delà. */
function formatDuration(durationMs: number): string {
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`;

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} min ${String(rest).padStart(2, '0')} s`;
}

type SyncMessage = { tone: 'ok' | 'warn' | 'error' | 'muted'; text: string };

function describeSync(status: SyncStatus | undefined): SyncMessage {
  switch (status?.state) {
    case 'sent':
      return status.result.verified
        ? { tone: 'ok', text: '✓ Score vérifié par le serveur' }
        : {
            tone: 'warn',
            text: `⚠ Score non confirmé par le serveur (score recalculé : ${status.result.serverScore})`,
          };
    case 'pending':
      return {
        tone: 'warn',
        text: 'Serveur injoignable : partie conservée sur cet appareil, elle sera envoyée automatiquement.',
      };
    case 'rejected':
      return { tone: 'error', text: `Partie refusée par le serveur : ${status.message}` };
    default:
      return { tone: 'muted', text: 'Envoi de la partie au serveur…' };
  }
}
