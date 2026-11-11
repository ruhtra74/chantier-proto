import type { Scenario } from '@chantier/domain';
import type { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import type { Engine } from '@babylonjs/core/Engines/engine';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateDisc } from '@babylonjs/core/Meshes/Builders/discBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';
import { CreateTorus } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import { Scene } from '@babylonjs/core/scene';
import { createOrbitCamera } from './camera';

export type GameScene = {
  scene: Scene;
  camera: ArcRotateCamera;
};

/**
 * Crée la scène statique de l'étape 3 : sol, lumières, zone d'arrivée, caméra.
 * Aucune règle métier ici : les positions viennent uniquement du scénario.
 */
export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
  scenario: Scenario,
): GameScene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.62, 0.73, 0.85, 1);

  const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.85;
  hemi.groundColor = new Color3(0.28, 0.32, 0.27);

  const sun = new DirectionalLight('sun', new Vector3(-0.4, -1, -0.3), scene);
  sun.position = new Vector3(12, 20, 8);
  sun.intensity = 0.7;

  const ground = CreateGround('ground', { width: 60, height: 60 }, scene);
  ground.material = createGroundMaterial(scene);
  ground.receiveShadows = true;

  createTargetZone(scene, scenario.target);

  const camera = createOrbitCamera(scene, canvas, scenario);

  return { scene, camera };
}

/** Sol avec une grille procédurale (pas de texture externe). */
function createGroundMaterial(scene: Scene): StandardMaterial {
  const size = 512;
  const texture = new DynamicTexture('ground-grid', { width: size, height: size }, scene, false);
  const context = texture.getContext();

  context.fillStyle = '#5d7057';
  context.fillRect(0, 0, size, size);

  context.strokeStyle = '#748a6c';
  context.lineWidth = 3;
  const step = size / 8;
  for (let i = 0; i <= size; i += step) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, size);
    context.stroke();

    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(size, i);
    context.stroke();
  }

  texture.update();
  // 15 répétitions sur 60 m : une tuile de 4 m, soit des cellules de 0,5 m.
  texture.uScale = 15;
  texture.vScale = 15;

  const material = new StandardMaterial('ground-material', scene);
  material.diffuseTexture = texture;
  material.specularColor = Color3.Black();

  return material;
}

/** Disque et anneau matérialisant la zone d'arrivée du scénario. */
function createTargetZone(scene: Scene, target: Scenario['target']): void {
  const disc = CreateDisc('target-zone', { radius: target.radius, tessellation: 64 }, scene);
  disc.position.set(target.x, 0.02, target.z);
  disc.rotation.x = -Math.PI / 2;

  const discMaterial = new StandardMaterial('target-material', scene);
  discMaterial.diffuseColor = Color3.FromHexString('#2ecc71');
  discMaterial.emissiveColor = Color3.FromHexString('#1c7a43');
  discMaterial.alpha = 0.55;
  discMaterial.backFaceCulling = false;
  disc.material = discMaterial;

  const ring = CreateTorus(
    'target-ring',
    { diameter: target.radius * 2, thickness: 0.12, tessellation: 64 },
    scene,
  );
  ring.position.set(target.x, 0.06, target.z);

  const ringMaterial = new StandardMaterial('target-ring-material', scene);
  ringMaterial.diffuseColor = Color3.Black();
  ringMaterial.emissiveColor = Color3.FromHexString('#7bed9f');
  ring.material = ringMaterial;
}
