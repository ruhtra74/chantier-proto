import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getScenario } from '@chantier/domain';

/** Écran d'accueil : consignes et règles, puis lancement de la partie. */
@Component({
  selector: 'app-start-screen',
  imports: [RouterLink],
  templateUrl: './start-screen.component.html',
  styleUrl: './start-screen.component.css',
})
export class StartScreenComponent {
  private readonly scenario = getScenario('chantier-1');

  readonly target = this.scenario?.target;
  readonly coneCount = this.scenario?.cones.length ?? 0;
  readonly fuelCapacity = this.scenario?.fuel.capacity ?? 0;
  readonly consumptionPerMeter = this.scenario?.fuel.consumptionPerMeter ?? 0;
  readonly scoring = this.scenario?.scoring;
}
