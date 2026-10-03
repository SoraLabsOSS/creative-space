"use client";

import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";

import type { CreativeItem } from "@/data/items";

import { EASE_POWER3_OUT, EASE_POWER4_OUT } from "./creative-space-constants";

interface BottomInfoProps {
  activeItem: CreativeItem | null;
}

export const BottomInfo = ({ activeItem }: BottomInfoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const [displayedItem, setDisplayedItem] = useState(activeItem);
  const pendingItemRef = useRef(activeItem);
  const currentItemRef = useRef(activeItem);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    pendingItemRef.current = activeItem;

    const runStep = () => {
      const target = pendingItemRef.current;
      const { current } = currentItemRef;

      if (target?.id === current?.id && Boolean(target) === Boolean(current)) {
        isAnimatingRef.current = false;
        return;
      }

      isAnimatingRef.current = true;

      // Sequential Exit: animate current text upwards with stagger
      if (current && titleRef.current && subtitleRef.current) {
        gsap.to([titleRef.current, subtitleRef.current], {
          duration: 0.28,
          ease: "power2.in",
          onComplete: () => {
            const next = pendingItemRef.current;
            if (next) {
              currentItemRef.current = next;
              setDisplayedItem(next);

              if (titleRef.current && subtitleRef.current) {
                gsap.set([titleRef.current, subtitleRef.current], {
                  opacity: 0,
                  yPercent: 100,
                });
                gsap.to([titleRef.current, subtitleRef.current], {
                  duration: 0.45,
                  ease: EASE_POWER4_OUT,
                  onComplete: runStep,
                  opacity: 1,
                  stagger: 0.05,
                  yPercent: 0,
                });
              } else {
                isAnimatingRef.current = false;
              }
            } else {
              currentItemRef.current = null;
              isAnimatingRef.current = false;
              if (containerRef.current) {
                gsap.to(containerRef.current, {
                  duration: 0.25,
                  ease: EASE_POWER3_OUT,
                  opacity: 0,
                  y: 8,
                });
              }
            }
          },
          opacity: 0,
          stagger: 0.04,
          yPercent: -100,
        });
        return;
      }

      // Initial Entrance: animate first text from below
      if (target) {
        currentItemRef.current = target;
        setDisplayedItem(target);

        if (containerRef.current) {
          gsap.to(containerRef.current, {
            duration: 0.3,
            ease: EASE_POWER3_OUT,
            opacity: 1,
            y: 0,
          });
        }

        if (titleRef.current && subtitleRef.current) {
          gsap.set([titleRef.current, subtitleRef.current], {
            opacity: 0,
            yPercent: 100,
          });
          gsap.to([titleRef.current, subtitleRef.current], {
            duration: 0.45,
            ease: EASE_POWER4_OUT,
            onComplete: runStep,
            opacity: 1,
            stagger: 0.05,
            yPercent: 0,
          });
        } else {
          isAnimatingRef.current = false;
        }
        return;
      }

      isAnimatingRef.current = false;
    };

    if (!isAnimatingRef.current) {
      runStep();
    }
  }, [activeItem]);

  return (
    <div
      ref={containerRef}
      style={{ opacity: 0, transform: "translateY(8px)" }}
      className="pointer-events-none absolute bottom-5 z-20 flex w-full flex-col items-center gap-1.5 select-none max-sm:bottom-[calc(2rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex items-end justify-center gap-2 whitespace-nowrap lg:translate-y-2">
        <div className="overflow-hidden">
          <h3
            ref={titleRef}
            className="font-lay-grotesk text-xs leading-[140%] text-black"
          >
            {displayedItem?.title}
          </h3>
        </div>
        <div className="overflow-hidden">
          <p
            ref={subtitleRef}
            className="font-teodor text-[13px]/[1.4] text-black/60"
          >
            {displayedItem?.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
