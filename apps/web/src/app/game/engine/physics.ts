import HavokPhysics from '@babylonjs/havok';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsMotionType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { PhysicsBody } from '@babylonjs/core/Physics/v2/physicsBody';
import { PhysicsShapeBox } from '@babylonjs/core/Physics/v2/physicsShape';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import type { Scene } from '@babylonjs/core/scene';
// Enregistre `scene.enablePhysics` (l'import est un effet de bord volontaire).
import '@babylonjs/core/Physics/physicsEngineComponent';

/** Le WASM est copié dans `public/havok/` par `scripts/copy-havok.mjs`. */
const HAVOK_WASM_URL = '/havok/HavokPhysics.wasm';

const GROUND_SIZE = 60;
const WALL_HEIGHT = 2;
const WALL_THICKNESS = 1;
const VEHICLE_MASS = 1200;
const CONE_MASS = 2;

export type BoxBounds = {
  /** Centre de la boîte, dans le repère local du nœud. */
  center: Vector3;
  /** Dimensions complètes de la boîte. */
  extents: Vector3;
};

/**
 * Charge le module WebAssembly de Havok, puis active la physique de la scène avec la gravité
 * terrestre. À appeler avant de créer le moindre corps.
 */
export async function enableHavokPhysics(scene: Scene): Promise<void> {
  const havok = await HavokPhysics({ locateFile: () => HAVOK_WASM_URL });
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
}

/** Sol statique : une boîte invisible dont la face supérieure coïncide avec le sol visuel (y = 0). */
export function createGroundBody(scene: Scene): PhysicsBody {
  const ground = createStaticBox(
    scene,
    'ground-collider',
    new Vector3(0, -0.5, 0),
    new Vector3(GROUND_SIZE, 1, GROUND_SIZE),
  );

  // Parois invisibles en limite de terrain : sans elles, l'engin et les cônes percutés
  // quittent le sol et tombent indéfiniment.
  const inner = GROUND_SIZE / 2;
  const offset = inner + WALL_THICKNESS / 2;
  // Murs nord/sud : longs sur X ; murs est/ouest : longs sur Z.
  const extentsAlongX = new Vector3(GROUND_SIZE + 2 * WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
  const extentsAlongZ = new Vector3(WALL_THICKNESS, WALL_HEIGHT, GROUND_SIZE + 2 * WALL_THICKNESS);
  const height = WALL_HEIGHT / 2;

  createStaticBox(scene, 'wall-north', new Vector3(0, height, -offset), extentsAlongX);
  createStaticBox(scene, 'wall-south', new Vector3(0, height, offset), extentsAlongX);
  createStaticBox(scene, 'wall-west', new Vector3(-offset, height, 0), extentsAlongZ);
  createStaticBox(scene, 'wall-east', new Vector3(offset, height, 0), extentsAlongZ);

  return ground;
}

/** Corps statique invisible à partir de dimensions explicites (boîte centrée sur `position`). */
function createStaticBox(
  scene: Scene,
  name: string,
  position: Vector3,
  extents: Vector3,
): PhysicsBody {
  const box: AbstractMesh = CreateBox(
    name,
    { width: extents.x, height: extents.y, depth: extents.z },
    scene,
  );
  box.position.copyFrom(position);
  box.isVisible = false;
  box.isPickable = false;

  const body = new PhysicsBody(box, PhysicsMotionType.STATIC, false, scene);
  body.shape = new PhysicsShapeBox(Vector3.Zero(), Quaternion.Identity(), extents, scene);
  body.shape.material = { friction: 0.8, restitution: 0.05 };
  body.setMassProperties({ mass: 0 });

  return body;
}

/**
 * Corps dynamique de l'engin : collider boîte, avec une inertie infinie autour des axes
 * horizontaux pour qu'il ne puisse pas se renverser. Seul le lacet reste libre.
 * La détection de collision est activée pour émettre les `CONE_HIT`.
 */
export function createVehicleBody(scene: Scene, root: TransformNode): PhysicsBody {
  const bounds = localBounds(root);

  const body = new PhysicsBody(root, PhysicsMotionType.DYNAMIC, false, scene);
  body.shape = new PhysicsShapeBox(bounds.center, Quaternion.Identity(), bounds.extents, scene);
  body.shape.material = { friction: 0.2, restitution: 0.1 };
  body.setMassProperties({
    mass: VEHICLE_MASS,
    // Docs Babylon : une inertie nulle sur un axe vaut une inertie infinie sur cet axe.
    inertia: new Vector3(0, 1, 0),
    centerOfMass: bounds.center.clone(),
  });
  body.setLinearDamping(0.05);
  body.setAngularDamping(0.6);
  body.setCollisionCallbackEnabled(true);

  return body;
}

/** Corps dynamique léger pour chaque cône du scénario. */
export function createConeBody(scene: Scene, root: TransformNode): PhysicsBody {
  const bounds = localBounds(root);

  const body = new PhysicsBody(root, PhysicsMotionType.DYNAMIC, false, scene);
  body.shape = new PhysicsShapeBox(bounds.center, Quaternion.Identity(), bounds.extents, scene);
  body.shape.material = { friction: 0.4, restitution: 0.15 };
  body.setMassProperties({ mass: CONE_MASS });
  body.setLinearDamping(0.2);
  body.setAngularDamping(0.4);

  return body;
}

/**
 * Boîte englobante d'un nœud et de sa descendance, exprimée dans son repère local.
 * La position et l'orientation du nœud sont neutralisées le temps du calcul, puis restaurées.
 */
function localBounds(root: TransformNode): BoxBounds {
  const position = root.position.clone();
  const rotation = root.rotation.clone();
  const rotationQuaternion = root.rotationQuaternion?.clone() ?? null;

  root.position.setAll(0);
  root.rotation.setAll(0);
  root.rotationQuaternion = null;
  root.computeWorldMatrix(true);

  const { min, max } = root.getHierarchyBoundingVectors(true);

  root.position.copyFrom(position);
  root.rotation.copyFrom(rotation);
  root.rotationQuaternion = rotationQuaternion;
  root.computeWorldMatrix(true);

  return {
    center: Vector3.Center(min, max),
    extents: max.subtract(min),
  };
}
