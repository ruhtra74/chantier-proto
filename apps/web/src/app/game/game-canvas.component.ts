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
import { updateChaseCamera } from './engine/camera';
import { createScene } from './engine/create-scene';
import { KeyboardInput } from './engine/input';
import { toggleInspector } from './engine/inspector';
import type { GameAssets } from './engine/load-assets';
import { USE_GLB_ASSETS, loadAssets } from './engine/load-assets';
import { VehicleController } from './engine/vehicle';

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
  readonly distance = signal(0);
  readonly error = signal<string | null>(null);
  readonly placeholderAssets = !USE_GLB_ASSETS;

  private engine?: Engine;
  private scene?: Scene;
  private input?: KeyboardInput;
  private assets?: GameAssets;
  private vehicle?: VehicleController;
  private fpsTimer?: number;
  private destroyed = false;

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

    const { scene, camera } = createScene(engine, scenario);
    this.scene = scene;

    const input = new KeyboardInput(() => {
      void toggleInspector(scene);
    });
    this.input = input;

    void loadAssets(scene, scenario)
      .then((assets) => {
        if (this.destroyed) return;

        this.assets = assets;
        this.vehicle = new VehicleController(assets.engineRoot, input, (event) => {
          if (this.destroyed) return;
          if (event.type === 'MOVED') {
            this.distance.update((total) => total + event.distance);
          }
        });
        updateChaseCamera(camera, assets.engineRoot, 0, true);
      })
      .catch((error: unknown) => {
        if (this.destroyed) return;
        console.error('Échec du chargement des assets', error);
        this.error.set(
          `Impossible de charger les assets : ${error instanceof Error ? error.message : String(error)}`,
        );
      });

    window.addEventListener('resize', this.handleResize);
    this.fpsTimer = window.setInterval(() => {
      this.fps.set(Math.round(engine.getFps()));
    }, 500);

    // La boucle de rendu tourne hors de la détection de changements Angular.
    // En mode zoneless, cette précaution reste utile si le mode zone est réactivé.
    this.zone.runOutsideAngular(() => {
      engine.runRenderLoop(() => {
        const deltaSeconds = Math.min(engine.getDeltaTime() / 1000, 0.1);

        this.vehicle?.update(deltaSeconds);
        if (this.assets) {
          updateChaseCamera(camera, this.assets.engineRoot, deltaSeconds);
        }

        scene.render();
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;

    if (this.fpsTimer !== undefined) {
      window.clearInterval(this.fpsTimer);
      this.fpsTimer = undefined;
    }

    window.removeEventListener('resize', this.handleResize);
    this.input?.dispose();
    this.input = undefined;
    this.vehicle = undefined;
    this.assets = undefined;

    this.engine?.stopRenderLoop();
    this.scene?.dispose();
    this.scene = undefined;
    this.engine?.dispose();
    this.engine = undefined;
  }
}
