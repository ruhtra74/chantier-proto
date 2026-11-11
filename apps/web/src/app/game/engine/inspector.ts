import type { Scene } from '@babylonjs/core/scene';

/** Ouvre ou ferme l'inspecteur Babylon (touche I). Chargé à la demande. */
export async function toggleInspector(scene: Scene): Promise<void> {
  const { Inspector } = await import('@babylonjs/inspector');

  if (Inspector.IsVisible) {
    Inspector.Hide();
    return;
  }

  Inspector.Show(scene, {});
}
