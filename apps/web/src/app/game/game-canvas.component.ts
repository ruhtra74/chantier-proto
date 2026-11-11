import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { getScenario } from '@chantier/domain';
import { Engine } from '@babylonjs/core/Engines/engine';
import type { Scene } from '@babylonjs/core/scene';
import { createScene } from './engine/create-scene';
import { KeyboardInput } from './engine/input';
import { toggleInspector } from './engine/inspector';
import { USE_GLB_ASSETS, loadAssets } from './engine/load-assets';

@Component({
  selector: 'app-game-canvas',
  templateUrl: './game-canvas.component.html',
  styleUrl: './game-canvas.component.css',
})
export class GameCanvasComponent implements AfterViewInit, OnDestroy {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly scenario = getScenario('chantier-1');

  readonly fps = signal(0);
  readonly error = signal<string | null>(null);
  readonly placeholderAssets = !USE_GLB_ASSETS;

  private engine?: Engine;
  private scene?: Scene;
  private input?: KeyboardInput;
  private fpsTimer?: number;

  private readonly handleResize = (): void => {
    this.engine?.resize();
  };

  ngAfterViewInit(): void {
    const scenario = this.scenario;
    if (!scenario) {
      this.error.set('Scénario « chantier-1 » introuvable dans le paquet domain.');
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const engine = new Engine(canvas, true, { stencil: true }, true);
    this.engine = engine;

    const { scene } = createScene(engine, canvas, scenario);
    this.scene = scene;

    void loadAssets(scene, scenario).catch((error: unknown) => {
      console.error('Échec du chargement des assets', error);
      this.error.set(
        `Impossible de charger les assets : ${error instanceof Error ? error.message : String(error)}`,
      );
    });

    this.input = new KeyboardInput(() => {
      void toggleInspector(scene);
    });

    window.addEventListener('resize', this.handleResize);
    this.fpsTimer = window.setInterval(() => {
      this.fps.set(Math.round(engine.getFps()));
    }, 500);

    // La boucle de rendu tourne hors de la détection de changements Angular.
    // En mode zoneless, cette précaution reste utile si le mode zone est réactivé.
    this.zone.runOutsideAngular(() => {
      engine.runRenderLoop(() => {
        scene.render();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.fpsTimer !== undefined) {
      window.clearInterval(this.fpsTimer);
      this.fpsTimer = undefined;
    }

    window.removeEventListener('resize', this.handleResize);
    this.input?.dispose();
    this.input = undefined;

    this.engine?.stopRenderLoop();
    this.scene?.dispose();
    this.scene = undefined;
    this.engine?.dispose();
    this.engine = undefined;
  }
}
