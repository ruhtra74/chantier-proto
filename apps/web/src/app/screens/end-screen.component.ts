import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  readonly outcome = this.session.outcome;
  readonly succeeded = computed(() => this.outcome()?.result.reason === 'arrivee');
  readonly duration = computed(() => formatDuration(this.outcome()?.durationMs ?? 0));
}

/** Durée lisible : `12,3 s` en dessous d'une minute, `1 min 05 s` au-delà. */
function formatDuration(durationMs: number): string {
  const seconds = durationMs / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`;

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes} min ${String(rest).padStart(2, '0')} s`;
}
