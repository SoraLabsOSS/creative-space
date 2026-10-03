import { gsap } from "gsap";
import type { Texture } from "three";
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  DoubleSide,
  Group,
  LinearFilter,
  LoadingManager,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { CREATIVE_ITEMS } from "@/data/items";
import type { CreativeItem } from "@/data/items";

import {
  CENTER_SCALE_FACTOR,
  CIRCLE_SPIN_RAD,
  EASE_POWER2_IN,
  EASE_POWER2_INOUT,
  EASE_POWER3_OUT,
  EASE_POWER4_OUT,
  EXPAND_FADE,
  EXPAND_HEIGHT_VH,
  EXPAND_PUSH,
  FAST_SPIN_MULT,
  INTRO_CIRC_COUNT,
  LOGO_ORBIT_RADIUS,
  LOGO_SIZE,
  MOBILE_CIRCLE_SCALE,
  RADIUS_BASE,
  SPIN_TILT_DEG,
  STACK_GAP,
  TOTAL_ITEMS_COUNT,
  getFibonacciPoint,
  getPlaneBaseSize,
  toWorldSize,
} from "./creative-space-constants";
import type { CardMeshState } from "./creative-space-types";

export interface EngineElements {
  container: HTMLDivElement;
  counterEl: HTMLElement | null;
  sideWordsEl: HTMLElement | null;
  centerTextEl: HTMLElement | null;
}

export interface EngineCallbacks {
  onIntroComplete: () => void;
  onActiveItemChange: (item: CreativeItem | null) => void;
}

const applyCoverAspect = (texture: Texture, imgW: number, imgH: number) => {
  if (!imgW || !imgH) {
    return;
  }
  const aspect = imgW / imgH;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  if (aspect > 0.75) {
    const repeatX = 0.75 / aspect;
    texture.repeat.set(repeatX, 1);
    texture.offset.set((1 - repeatX) / 2, 0);
  } else {
    const repeatY = aspect / 0.75;
    texture.repeat.set(1, repeatY);
    texture.offset.set(0, (1 - repeatY) / 2);
  }
};

const createFallbackTexture = (id: number): CanvasTexture => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 341;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 341);
    grad.addColorStop(0, "#1f1f1f");
    grad.addColorStop(1, "#0d0d0d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 341);
    ctx.fillStyle = "#ffffff";
    ctx.font = "500 24px LayGrotesk, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(id).padStart(2, "0"), 128, 175);
  }
  const fallbackTex = new CanvasTexture(canvas);
  fallbackTex.colorSpace = SRGBColorSpace;
  return fallbackTex;
};

const setCardExpand = (card: CardMeshState, targetValue: number) => {
  gsap.to(card, {
    duration: 0.8,
    ease: EASE_POWER4_OUT,
    expand: targetValue,
    overwrite: true,
  });
};

export const initCreativeSpaceEngine = (
  elements: EngineElements,
  callbacks: EngineCallbacks
) => {
  const { container, counterEl, sideWordsEl, centerTextEl } = elements;
  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || window.innerHeight;
  let containerRect = container.getBoundingClientRect();

  // GSAP Context ensures complete teardown on unmount
  const gsapCtx = gsap.context(() => null);

  const scene = new Scene();
  const camera = new PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.z = 12;

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: !isTouch,
    powerPreference: "high-performance",
  });

  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height, false);
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  for (const c of container.querySelectorAll("canvas")) {
    c.remove();
  }
  container.append(renderer.domElement);

  const sphereGroup = new Group();
  scene.add(sphereGroup);

  // Asset Loading Manager to track actual loading progress
  const loadingManager = new LoadingManager();
  const textureLoader = new TextureLoader(loadingManager);
  textureLoader.setCrossOrigin("anonymous");

  // Track fonts readiness as an asset item in the loading manager
  loadingManager.itemStart("fonts");
  void (async () => {
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }
    } finally {
      loadingManager.itemEnd("fonts");
    }
  })();

  const planeGeom = new PlaneGeometry(1, 1);
  const cardStates: CardMeshState[] = [];
  const meshesForRaycast: Mesh[] = [];

  let currentPlanePixelSize = getPlaneBaseSize(width);
  let centerScalePixel = currentPlanePixelSize * CENTER_SCALE_FACTOR;

  const itemsCount = Math.min(TOTAL_ITEMS_COUNT, CREATIVE_ITEMS.length);
  for (let i = 0; i < itemsCount; i += 1) {
    const item = CREATIVE_ITEMS[i];
    const material = new MeshBasicMaterial({
      depthWrite: false,
      side: DoubleSide,
      transparent: true,
    });

    const mesh = new Mesh(planeGeom, material);
    sphereGroup.add(mesh);
    meshesForRaycast.push(mesh);

    const state: CardMeshState = {
      aspect: item.aspect,
      basePos: new Vector3(),
      baseScale: new Vector3(1, 1, 1),
      collapse: 0,
      expStartPos: new Vector3(),
      expStartScale: { x: 1, y: 1 },
      expand: 0,
      explode: 0,
      inCircle: false,
      index: i,
      item,
      material,
      mesh,
      preCollapseScaleX: 0.01,
      preCollapseScaleY: 0.01,
      stackZ: 0,
    };

    cardStates.push(state);

    textureLoader.load(
      item.src,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter;
        tex.magFilter = LinearFilter;
        if (tex.image) {
          applyCoverAspect(tex, tex.image.width, tex.image.height);
        }
        material.map = tex;
        material.needsUpdate = true;
      },
      undefined,
      () => {
        material.map = createFallbackTexture(item.id);
        material.needsUpdate = true;
      }
    );
  }

  const recomputePositions = () => {
    const isMobile = width <= 640;
    const scaleMultiplier = width >= 1025 && width <= 1440 ? 0.8 : 1;
    currentPlanePixelSize = getPlaneBaseSize(width);
    centerScalePixel = currentPlanePixelSize * CENTER_SCALE_FACTOR;

    const worldPlaneSize = toWorldSize(
      currentPlanePixelSize,
      camera.position.z,
      camera.fov,
      height
    );

    const worldRadius = toWorldSize(
      RADIUS_BASE * scaleMultiplier,
      camera.position.z,
      camera.fov,
      height
    );

    for (let i = 0; i < cardStates.length; i += 1) {
      const card = cardStates[i];
      const dir = getFibonacciPoint(i, cardStates.length);

      if (isMobile) {
        const mobileRadius = Math.max(
          0,
          ((width - 48) / 2) *
            ((2 *
              camera.position.z *
              Math.tan((camera.fov * Math.PI) / 360) *
              camera.aspect) /
              width) -
            worldPlaneSize / 2
        );
        card.basePos.set(
          dir.x * mobileRadius,
          dir.y * mobileRadius,
          dir.z * mobileRadius
        );
      } else {
        card.basePos.set(
          dir.x * worldRadius,
          dir.y * worldRadius,
          dir.z * worldRadius
        );
      }

      const ar = card.aspect;
      if (ar >= 1) {
        card.baseScale.set(worldPlaneSize, worldPlaneSize / ar, 1);
      } else {
        card.baseScale.set(worldPlaneSize * ar, worldPlaneSize, 1);
      }
    }
  };

  recomputePositions();

  // Intro staging
  let isIntroPhase = true;
  let circleAngle = 0;
  const fastSpinState = { ramp: 0 };
  const circleCards: CardMeshState[] = [];

  for (let i = 0; i < INTRO_CIRC_COUNT && i < cardStates.length; i += 1) {
    const card = cardStates[i];
    card.inCircle = true;
    card.mesh.visible = false;
    card.material.opacity = 0;
    card.mesh.scale.set(0.01, 0.01, 1);
    circleCards.push(card);
  }

  for (let i = INTRO_CIRC_COUNT; i < cardStates.length; i += 1) {
    const card = cardStates[i];
    card.inCircle = false;
    card.mesh.visible = false;
    card.material.opacity = 0;
  }

  const updateCircleCardPos = (index: number, target: Vector3) => {
    const mobileScale = width <= 640 ? MOBILE_CIRCLE_SCALE : 1;
    const orbitRadWorld =
      toWorldSize(LOGO_ORBIT_RADIUS, camera.position.z, camera.fov, height) *
      mobileScale;
    const angle = ((-90 + 36 * index) * Math.PI) / 180 + circleAngle;
    target.set(
      Math.cos(angle) * orbitRadWorld,
      Math.sin(angle) * orbitRadWorld,
      0
    );
  };

  const sideWords = sideWordsEl
    ? [...sideWordsEl.querySelectorAll("[data-side-word]")]
    : [];

  // 1. Initial entrance of UI text
  gsapCtx.add(() => {
    if (counterEl) {
      gsap.to(counterEl, {
        delay: 0.5,
        duration: 0.75,
        ease: EASE_POWER4_OUT,
        yPercent: -100,
      });
    }

    if (sideWords.length > 0) {
      gsap.fromTo(
        sideWords,
        { opacity: 0, yPercent: 100 },
        {
          delay: 0.5,
          duration: 0.9,
          ease: EASE_POWER4_OUT,
          opacity: 1,
          stagger: 0.07,
          yPercent: 0,
        }
      );
    }

    if (centerTextEl) {
      gsap.fromTo(
        centerTextEl,
        { opacity: 0, yPercent: 100 },
        {
          delay: 0.5,
          duration: 0.9,
          ease: EASE_POWER4_OUT,
          opacity: 1,
          yPercent: 0,
        }
      );
    }
  });

  // Second-order physics state
  let targetYaw = 0;
  let targetPitch = 0;
  let smoothYaw = 0;
  let smoothPitch = 0;
  let velYaw = 0;
  let velPitch = 0;
  let prevYaw = 0;
  let prevPitch = 0;
  let hasInteracted = false;
  let isPostExplodeSpin = false;
  let postExplodeSpeed = 0;
  const currentSpinAxis = new Vector3(0, 0, 1);
  const tiltedSpinAxis = new Vector3(0, 1, 0);

  // Compute tilted spin axis (23 degrees)
  const computeTiltAxis = () => {
    const rad = (SPIN_TILT_DEG * Math.PI) / 180;
    tiltedSpinAxis.set(Math.sin(rad), Math.cos(rad), 0).normalize();
  };
  computeTiltAxis();

  const sphereQuat = new Quaternion();
  const deltaQuat = new Quaternion();
  const axisY = new Vector3(0, 1, 0);
  const axisX = new Vector3(1, 0, 0);

  let isCollapsing = false;

  // Reveal stage triggered strictly when assets reach 100% and minimum intro time has elapsed
  const triggerRevealStage = () => {
    // Slide counter out
    if (counterEl) {
      gsapCtx.add(() => {
        gsap.to(counterEl, {
          duration: 0.7,
          ease: EASE_POWER4_OUT,
          yPercent: -200,
        });
      });
    }

    // 10 Cards animate in on circle orbit
    const mobileScale = width <= 640 ? MOBILE_CIRCLE_SCALE : 1;
    const worldLogoSize =
      toWorldSize(LOGO_SIZE, camera.position.z, camera.fov, height) *
      mobileScale;

    for (let i = 0; i < circleCards.length; i += 1) {
      const card = circleCards[i];
      updateCircleCardPos(i, card.mesh.position);
      const ar = card.aspect;
      const targetScaleX = ar >= 1 ? worldLogoSize : worldLogoSize * ar;
      const targetScaleY = ar >= 1 ? worldLogoSize / ar : worldLogoSize;

      card.mesh.visible = true;
      gsapCtx.add(() => {
        gsap.fromTo(
          card.material,
          { opacity: 0 },
          {
            delay: i * 0.1,
            duration: 1,
            ease: EASE_POWER3_OUT,
            opacity: 1,
          }
        );

        gsap.fromTo(
          card.mesh.scale,
          { x: 0.01, y: 0.01 },
          {
            delay: i * 0.1,
            duration: 1,
            ease: "back.out(1.7)",
            x: targetScaleX,
            y: targetScaleY,
          }
        );
      });
    }

    // Timers managed by gsap.delayedCall inside gsapCtx
    gsapCtx.add(() => {
      // Fast spin (1.3s)
      gsap.delayedCall(1.3, () => {
        gsap.to(fastSpinState, {
          duration: 1,
          ease: EASE_POWER2_IN,
          ramp: 1,
        });
      });

      // Collapse (2.1s)
      gsap.delayedCall(2.1, () => {
        isCollapsing = true;

        if (centerTextEl) {
          gsap.to(centerTextEl, {
            duration: 0.75,
            ease: EASE_POWER4_OUT,
            opacity: 0,
            yPercent: -100,
          });
        }

        if (sideWords.length > 0) {
          gsap.to(sideWords, {
            duration: 0.75,
            ease: EASE_POWER4_OUT,
            opacity: 0,
            stagger: 0.07,
            yPercent: -100,
          });
        }

        const worldStackGap = toWorldSize(
          STACK_GAP,
          camera.position.z,
          camera.fov,
          height
        );

        for (let i = 0; i < circleCards.length; i += 1) {
          const card = circleCards[i];
          card.stackZ = i * worldStackGap;
          card.mesh.renderOrder = 20 + i;
          card.preCollapseScaleX = card.mesh.scale.x;
          card.preCollapseScaleY = card.mesh.scale.y;

          gsap.to(card, {
            collapse: 1,
            delay: i * 0.05,
            duration: 1.25,
            ease: EASE_POWER2_INOUT,
          });
        }
      });

      // Explode (4s)
      gsap.delayedCall(4, () => {
        isIntroPhase = false;
        callbacks.onIntroComplete();

        window.__creativeSpaceExploded = true;
        window.dispatchEvent(new CustomEvent("creativespace:explode"));

        isPostExplodeSpin = true;
        postExplodeSpeed = 0.001;
        currentSpinAxis.copy(tiltedSpinAxis);

        const centerWorldSize = toWorldSize(
          centerScalePixel,
          camera.position.z,
          camera.fov,
          height
        );

        for (const card of cardStates) {
          card.expStartPos = card.mesh.position.clone();
          card.expStartScale = { x: card.mesh.scale.x, y: card.mesh.scale.y };

          if (!card.inCircle) {
            const ar = card.aspect;
            card.expStartScale = {
              x: ar >= 1 ? centerWorldSize : centerWorldSize * ar,
              y: ar >= 1 ? centerWorldSize / ar : centerWorldSize,
            };
            card.expStartPos.set(0, 0, 0);
            card.material.opacity = 1;
          }

          card.explode = 0;
          card.mesh.visible = true;
          card.mesh.renderOrder = 0;

          gsap.to(card, {
            duration: 1,
            ease: EASE_POWER3_OUT,
            explode: 1,
          });
        }
      });
    });
  };

  // 2. Real asset loading sync with minimum intro duration
  let rawProgress = 0;
  let isAssetsLoaded = false;
  let isMinTimeElapsed = false;
  let hasTriggeredReveal = false;
  const progressState = { value: 1 };

  const updateCounterText = () => {
    if (counterEl) {
      const current = Math.min(
        100,
        Math.max(1, Math.round(progressState.value))
      );
      counterEl.textContent = String(current).padStart(3, "0");
    }
  };

  const checkAndTriggerReveal = () => {
    if (
      isAssetsLoaded &&
      isMinTimeElapsed &&
      Math.round(progressState.value) >= 100 &&
      !hasTriggeredReveal
    ) {
      hasTriggeredReveal = true;
      triggerRevealStage();
    }
  };

  const syncProgressTween = () => {
    const maxCap = isAssetsLoaded ? 100 : 99;
    const target =
      isAssetsLoaded && isMinTimeElapsed ? 100 : Math.min(rawProgress, maxCap);

    gsapCtx.add(() => {
      gsap.to(progressState, {
        duration: target === 100 ? 0.6 : 0.4,
        ease: "power2.out",
        onComplete: checkAndTriggerReveal,
        onUpdate: updateCounterText,
        overwrite: "auto",
        value: target,
      });
    });
  };

  loadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
    rawProgress = itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 100;
    syncProgressTween();
  };

  loadingManager.onLoad = () => {
    isAssetsLoaded = true;
    rawProgress = 100;
    syncProgressTween();
  };

  // Minimum intro duration of 1.4s ensures polished entrance visual
  gsapCtx.add(() => {
    gsap.delayedCall(1.4, () => {
      isMinTimeElapsed = true;
      syncProgressTween();
      checkAndTriggerReveal();
    });
  });

  // Interaction variables
  let isDragging = false;
  let prevPointerX = 0;
  let prevPointerY = 0;
  let startX = 0;
  let startY = 0;
  let totalDragDist = 0;

  const raycaster = new Raycaster();
  const pointerNDC = new Vector2(-100, -100);
  let isPointerInside = false;
  let lastClientX = 0;
  let lastClientY = 0;
  let needsRaycast = false;

  let expandedCard: CardMeshState | null = null;
  let hoveredCard: CardMeshState | null = null;

  const handlePointerDown = (e: PointerEvent) => {
    if (isIntroPhase) {
      return;
    }
    containerRect = container.getBoundingClientRect();
    isDragging = true;
    hasInteracted = true;
    prevPointerX = e.clientX;
    prevPointerY = e.clientY;
    startX = e.clientX;
    startY = e.clientY;
    totalDragDist = 0;
    container.style.cursor = expandedCard ? "pointer" : "grabbing";
  };

  const handlePointerMove = (e: PointerEvent) => {
    lastClientX = e.clientX;
    lastClientY = e.clientY;

    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    pointerNDC.x = (x / containerRect.width) * 2 - 1;
    pointerNDC.y = -(y / containerRect.height) * 2 + 1;
    isPointerInside =
      x >= 0 && x <= containerRect.width && y >= 0 && y <= containerRect.height;

    if (!isIntroPhase && !isDragging && !expandedCard) {
      needsRaycast = true;
    }

    if (isDragging && !expandedCard) {
      const dx = e.clientX - prevPointerX;
      const dy = e.clientY - prevPointerY;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      totalDragDist += Math.hypot(dx, dy);

      velYaw += dx * 0.001;
      velPitch += dy * 0.001;
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (isIntroPhase) {
      return;
    }
    const clickDist = Math.hypot(e.clientX - startX, e.clientY - startY);

    if (clickDist < 6 && totalDragDist < 10) {
      if (expandedCard) {
        setCardExpand(expandedCard, 0);
        expandedCard = null;
        hoveredCard = null;
        callbacks.onActiveItemChange(null);
      } else {
        const rect = container.getBoundingClientRect();
        containerRect = rect;
        pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNDC.y = -(((e.clientY - rect.top) / rect.height) * 2) + 1;
        raycaster.setFromCamera(pointerNDC, camera);
        const intersects = raycaster.intersectObjects(meshesForRaycast, false);
        const hit =
          intersects.length > 0
            ? cardStates.find((c) => c.mesh === intersects[0].object)
            : null;

        if (hit) {
          setCardExpand(hit, 1);
          expandedCard = hit;
          hoveredCard = hit;
          callbacks.onActiveItemChange(hit.item);
        }
      }
    }

    isDragging = false;
    container.style.cursor = expandedCard ? "pointer" : "grab";
  };

  const handleWheel = (e: WheelEvent) => {
    if (isIntroPhase || expandedCard) {
      return;
    }
    e.preventDefault();
    hasInteracted = true;
    velYaw += e.deltaY * 0.0002;
  };

  const handleResize = () => {
    if (!container) {
      return;
    }
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || window.innerHeight;
    containerRect = container.getBoundingClientRect();
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    recomputePositions();
  };

  window.addEventListener("resize", handleResize);
  container.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  container.addEventListener("wheel", handleWheel, { passive: false });

  let animFrameId = 0;
  const tempPos = new Vector3();
  const invQuat = new Quaternion();
  const targetCenterPos = new Vector3();

  const updateCardPositionAndScale = (
    card: CardMeshState,
    maxExpand: number,
    expandedTargetH: number
  ) => {
    card.mesh.quaternion.copy(invQuat);

    if (card.explode < 1) {
      const t = card.explode;
      const overshoot = 1 + 0.1 * Math.sin(Math.PI * t);
      card.mesh.position.set(
        (card.expStartPos.x + (card.basePos.x - card.expStartPos.x) * t) *
          overshoot,
        (card.expStartPos.y + (card.basePos.y - card.expStartPos.y) * t) *
          overshoot,
        (card.expStartPos.z + (card.basePos.z - card.expStartPos.z) * t) *
          overshoot
      );
      const bScaleX = card.baseScale.x;
      const bScaleY = card.baseScale.y;
      const expScaleX = card.expStartScale.x;
      const expScaleY = card.expStartScale.y;
      card.mesh.scale.set(
        expScaleX + (bScaleX - expScaleX) * t,
        expScaleY + (bScaleY - expScaleY) * t,
        1
      );
      return;
    }

    // Fast path: When cards are static and unexpanded, reuse base vectors directly
    if (maxExpand <= 0.0001 && card.expand <= 0.0001) {
      if (card.material.opacity !== 1) {
        card.material.opacity = 1;
        card.mesh.renderOrder = 0;
      }
      card.mesh.position.copy(card.basePos);
      card.mesh.scale.copy(card.baseScale);
      return;
    }

    const t = card.expand;
    const targetW = expandedTargetH * card.aspect;

    const scaleX = card.baseScale.x + (targetW - card.baseScale.x) * t;
    const scaleY = card.baseScale.y + (expandedTargetH - card.baseScale.y) * t;
    card.mesh.scale.set(scaleX, scaleY, 1);

    const pushMultiplier = 1 + (EXPAND_PUSH - 1) * maxExpand;
    const push = t > 0.001 ? 1 : pushMultiplier;

    const baseX = card.basePos.x * push;
    const baseY = card.basePos.y * push;
    const baseZ = card.basePos.z * push;

    card.mesh.position.set(
      baseX + (targetCenterPos.x - baseX) * t,
      baseY + (targetCenterPos.y - baseY) * t,
      baseZ + (targetCenterPos.z - baseZ) * t
    );

    if (t > 0.001) {
      card.material.opacity = 1;
      card.mesh.renderOrder = 100;
    } else {
      card.material.opacity = 1 + (EXPAND_FADE - 1) * maxExpand;
      card.mesh.renderOrder = 0;
    }
  };

  const renderIntroOrbit = () => {
    const speedMult = 1 + (FAST_SPIN_MULT - 1) * fastSpinState.ramp;
    circleAngle += CIRCLE_SPIN_RAD * speedMult;

    const centerWorld = toWorldSize(
      centerScalePixel,
      camera.position.z,
      camera.fov,
      height
    );

    for (let i = 0; i < circleCards.length; i += 1) {
      const card = circleCards[i];
      if (isCollapsing) {
        updateCircleCardPos(i, tempPos);
        const n = card.collapse;
        card.mesh.position.set(
          tempPos.x * (1 - n),
          tempPos.y * (1 - n),
          card.stackZ * n
        );
        const ar = card.aspect;
        const targetW = ar >= 1 ? centerWorld : centerWorld * ar;
        const targetH = ar >= 1 ? centerWorld / ar : centerWorld;
        card.mesh.scale.set(
          card.preCollapseScaleX + (targetW - card.preCollapseScaleX) * n,
          card.preCollapseScaleY + (targetH - card.preCollapseScaleY) * n,
          1
        );
      } else {
        updateCircleCardPos(i, card.mesh.position);
        card.preCollapseScaleX = card.mesh.scale.x;
        card.preCollapseScaleY = card.mesh.scale.y;
      }
    }
  };

  const renderInteractiveSphere = () => {
    targetYaw += velYaw;
    targetPitch += velPitch;
    velYaw *= 0.94;
    velPitch *= 0.94;

    smoothYaw += (targetYaw - smoothYaw) * 0.11;
    smoothPitch += (targetPitch - smoothPitch) * 0.11;

    const deltaYaw = smoothYaw - prevYaw;
    const deltaPitch = smoothPitch - prevPitch;
    prevYaw = smoothYaw;
    prevPitch = smoothPitch;

    deltaQuat.setFromAxisAngle(axisY, deltaYaw);
    sphereQuat.premultiply(deltaQuat);
    deltaQuat.setFromAxisAngle(axisX, deltaPitch);
    sphereQuat.premultiply(deltaQuat);

    if (!hasInteracted && !expandedCard) {
      deltaQuat.setFromAxisAngle(tiltedSpinAxis, 0.001);
      sphereQuat.premultiply(deltaQuat);
    }

    if (isPostExplodeSpin) {
      if (Math.abs(postExplodeSpeed) > 1e-7) {
        deltaQuat.setFromAxisAngle(currentSpinAxis, postExplodeSpeed);
        sphereQuat.premultiply(deltaQuat);
      }
      currentSpinAxis.lerp(tiltedSpinAxis, 0.004).normalize();
      postExplodeSpeed += (0.001 - postExplodeSpeed) * 0.004;
      if (
        currentSpinAxis.distanceToSquared(tiltedSpinAxis) < 1e-6 &&
        Math.abs(postExplodeSpeed - 0.001) < 1e-7
      ) {
        isPostExplodeSpin = false;
      }
      if (hasInteracted) {
        isPostExplodeSpin = false;
      }
    }

    sphereQuat.normalize();
    sphereGroup.quaternion.copy(sphereQuat);
    invQuat.copy(sphereQuat).invert();
    targetCenterPos.set(0, 0, 0).applyQuaternion(invQuat);

    let maxExpand = 0;
    for (const card of cardStates) {
      if (card.expand > maxExpand) {
        maxExpand = card.expand;
      }
    }

    const worldHeightAtCam =
      2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const expandedTargetH = (EXPAND_HEIGHT_VH / 100) * worldHeightAtCam;

    for (const card of cardStates) {
      updateCardPositionAndScale(card, maxExpand, expandedTargetH);
    }
  };

  const performRaycastHoverCheck = () => {
    if (!isPointerInside) {
      if (hoveredCard) {
        hoveredCard = null;
        callbacks.onActiveItemChange(null);
        container.style.cursor = "default";
      }
      return;
    }

    raycaster.setFromCamera(pointerNDC, camera);
    const intersects = raycaster.intersectObjects(meshesForRaycast, false);
    if (intersects.length > 0) {
      const hit = cardStates.find((c) => c.mesh === intersects[0].object);
      if (hit && hit !== hoveredCard) {
        hoveredCard = hit;
        callbacks.onActiveItemChange(hit.item);
      }
      container.style.cursor = "pointer";
      return;
    }

    if (hoveredCard) {
      hoveredCard = null;
      callbacks.onActiveItemChange(null);
    }
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const distFromCenter = Math.hypot(
      lastClientX - containerRect.left - centerX,
      lastClientY - containerRect.top - centerY
    );
    container.style.cursor = distFromCenter <= RADIUS_BASE ? "grab" : "default";
  };

  const animateLoop = () => {
    animFrameId = requestAnimationFrame(animateLoop);

    // Throttled raycasting: execute at most once per frame and only when cursor moved
    if (needsRaycast && !isIntroPhase && !isDragging && !expandedCard) {
      needsRaycast = false;
      performRaycastHoverCheck();
    }

    if (isIntroPhase) {
      renderIntroOrbit();
    } else {
      renderInteractiveSphere();
    }

    renderer.render(scene, camera);
  };

  animFrameId = requestAnimationFrame(animateLoop);

  return () => {
    cancelAnimationFrame(animFrameId);
    gsapCtx.revert();

    window.removeEventListener("resize", handleResize);
    container.removeEventListener("pointerdown", handlePointerDown);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    container.removeEventListener("wheel", handleWheel);

    planeGeom.dispose();
    for (const card of cardStates) {
      if (card.material.map) {
        card.material.map.dispose();
      }
      card.material.dispose();
    }
    renderer.dispose();
    renderer.domElement.remove();
  };
};
