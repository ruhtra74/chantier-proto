import type { Scene } from '@babylonjs/core/scene';

let inspectorModule: Promise<typeof import('@babylonjs/inspector')> | undefined;

/**
 * Charge l'inspecteur à la demande, une seule fois.
 *
 * En modules ES6, l'inspecteur dépend de deux effets de bord qui ne sont pas tirés par ses
 * propres imports : `debugLayer` (qui ajoute `scene.debugLayer`) et `Ray` (utilisé par le
 * picking et les lignes de propriété). Sans eux, l'inspecteur se charge mais plante au premier
 * rendu. Ils sont importés avant lui, et seulement au premier appui sur `I`.
 */
function loadInspector(): Promise<typeof import('@babylonjs/inspector')> {
  inspectorModule ??= (async () => {
    await import('@babylonjs/core/Debug/debugLayer');
    await import('@babylonjs/core/Culling/ray');
    return import('@babylonjs/inspector');
  })();

  return inspectorModule;
}

/** Ouvre ou ferme l'inspecteur Babylon (touche I). */
export async function toggleInspector(scene: Scene): Promise<void> {
  const { Inspector } = await loadInspector();

  if (Inspector.IsVisible) {
    Inspector.Hide();
    return;
  }

  Inspector.Show(scene, {});
}
