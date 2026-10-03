import { Vector3 } from "three";

export const INTRO_CIRC_COUNT = 10;
export const TOTAL_ITEMS_COUNT = 18;
export const RADIUS_BASE = 250;
export const PLANE_SIZE_BASE = 82;
export const EXPAND_HEIGHT_VH = 70;
export const EXPAND_PUSH = 1.8;
export const EXPAND_FADE = 0;

export const LOGO_ORBIT_RADIUS = 240;
export const LOGO_SIZE = 70;
export const MOBILE_CIRCLE_SCALE = 0.75;
export const CENTER_SCALE_FACTOR = 120 / 82;
export const STACK_GAP = 1.5;
export const FAST_SPIN_MULT = 7.3;
export const CIRCLE_SPIN_RAD = 0.5 * (Math.PI / 180);
export const SPIN_TILT_DEG = 23;

export const EASE_POWER2_IN = "power2.in";
export const EASE_POWER2_INOUT = "power2.inOut";
export const EASE_POWER3_OUT = "power3.out";
export const EASE_POWER4_OUT = "power4.out";

export const toWorldSize = (
  pixelSize: number,
  cameraZ: number,
  fov: number,
  viewHeight: number
): number => {
  const tanHalf = Math.tan((fov * Math.PI) / 360);
  return pixelSize * ((2 * cameraZ * tanHalf) / viewHeight);
};

export const getFibonacciPoint = (index: number, total: number): Vector3 => {
  const r = 2 / total;
  const n = index * r - 1 + r / 2;
  const l = Math.sqrt(Math.max(0, 1 - n * n));
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * index;

  return new Vector3(Math.cos(theta) * l, n, Math.sin(theta) * l);
};

export const getPlaneBaseSize = (w: number): number => {
  const scaleMultiplier = w >= 1025 && w <= 1440 ? 0.8 : 1;
  const base = w <= 640 ? 60 : PLANE_SIZE_BASE;
  return base * scaleMultiplier;
};
