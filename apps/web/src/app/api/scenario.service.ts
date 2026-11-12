import { Injectable, computed, inject, signal } from '@angular/core';
import { getScenario, type Scenario } from '@chantier/domain';
import { ApiService } from './api.service';

export const DEFAULT_SCENARIO_ID = 'chantier-1';

/** `api` : servi par le serveur ; `local` : copie embarquée dans le paquet `domain`. */
export type ScenarioSource = 'api' | 'local';

export type LoadedScenario = { scenario: Scenario; source: ScenarioSource };

/**
 * Scénario courant, chargé depuis l'API avec la copie du paquet `domain` comme secours :
 * la partie reste jouable sans serveur. Une fois obtenu du serveur, il n'est plus redemandé.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioService {
  private readonly api = inject(ApiService);
  private readonly current = signal<LoadedScenario | null>(localCopy(DEFAULT_SCENARIO_ID));

  /** Scénario affiché en attendant la réponse du serveur (copie locale au départ). */
  readonly scenario = computed(() => this.current()?.scenario);
  readonly source = computed(() => this.current()?.source);
  /** Vrai dès qu'une réponse (ou un échec) de l'API est connue. */
  readonly checked = signal(false);

  async load(id: string = DEFAULT_SCENARIO_ID): Promise<LoadedScenario | null> {
    const current = this.current();
    if (current?.source === 'api' && current.scenario.id === id) return current;

    try {
      const loaded: LoadedScenario = { scenario: await this.api.getScenario(id), source: 'api' };
      this.current.set(loaded);
      this.checked.set(true);
      return loaded;
    } catch (error: unknown) {
      console.warn(`Scénario « ${id} » indisponible sur l'API, copie locale utilisée.`, error);
      const fallback = localCopy(id);
      if (fallback) this.current.set(fallback);
      this.checked.set(true);
      return fallback;
    }
  }
}

function localCopy(id: string): LoadedScenario | null {
  const scenario = getScenario(id);
  return scenario ? { scenario, source: 'local' } : null;
}
