"""Génère les assets provisoires du prototype (engin + cône) et exporte les GLB.

Usage :
    blender --background --factory-startup --python blender/build_assets.py

Conventions : voir blender/README.md et la section 8 du document de conception.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = ROOT / "apps" / "web" / "public" / "models"
BLENDER_DIR = ROOT / "blender"


# --------------------------------------------------------------------------- #
# Utilitaires
# --------------------------------------------------------------------------- #


def reset_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    scene.unit_settings.length_unit = "METERS"


def make_material(
    name: str,
    hex_color: str,
    *,
    metallic: float = 0.0,
    roughness: float = 0.6,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*hex_to_rgb(hex_color), 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return material


def hex_to_rgb(value: str) -> tuple[float, float, float]:
    value = value.lstrip("#")
    channels = [int(value[index : index + 2], 16) / 255.0 for index in (0, 2, 4)]
    # glTF/Blender attend une couleur linéaire ; les valeurs sRGB ci-dessus restent
    # une approximation acceptable pour des matériaux de prototype.
    return tuple(channel**2.2 for channel in channels)  # type: ignore[return-value]


def add_box(
    name: str,
    dimensions: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    obj.scale = dimensions
    apply_rotation_and_scale(obj)
    obj.data.materials.append(material)
    return obj


def add_cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 32,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    apply_rotation_and_scale(obj)
    obj.data.materials.append(material)
    return obj


def apply_rotation_and_scale(obj: bpy.types.Object) -> None:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)


def add_bevel(obj: bpy.types.Object, width: float, segments: int = 2) -> None:
    modifier = obj.modifiers.new(name="biseau", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def join_into(target: bpy.types.Object, others: list[bpy.types.Object]) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in [target, *others]:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    target.name = target.name.split(".")[0]
    target.data.name = target.name
    return target


def select_everything(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root


def export_glb(root: bpy.types.Object, filepath: Path) -> None:
    select_everything(root)
    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


def save_blend(filepath: Path) -> None:
    bpy.ops.wm.save_as_mainfile(filepath=str(filepath), check_existing=False)


# --------------------------------------------------------------------------- #
# Engin
# --------------------------------------------------------------------------- #


def build_engine() -> None:
    reset_scene()

    body_material = make_material("engin_corps", "#e0a526", roughness=0.55)
    cabin_material = make_material("engin_cabine", "#d9d9d9", roughness=0.45)
    wheel_material = make_material("engin_roue", "#2f2f2f", roughness=0.9)
    blade_material = make_material("engin_lame", "#6b7280", metallic=0.6, roughness=0.4)

    # Châssis : 1,6 m de large, 2,6 m de long, base à 0,45 m (rayon des roues).
    chassis = add_box("corps", (1.6, 2.6, 0.6), (0.0, 0.0, 0.75), body_material)

    # Lame frontale (côté −Y) : rend l'avant identifiable à l'écran.
    blade = add_box("lame", (2.0, 0.35, 0.5), (0.0, -1.55, 0.4), blade_material)
    blade.rotation_euler.x = math.radians(-12)
    apply_rotation_and_scale(blade)
    join_into(chassis, [blade])
    add_bevel(chassis, 0.04)

    # Cabine : 1,2 m de large, 0,9 m de haut, légèrement en arrière.
    cabin = add_box("cabine", (1.2, 1.1, 0.9), (0.0, 0.15, 1.5), cabin_material)
    add_bevel(cabin, 0.05)

    # Roues : axe le long de X, rayon 0,45 m, largeur 0,4 m.
    # Avant = −Y ; quand on regarde vers −Y, la gauche est +X.
    wheels = [
        ("roue_AVG", 0.85, -0.85),
        ("roue_AVD", -0.85, -0.85),
        ("roue_ARG", 0.85, 0.85),
        ("roue_ARD", -0.85, 0.85),
    ]
    wheel_objects = []
    for name, x, y in wheels:
        wheel = add_cylinder(
            name,
            radius=0.45,
            depth=0.4,
            location=(x, y, 0.45),
            material=wheel_material,
            rotation=(0.0, math.radians(90), 0.0),
        )
        add_bevel(wheel, 0.02)
        wheel_objects.append(wheel)

    # Racine : vide à l'origine, au niveau du sol.
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.active_object
    root.name = "engin"

    for child in [chassis, cabin, *wheel_objects]:
        child.parent = root
        child.matrix_parent_inverse.identity()

    save_blend(BLENDER_DIR / "engin.blend")
    export_glb(root, MODELS_DIR / "engin.glb")
    print(f"[assets] engin exporté : {MODELS_DIR / 'engin.glb'}")


# --------------------------------------------------------------------------- #
# Cône
# --------------------------------------------------------------------------- #


def build_cone() -> None:
    reset_scene()

    cone_material = make_material("cone_corps", "#e2622b", roughness=0.7)
    base_material = make_material("cone_base", "#3f3f46", roughness=0.9)

    bpy.ops.mesh.primitive_cone_add(
        vertices=24,
        radius1=0.28,
        radius2=0.03,
        depth=0.7,
        location=(0.0, 0.0, 0.35),
    )
    cone = bpy.context.active_object
    cone.name = "cone"
    cone.data.name = "cone"
    apply_rotation_and_scale(cone)
    cone.data.materials.append(cone_material)

    base = add_box("cone_base", (0.55, 0.55, 0.04), (0.0, 0.0, 0.02), base_material)
    cone = join_into(cone, [base])

    # Origine au centre de la base : le curseur est déjà à l'origine du monde.
    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.objects.active = cone
    bpy.ops.object.select_all(action="DESELECT")
    cone.select_set(True)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

    save_blend(BLENDER_DIR / "cone.blend")
    export_glb(cone, MODELS_DIR / "cone.glb")
    print(f"[assets] cône exporté : {MODELS_DIR / 'cone.glb'}")


def main() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    BLENDER_DIR.mkdir(parents=True, exist_ok=True)
    build_engine()
    build_cone()


if __name__ == "__main__":
    main()
