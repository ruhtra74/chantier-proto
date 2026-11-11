import type { Scenario } from '@chantier/domain';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Caméra d'observation provisoire (étape 3).
 * L'étape 4 la remplacera par une caméra de poursuite derrière l'engin.
 */
export function createOrbitCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  scenario: Scenario,
): ArcRotateCamera {
  const focus = new Vector3(scenario.start.x, 1, scenario.start.z + 5);
  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 3.2, 16, focus, scene);

  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 6;
  camera.upperRadiusLimit = 35;
  camera.lowerBetaLimit = 0.15;
  camera.upperBetaLimit = Math.PI / 2 - 0.05;
  camera.wheelPrecision = 25;
  camera.target.copyFrom(focus);

  return camera;
}
