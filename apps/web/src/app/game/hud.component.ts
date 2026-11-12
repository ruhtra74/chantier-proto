import { Component, input } from '@angular/core';

/**
 * HUD de la partie. Il ne calcule rien : toutes les valeurs viennent du domaine via
 * `GameCanvasComponent`, qui les met à jour au rythme des commandes `UPDATE_HUD` (10 Hz au plus).
 */
@Component({
  selector: 'app-hud',
  templateUrl: './hud.component.html',
  styleUrl: './hud.component.css',
})
export class HudComponent {
  readonly fps = input(0);
  readonly fuel = input(0);
  readonly distance = input(0);
  readonly conesHit = input(0);
  readonly placeholderAssets = input(false);
}
