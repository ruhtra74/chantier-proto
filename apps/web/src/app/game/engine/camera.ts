import type { Scenario } from '@chantier/domain';
import { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { headingOf } from './transform';

/** Distance et hauteur de la caméra derrière l'engin, en mètres. */
const CAMERA_DISTANCE = 9;
const CAMERA_HEIGHT = 4.5;
/** Point visé devant l'engin, pour garder la route visible. */
const LOOK_AHEAD = 4;
const LOOK_HEIGHT = 1.2;
/** Vitesse de rattrapage (1/s) : plus grand = caméra plus rigide. */
const SMOOTHING = 6;

/**
 * Caméra de poursuite : placée derrière l'engin, elle suit sa position et son cap.
 * Le lissage évite les à-coups quand l'engin tourne.
 */
export function createChaseCamera(scene: Scene, scenario: Scenario): TargetCamera {
  const heading = (scenario.start.headingDeg * Math.PI) / 180;
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);

  const position = new Vector3(
    scenario.start.x - sin * CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    scenario.start.z - cos * CAMERA_DISTANCE,
  );
  const target = new Vector3(
    scenario.start.x + sin * LOOK_AHEAD,
    LOOK_HEIGHT,
    scenario.start.z + cos * LOOK_AHEAD,
  );

  const camera = new TargetCamera('camera', position, scene);
  camera.minZ = 0.1;
  camera.maxZ = 250;
  camera.fov = 0.85;
  camera.setTarget(target);

  return camera;
}

/**
 * Recale la caméra derrière l'engin. `snap` place la caméra directement à la position
 * voulue (utile au premier affichage ou après un redémarrage).
 */
export function updateChaseCamera(
  camera: TargetCamera,
  root: TransformNode,
  deltaSeconds: number,
  snap = false,
): void {
  const heading = headingOf(root);
  const sin = Math.sin(heading);
  const cos = Math.cos(heading);
  const position = root.position;

  const desiredPosition = new Vector3(
    position.x - sin * CAMERA_DISTANCE,
    CAMERA_HEIGHT,
    position.z - cos * CAMERA_DISTANCE,
  );
  const lookAt = new Vector3(
    position.x + sin * LOOK_AHEAD,
    LOOK_HEIGHT,
    position.z + cos * LOOK_AHEAD,
  );

  const amount = snap ? 1 : 1 - Math.exp(-SMOOTHING * Math.max(deltaSeconds, 0));
  camera.position.copyFrom(Vector3.Lerp(camera.position, desiredPosition, amount));
  camera.setTarget(lookAt);
}
