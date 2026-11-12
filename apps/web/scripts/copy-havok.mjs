// Copie le WASM de Havok depuis node_modules vers les ressources statiques servies par Angular.
// La source de vérité reste la version épinglée dans package.json : aucune copie n'est versionnée.

import { copyFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const source = require.resolve('@babylonjs/havok/lib/esm/HavokPhysics.wasm');
const publicDirectory = fileURLToPath(new URL('../public/havok/', import.meta.url));

await mkdir(publicDirectory, { recursive: true });
await copyFile(source, join(publicDirectory, 'HavokPhysics.wasm'));
console.log('Havok WASM copié vers public/havok/HavokPhysics.wasm');
