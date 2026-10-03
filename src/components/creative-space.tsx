"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CreativeItem } from "@/data/items";

import { BottomInfo } from "./bottom-info";
import { initCreativeSpaceEngine } from "./creative-space-engine";
import { IntroOverlay } from "./intro-overlay";

export const CreativeSpace = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLParagraphElement>(null);
  const sideWordsRef = useRef<HTMLDivElement>(null);
  const centerTextRef = useRef<HTMLDivElement>(null);

  const [activeItem, setActiveItem] = useState<CreativeItem | null>(null);
  const [isIntroComplete, setIsIntroComplete] = useState(false);

  const handleIntroComplete = useCallback(() => {
    setIsIntroComplete(true);
  }, []);

  const handleActiveItemChange = useCallback((item: CreativeItem | null) => {
    setActiveItem(item);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const cleanup = initCreativeSpaceEngine(
      {
        centerTextEl: centerTextRef.current,
        container,
        counterEl: counterRef.current,
        sideWordsEl: sideWordsRef.current,
      },
      {
        onActiveItemChange: handleActiveItemChange,
        onIntroComplete: handleIntroComplete,
      }
    );

    return () => {
      cleanup();
    };
  }, [handleActiveItemChange, handleIntroComplete]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden select-none"
    >
      <IntroOverlay
        centerTextRef={centerTextRef}
        counterRef={counterRef}
        isComplete={isIntroComplete}
        sideWordsRef={sideWordsRef}
      />
      <BottomInfo activeItem={activeItem} />
    </div>
  );
};
