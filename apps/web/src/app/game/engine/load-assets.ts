import type { Scenario } from '@chantier/domain';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Passe à true quand `engin.glb` et `cone.glb` sont présents dans `public/models/`.
 * Tant que les assets Blender n'existent pas, la scène utilise des primitives.
 */
export const USE_GLB_ASSETS = false;

const ENGINE_URL = '/models/engin.glb';
const CONE_URL = '/models/cone.glb';

export type GameAssets = {
  /** Racine de l'engin : la déplacer suffit à déplacer tout le véhicule. */
  engineRoot: TransformNode;
  /** Cônes indexés par l'identifiant du scénario (utilisé pour les collisions à l'étape 5). */
  cones: Map<string, AbstractMesh>;
  /** true si les GLB Blender ont été chargés, false si les primitives sont utilisées. */
  usesGlb: boolean;
};

export async function loadAssets(scene: Scene, scenario: Scenario): Promise<GameAssets> {
  return USE_GLB_ASSETS ? loadGlbAssets(scene, scenario) : createPlaceholderAssets(scene, scenario);
}

function createPlaceholderAssets(scene: Scene, scenario: Scenario): GameAssets {
  const bodyMaterial = solidMaterial(scene, 'engin-body', '#e0a526');
  const cabinMaterial = solidMaterial(scene, 'engin-cabin', '#d9d9d9');
  const wheelMaterial = solidMaterial(scene, 'engin-wheel', '#2f2f2f');
  const coneMaterial = solidMaterial(scene, 'cone-material', '#e2622b');

  const engineRoot = new TransformNode('engin', scene);
  engineRoot.position.set(scenario.start.x, 0, scenario.start.z);
  engineRoot.rotation.y = (scenario.start.headingDeg * Math.PI) / 180;

  const chassis = CreateBox('corps', { width: 1.6, height: 0.6, depth: 2.6 }, scene);
  chassis.position.y = 0.75;
  chassis.parent = engineRoot;
  chassis.material = bodyMaterial;

  const cabin = CreateBox('cabine', { width: 1.2, height: 0.9, depth: 1.1 }, scene);
  cabin.position.set(0, 1.5, 0.15);
  cabin.parent = engineRoot;
  cabin.material = cabinMaterial;

  const wheelPositions: Array<[name: string, x: number, z: number]> = [
    ['roue_AVG', -0.85, 0.85],
    ['roue_AVD', 0.85, 0.85],
    ['roue_ARG', -0.85, -0.85],
    ['roue_ARD', 0.85, -0.85],
  ];

  for (const [name, x, z] of wheelPositions) {
    const wheel = CreateCylinder(name, { diameter: 0.9, height: 0.4, tessellation: 20 }, scene);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.45, z);
    wheel.parent = engineRoot;
    wheel.material = wheelMaterial;
  }

  const cones = new Map<string, AbstractMesh>();
  for (const coneDefinition of scenario.cones) {
    const cone = CreateCylinder(
      `cone-${coneDefinition.id}`,
      { diameterTop: 0, diameterBottom: 0.6, height: 0.9, tessellation: 20 },
      scene,
    );
    cone.position.set(coneDefinition.x, 0.45, coneDefinition.z);
    cone.material = coneMaterial;
    cone.metadata = { coneId: coneDefinition.id };
    cones.set(coneDefinition.id, cone);
  }

  return { engineRoot, cones, usesGlb: false };
}

async function loadGlbAssets(scene: Scene, scenario: Scenario): Promise<GameAssets> {
  const [{ ImportMeshAsync }] = await Promise.all([
    import('@babylonjs/core/Loading/sceneLoader'),
    import('@babylonjs/loaders/glTF'),
  ]);

  const engineImport = await ImportMeshAsync(ENGINE_URL, scene);
  const engineRoot =
    engineImport.transformNodes.find((node) => node.name === 'engin') ?? engineImport.meshes[0];

  if (!engineRoot) {
    throw new Error(`Le fichier ${ENGINE_URL} ne contient aucun maillage exploitable.`);
  }

  engineRoot.name = 'engin';
  engineRoot.position.set(scenario.start.x, 0, scenario.start.z);
  engineRoot.rotation.y = (scenario.start.headingDeg * Math.PI) / 180;

  const coneImport = await ImportMeshAsync(CONE_URL, scene);
  const coneTemplate = coneImport.meshes[0];

  if (!coneTemplate) {
    throw new Error(`Le fichier ${CONE_URL} ne contient aucun maillage exploitable.`);
  }

  const cones = new Map<string, AbstractMesh>();
  for (const coneDefinition of scenario.cones) {
    const clone = coneTemplate.clone(`cone-${coneDefinition.id}`, null, true);
    if (!clone) continue;

    clone.position.set(coneDefinition.x, 0, coneDefinition.z);
    clone.metadata = { coneId: coneDefinition.id };
    cones.set(coneDefinition.id, clone);
  }

  // Le maillage modèle ne doit pas rester visible à l'origine.
  coneTemplate.setEnabled(false);

  return { engineRoot, cones, usesGlb: true };
}

function solidMaterial(scene: Scene, name: string, hexColor: string): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hexColor);
  material.specularColor = Color3.Black();
  return material;
}

/** Utilisé par l'étape 5 pour retrouver l'identifiant d'un cône depuis un maillage. */
export function coneIdOf(mesh: AbstractMesh): string | undefined {
  const metadata = mesh.metadata as { coneId?: string } | null | undefined;
  return metadata?.coneId;
}
