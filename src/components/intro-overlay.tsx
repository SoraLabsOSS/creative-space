import type { RefObject } from "react";

interface IntroOverlayProps {
  counterRef: RefObject<HTMLParagraphElement | null>;
  sideWordsRef: RefObject<HTMLDivElement | null>;
  centerTextRef: RefObject<HTMLDivElement | null>;
  isComplete: boolean;
}

export const IntroOverlay = ({
  counterRef,
  sideWordsRef,
  centerTextRef,
  isComplete,
}: IntroOverlayProps) => {
  if (isComplete) {
    return null;
  }

  return (
    <>
      {/* Side words (Left & Right) matching reference layout */}
      <div
        ref={sideWordsRef}
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-between px-[9%] select-none max-[1025px]:hidden"
      >
        <span className="font-lay-grotesk flex gap-[0.3em] text-[14px] leading-[1.4] text-black">
          <span className="inline-block overflow-hidden">
            <span data-side-word="true" className="inline-block opacity-0">
              Sora
            </span>
          </span>
          <span className="inline-block overflow-hidden">
            <span data-side-word="true" className="inline-block opacity-0">
              Labs
            </span>
          </span>
        </span>
        <span className="font-teodor flex gap-[0.3em] text-[14px] leading-[1.4] text-black">
          <span className="inline-block overflow-hidden">
            <span data-side-word="true" className="inline-block opacity-0">
              Creative
            </span>
          </span>
          <span className="inline-block overflow-hidden">
            <span data-side-word="true" className="inline-block opacity-0">
              Space
            </span>
          </span>
        </span>
      </div>

      {/* Center 90px brand logo */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center select-none">
        <div className="flex h-22.5 w-22.5 items-center justify-center">
          <span className="inline-block overflow-hidden">
            <span
              ref={centerTextRef}
              style={{ opacity: 0 }}
              className="font-lay-grotesk inline-block text-xs font-medium tracking-[0.25em] text-black uppercase"
            >
              SR .L
            </span>
          </span>
        </div>
      </div>

      {/* Bottom counter 001 */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 overflow-hidden select-none">
        <p
          ref={counterRef}
          className="font-teodor text-base leading-none text-black"
          style={{ transform: "translateY(100%)" }}
        >
          001
        </p>
      </div>
    </>
  );
};
