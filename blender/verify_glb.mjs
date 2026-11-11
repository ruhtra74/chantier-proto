#!/usr/bin/env node
// Vérifie les métadonnées d'un GLB sans navigateur : hiérarchie, matériaux, triangles, bbox.
//
// Usage : node blender/verify_glb.mjs apps/web/public/models/engin.glb ...

import { readFileSync } from "node:fs";
import { basename } from "node:path";

const JSON_CHUNK = 0x4e4f534a;
const TRIANGLES = 4;

function readGlb(path) {
  const buffer = readFileSync(path);
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) {
    throw new Error(`${path} n'est pas un fichier GLB (magic invalide).`);
  }
  const version = buffer.readUInt32LE(4);
  const totalLength = buffer.readUInt32LE(8);
  if (totalLength !== buffer.length) {
    throw new Error(`${path} : longueur annoncée ${totalLength} ≠ ${buffer.length}.`);
  }

  let offset = 12;
  let json;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (chunkType === JSON_CHUNK) {
      json = JSON.parse(buffer.subarray(start, start + chunkLength).toString("utf8"));
    }
    offset = start + chunkLength;
  }

  if (!json) throw new Error(`${path} : chunk JSON absent.`);
  return { version, json };
}

function primitiveTriangles(primitive, accessors) {
  if (primitive.mode !== undefined && primitive.mode !== TRIANGLES) return 0;
  const count =
    primitive.indices !== undefined
      ? accessors[primitive.indices].count
      : accessors[primitive.attributes.POSITION].count;
  return Math.floor(count / 3);
}

function nodeBounds(node, mesh, json) {
  if (!mesh) return null;
  const accessors = json.accessors ?? [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (const primitive of mesh.primitives) {
    const accessor = accessors[primitive.attributes.POSITION];
    if (!accessor?.min || !accessor?.max) continue;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], accessor.min[axis]);
      max[axis] = Math.max(max[axis], accessor.max[axis]);
    }
  }

  const translation = node.translation ?? [0, 0, 0];
  const round = (value) => Math.round(value * 1000) / 1000;
  return {
    min: min.map((value, axis) => round(value + translation[axis])),
    max: max.map((value, axis) => round(value + translation[axis])),
  };
}

function inspect(path) {
  const { version, json } = readGlb(path);
  const nodes = json.nodes ?? [];
  const meshes = json.meshes ?? [];
  const materials = json.materials ?? [];
  const accessors = json.accessors ?? [];

  console.log(`\n=== ${basename(path)} (glTF ${version}, ${nodes.length} nœuds) ===`);

  let totalTriangles = 0;
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };

  const visit = (index, depth) => {
    const node = nodes[index];
    const mesh = node.mesh !== undefined ? meshes[node.mesh] : undefined;
    const triangles = mesh
      ? mesh.primitives.reduce(
          (sum, primitive) => sum + primitiveTriangles(primitive, accessors),
          0,
        )
      : 0;
    totalTriangles += triangles;

    const details = [];
    if (mesh) details.push(`${triangles} triangles`);
    if (node.translation) {
      details.push(`position ${node.translation.map((value) => Math.round(value * 1000) / 1000)}`);
    }
    console.log(
      `${"  ".repeat(depth)}- ${node.name ?? `nœud ${index}`}${details.length ? ` (${details.join(", ")})` : ""}`,
    );

    const nodeBox = nodeBounds(node, mesh, json);
    if (nodeBox) {
      for (let axis = 0; axis < 3; axis += 1) {
        bounds.min[axis] = Math.min(bounds.min[axis], nodeBox.min[axis]);
        bounds.max[axis] = Math.max(bounds.max[axis], nodeBox.max[axis]);
      }
    }

    for (const child of node.children ?? []) visit(child, depth + 1);
  };

  const scene = json.scenes?.[json.scene ?? 0];
  for (const index of scene?.nodes ?? nodes.map((_, index) => index)) visit(index, 0);

  for (const material of materials) {
    const color = material.pbrMetallicRoughness?.baseColorFactor?.map(
      (value) => Math.round(value * 1000) / 1000,
    );
    console.log(
      `  matériau: ${material.name ?? "(sans nom)"} ${color ? JSON.stringify(color) : ""}`,
    );
  }

  const round = (value) => Math.round(value * 1000) / 1000;
  const size = bounds.min.map((value, axis) => round(bounds.max[axis] - value));
  console.log(`  bbox min ${bounds.min.map(round)} max ${bounds.max.map(round)} taille ${size}`);
  console.log(`  total ${totalTriangles} triangles`);

  return { totalTriangles, size };
}

let failed = false;
for (const path of process.argv.slice(2)) {
  try {
    const { totalTriangles } = inspect(path);
    const isCone = basename(path).toLowerCase().includes("cone");
    const budget = isCone ? 500 : 5000;
    if (totalTriangles > budget) {
      console.error(`  ✗ budget dépassé : ${totalTriangles} > ${budget} triangles`);
      failed = true;
    }
  } catch (error) {
    console.error(`✗ ${path} : ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
