import { Component, computed, inject, type OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScenarioService } from '../api/scenario.service';

/** Écran d'accueil : consignes et règles, puis lancement de la partie. */
@Component({
  selector: 'app-start-screen',
  imports: [RouterLink],
  templateUrl: './start-screen.component.html',
  styleUrl: './start-screen.component.css',
})
export class StartScreenComponent implements OnInit {
  private readonly scenarios = inject(ScenarioService);
  /** Copie locale affichée tout de suite, remplacée par la version du serveur dès réception. */
  private readonly scenario = this.scenarios.scenario;

  readonly source = this.scenarios.source;
  readonly checked = this.scenarios.checked.asReadonly();
  readonly target = computed(() => this.scenario()?.target);
  readonly coneCount = computed(() => this.scenario()?.cones.length ?? 0);
  readonly fuelCapacity = computed(() => this.scenario()?.fuel.capacity ?? 0);
  readonly consumptionPerMeter = computed(() => this.scenario()?.fuel.consumptionPerMeter ?? 0);
  readonly scoring = computed(() => this.scenario()?.scoring);

  ngOnInit(): void {
    void this.scenarios.load();
  }
}
