import { driver, type Driver } from "driver.js";
import { useEffect } from "react";
import "driver.js/dist/driver.css";

const SEEN = "has_seen_lld_tour";

let active: Driver | null = null;
let opened = false;

export function startTour() {
  if (typeof window === "undefined") return;
  opened = true;
  active?.destroy();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tour = driver({
    showProgress: true,
    animate: !reduced,
    overlayColor: "#000",
    overlayOpacity: 0.75,
    steps: [
      {
        element: "#sidebar-nav",
        popover: {
          title: "Design Patterns Catalog",
          description:
            'Browse all 23 GoF patterns, or click Top patterns to focus on the ones that show up in interviews and production.',
          side: "right",
          align: "start",
        },
      },
      {
        element: "#scenario-switcher",
        popover: {
          title: "Real-World Scenarios",
          description:
            "Switch between a classic example, a backend or cloud case, and an app case. The diagram, call trace, and code follow the pill.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#mode-toggle",
        popover: {
          title: "Anti-Pattern vs Solution",
          description: "Toggle between the tightly coupled version and the refactored architecture.",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "#call-trace-section",
        popover: {
          title: "Interactive Call Trace",
          description: "Press Play, or use the arrow keys, to step through the method calls.",
          side: "top",
          align: "center",
        },
      },
      {
        element: "#spot-the-pattern-card",
        popover: {
          title: "Build Your Intuition",
          description: "Open the quiz and see if you can name the pattern that fits a real problem.",
          side: "left",
          align: "center",
        },
      },
    ],
    onDestroyed: () => {
      active = null;
      try {
        window.localStorage.setItem(SEEN, "1");
      } catch {
        /* storage can be blocked; the tour still ran */
      }
    },
  });
  active = tour;
  tour.drive();
}

export function useProductTour() {
  useEffect(() => {
    let seen = false;
    try {
      seen = window.localStorage.getItem(SEEN) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    const timer = window.setTimeout(() => {
      if (!opened) startTour();
    }, 600);
    return () => window.clearTimeout(timer);
  }, []);
}
