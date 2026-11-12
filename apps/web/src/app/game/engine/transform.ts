import { Quaternion } from '@babylonjs/core/Maths/math.vector';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';

/**
 * Cap de l'engin en radians. Dès que la physique pilote le nœud, l'orientation est portée par
 * `rotationQuaternion` ; sinon (avant la physique, primitives de repli) par `rotation.y`.
 */
export function headingOf(node: TransformNode): number {
  const rotation = node.rotationQuaternion;
  if (!rotation) return node.rotation.y;

  // Lacet extrait du quaternion, valable même si une légère inclinaison subsiste.
  return Math.atan2(
    2 * (rotation.w * rotation.y + rotation.x * rotation.z),
    1 - 2 * (rotation.y * rotation.y + rotation.z * rotation.z),
  );
}

export function setHeading(node: TransformNode, heading: number): void {
  node.rotationQuaternion = Quaternion.RotationYawPitchRoll(heading, 0, 0);
}
