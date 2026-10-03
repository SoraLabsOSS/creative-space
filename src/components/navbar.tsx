"use client";

import { gsap } from "gsap";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useEffect, useRef } from "react";

interface NavItem {
  label: string;
  path: string;
  width: number;
}

interface ItemElements {
  root: HTMLAnchorElement | null;
  spacer: HTMLDivElement | null;
  sup: HTMLElement | null;
  text: HTMLDivElement | null;
}

const BG_DEFAULT = "rgba(237, 237, 237, 0.5)";
const BG_HOVER = "rgba(216, 216, 216, 0.5)";
const EASE_POWER4_OUT = "power4.out";

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Creative Space", path: "/", width: 94 },
  { label: "Projects", path: "/projects", width: 52 },
] as const;

const getActiveIndex = (currentPath: string): number => {
  const matchIndex = NAV_ITEMS.findIndex((item) => item.path === currentPath);
  if (matchIndex !== -1) {
    return matchIndex;
  }
  if (currentPath.startsWith("/projects")) {
    return 1;
  }
  return 0;
};

const handleItemHover = (e: MouseEvent<HTMLElement>) => {
  if (typeof window === "undefined" || window.innerWidth <= 1024) {
    return;
  }
  gsap.to(e.currentTarget, {
    backgroundColor: BG_HOVER,
    duration: 0.35,
    ease: "power2.out",
    overwrite: "auto",
  });
};

const handleItemLeave = (e: MouseEvent<HTMLElement>) => {
  if (typeof window === "undefined" || window.innerWidth <= 1024) {
    return;
  }
  gsap.to(e.currentTarget, {
    backgroundColor: BG_DEFAULT,
    duration: 0.5,
    ease: "power3.inOut",
    overwrite: "auto",
  });
};

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = getActiveIndex(pathname);

  const navRef = useRef<HTMLElement>(null);
  const githubBtnRef = useRef<HTMLAnchorElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const itemElementsRef = useRef<ItemElements[]>([]);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    for (const item of NAV_ITEMS) {
      try {
        router.prefetch(item.path);
      } catch {
        // Fallback for environments where prefetch fails
      }
    }
  }, [router]);

  useEffect(() => {
    const animate = !isFirstRenderRef.current;

    for (let i = 0; i < NAV_ITEMS.length; i += 1) {
      const item = NAV_ITEMS[i];
      const elements = itemElementsRef.current[i];
      if (!elements?.root || !elements.spacer || !elements.text) {
        continue;
      }

      const isActive = i === activeIndex;
      const spacerWidth = isActive ? item.width : 0;
      const textLeft = isActive ? 12 : -(12 + item.width);
      const supWidth = elements.sup?.getBoundingClientRect().width ?? 0;
      const defaultPadding = Math.max(0, (20 - supWidth) / 2);
      const padding = isActive ? 12 : defaultPadding;

      const animationOptions = {
        duration: animate ? 0.6 : 0,
        ease: EASE_POWER4_OUT,
        overwrite: true,
      };

      gsap.to(elements.spacer, {
        ...animationOptions,
        marginRight: isActive ? 3 : 0,
        width: spacerWidth,
      });

      gsap.to(elements.text, {
        ...animationOptions,
        left: textLeft,
      });

      gsap.to(elements.root, {
        ...animationOptions,
        paddingLeft: padding,
        paddingRight: padding,
      });
    }

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
    }
  }, [activeIndex]);

  // Entrance animation synchronized with intro explode
  useEffect(() => {
    const nav = navRef.current;
    const btn = githubBtnRef.current;
    if (!nav) {
      return;
    }

    gsap.killTweensOf([nav, btn]);

    const isHome = pathname === "/";

    if (!isHome || window.__creativeSpaceExploded) {
      gsap.set(nav, { yPercent: 0 });
      if (btn) {
        gsap.set(btn, { yPercent: 0 });
      }
      nav.style.visibility = "";
      return () => {
        gsap.killTweensOf([nav, btn]);
      };
    }

    gsap.set(nav, { yPercent: -250 });
    if (btn) {
      gsap.set(btn, { yPercent: -250 });
    }
    nav.style.visibility = "";

    const handleExplode = () => {
      gsap.killTweensOf([nav, btn]);
      gsap.to(nav, {
        duration: 1.2,
        ease: EASE_POWER4_OUT,
        yPercent: 0,
      });
      if (btn) {
        gsap.to(btn, {
          duration: 1.2,
          ease: EASE_POWER4_OUT,
          yPercent: 0,
        });
      }
    };

    window.addEventListener("creativespace:explode", handleExplode, {
      once: true,
    });

    return () => {
      window.removeEventListener("creativespace:explode", handleExplode);
      gsap.killTweensOf([nav, btn]);
    };
  }, [pathname]);

  // Sync floating brand logo with nav anchor position
  useEffect(() => {
    let prevLeft: number | null = null;
    let prevTop: number | null = null;

    const syncPosition = () => {
      if (!anchorRef.current || !brandRef.current) {
        return;
      }
      const rect = anchorRef.current.getBoundingClientRect();
      if (rect.left !== prevLeft || rect.top !== prevTop) {
        prevLeft = rect.left;
        prevTop = rect.top;
        brandRef.current.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
        if (brandRef.current.style.visibility === "hidden") {
          brandRef.current.style.visibility = "";
        }
      }
    };

    syncPosition();
    gsap.ticker.add(syncPosition);

    return () => {
      gsap.ticker.remove(syncPosition);
    };
  }, []);

  return (
    <>
      <noscript>
        <style>{`nav[data-navbar]{visibility:visible!important}`}</style>
      </noscript>

      <nav
        ref={navRef}
        data-navbar
        aria-label="Main"
        className="pointer-events-none fixed top-2 left-0 z-9999 flex w-full items-center justify-center text-xs"
        style={{ visibility: "hidden" }}
      >
        <div className="flex items-center gap-3.5">
          <span
            ref={anchorRef}
            className="font-lay-grotesk invisible cursor-default text-sm"
            aria-hidden="true"
          >
            SR .L
          </span>

          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item, index) => (
              <Link
                key={item.path}
                ref={(node) => {
                  itemElementsRef.current[index] = {
                    ...itemElementsRef.current[index],
                    root: node,
                  };
                }}
                href={item.path}
                aria-current={activeIndex === index ? "page" : undefined}
                draggable={false}
                onMouseEnter={handleItemHover}
                onMouseLeave={handleItemLeave}
                style={{
                  backgroundColor: BG_DEFAULT,
                  paddingLeft: activeIndex === index ? 12 : 7,
                  paddingRight: activeIndex === index ? 12 : 7,
                }}
                className="pointer-events-auto relative flex cursor-pointer items-end self-stretch overflow-hidden rounded-sm py-1.5 backdrop-blur-2xl"
              >
                <div
                  ref={(node) => {
                    itemElementsRef.current[index] = {
                      ...itemElementsRef.current[index],
                      spacer: node,
                    };
                  }}
                  style={{
                    height: 9,
                    marginRight: activeIndex === index ? 3 : 0,
                    width: activeIndex === index ? item.width : 0,
                  }}
                />
                <div
                  ref={(node) => {
                    itemElementsRef.current[index] = {
                      ...itemElementsRef.current[index],
                      text: node,
                    };
                  }}
                  className="font-teodor absolute top-1.5 text-[15px]/[110%] whitespace-nowrap"
                  style={{
                    left: activeIndex === index ? 12 : -(12 + item.width),
                  }}
                >
                  {item.label}
                </div>
                <sup
                  ref={(node) => {
                    itemElementsRef.current[index] = {
                      ...itemElementsRef.current[index],
                      sup: node,
                    };
                  }}
                  className="translate-y-0.5 text-[11px]/[140%]"
                >
                  {index + 1}
                </sup>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <Link
        ref={brandRef}
        href="/"
        aria-label="SR .L — home"
        draggable={false}
        className="font-lay-grotesk pointer-events-auto fixed top-0 left-0 z-9999 cursor-pointer text-sm text-white mix-blend-exclusion"
        style={{ visibility: "hidden" }}
      >
        SR .L
      </Link>

      <a
        ref={githubBtnRef}
        href="https://github.com/SoraLabsOSS/creative-space"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub repository"
        style={{ backgroundColor: BG_DEFAULT }}
        onMouseEnter={handleItemHover}
        onMouseLeave={handleItemLeave}
        className="fixed top-2 right-2 z-9999 flex cursor-pointer items-center justify-center rounded-sm px-2 py-1.5 text-black backdrop-blur-2xl max-[1024px]:hidden"
      >
        <div className="flex h-3 w-3 items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </div>
      </a>
    </>
  );
};
