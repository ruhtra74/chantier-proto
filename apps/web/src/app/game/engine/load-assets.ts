import type { Scenario } from '@chantier/domain';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { Scene } from '@babylonjs/core/scene';
import { setHeading } from './transform';

/**
 * Assets Blender chargés depuis `public/models/` (générés par `blender/build_assets.py`).
 * Repasser à false pour revenir aux primitives de repli.
 */
export const USE_GLB_ASSETS = true;

const ENGINE_URL = '/models/engin.glb';
const CONE_URL = '/models/cone.glb';

export type GameAssets = {
  /** Racine de l'engin : la déplacer suffit à déplacer tout le véhicule. */
  engineRoot: TransformNode;
  /** Racines des cônes indexées par l'identifiant du scénario (utilisées à l'étape 5). */
  cones: Map<string, TransformNode>;
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
  setHeading(engineRoot, (scenario.start.headingDeg * Math.PI) / 180);

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

  const cones = new Map<string, TransformNode>();
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
  const importedEngine = findImportedNode(engineImport, 'engin', ENGINE_URL);

  // Le chargeur glTF enveloppe le modèle dans un nœud `__root__` qui porte la conversion
  // d'axes (échelle négative). La physique pilote un nœud racine à transformation propre :
  // on enveloppe donc le modèle dans un conteneur, sans jamais appliquer cette échelle
  // négative au nœud qui porte le corps physique (Havok l'interpréterait comme un miroir).
  const engineModel =
    importedEngine.parent instanceof TransformNode ? importedEngine.parent : importedEngine;
  engineModel.name = 'engin-modele';

  const engineRoot = new TransformNode('engin', scene);
  engineModel.parent = engineRoot;
  engineRoot.position.set(scenario.start.x, 0, scenario.start.z);
  setHeading(engineRoot, (scenario.start.headingDeg * Math.PI) / 180);

  const coneImport = await ImportMeshAsync(CONE_URL, scene);
  const coneRoot = findImportedNode(coneImport, 'cone', CONE_URL);

  const cones = new Map<string, TransformNode>();
  for (const coneDefinition of scenario.cones) {
    // Le cône peut être un maillage simple ou un nœud parent (plusieurs matériaux) :
    // dans les deux cas on clone toute la hiérarchie.
    const clone = coneRoot.clone(`cone-${coneDefinition.id}`, null);
    if (!clone) continue;

    clone.position.set(coneDefinition.x, 0, coneDefinition.z);
    clone.metadata = { coneId: coneDefinition.id };
    cones.set(coneDefinition.id, clone);
  }

  // Le modèle source ne doit pas rester visible à l'origine.
  coneRoot.setEnabled(false);

  return { engineRoot, cones, usesGlb: true };
}

/**
 * Retrouve un nœud exporté par Blender. Le chargeur glTF place les objets sans géométrie
 * (comme le vide `engin`) dans `transformNodes`, tandis qu'un maillage simple apparaît dans
 * `meshes`. On cherche donc dans les deux listes, sans renommer un enfant au passage.
 */
function findImportedNode(
  imported: { transformNodes: TransformNode[]; meshes: AbstractMesh[] },
  name: string,
  fileUrl: string,
): TransformNode {
  const node =
    imported.transformNodes.find((candidate) => candidate.name === name) ??
    imported.meshes.find((candidate) => candidate.name === name);

  if (node) return node;

  throw new Error(`Le fichier ${fileUrl} ne contient aucune racine « ${name} ».`);
}

function solidMaterial(scene: Scene, name: string, hexColor: string): StandardMaterial {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = Color3.FromHexString(hexColor);
  material.specularColor = Color3.Black();
  return material;
}

/**
 * Utilisé par l'étape 5 pour retrouver l'identifiant d'un cône depuis n'importe quel nœud
 * de sa hiérarchie (le GLB peut exposer un parent et des enfants par matériau).
 */
export function coneIdOf(node: TransformNode): string | undefined {
  let current: TransformNode | null = node;

  while (current) {
    const metadata = current.metadata as { coneId?: string } | null | undefined;
    if (metadata?.coneId) return metadata.coneId;
    current = current.parent instanceof TransformNode ? current.parent : null;
  }

  return undefined;
}
