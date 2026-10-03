import type { Mesh, MeshBasicMaterial, Vector3 } from "three";

import type { CreativeItem } from "@/data/items";

export interface CardMeshState {
  aspect: number;
  basePos: Vector3;
  baseScale: Vector3;
  collapse: number;
  expStartPos: Vector3;
  expStartScale: { x: number; y: number };
  expand: number;
  explode: number;
  inCircle: boolean;
  index: number;
  item: CreativeItem;
  material: MeshBasicMaterial;
  mesh: Mesh;
  preCollapseScaleX: number;
  preCollapseScaleY: number;
  stackZ: number;
}
