import { Injectable, signal } from '@angular/core';
import type { GameResult, SessionSubmission } from '@chantier/domain';

/**
 * Issue d'une partie terminée, transmise à l'écran de fin par le routeur.
 * `submission` contient le journal et l'état final, envoyés tels quels à l'API ; `syncId` permet à
 * l'écran de fin de suivre cet envoi dans `SessionSyncService`.
 */
export type GameOutcome = {
  result: GameResult;
  fuel: number;
  distance: number;
  conesHit: number;
  durationMs: number;
  submission: SessionSubmission;
  syncId: string;
};

/**
 * Mémoire de la dernière partie terminée. Le service est fourni à la racine : il survit à la
 * destruction du composant de jeu, le temps que l'écran de fin l'affiche.
 */
@Injectable({ providedIn: 'root' })
export class GameSessionService {
  private readonly current = signal<GameOutcome | null>(null);

  /** Dernière partie terminée, ou `null` si aucune partie n'a été jouée. */
  readonly outcome = this.current.asReadonly();

  publish(outcome: GameOutcome): void {
    this.current.set(outcome);
  }

  clear(): void {
    this.current.set(null);
  }
}
