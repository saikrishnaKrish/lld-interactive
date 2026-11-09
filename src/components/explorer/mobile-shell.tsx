import clsx from "clsx";
import { BookOpen, Boxes, ChevronDown, Code2, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { scenariosOf } from "@/data/catalog";
import { CATEGORY_COPY, type Pattern } from "@/data/types";
import { CodeView } from "./code-view";

export type MobileTab = "learn" | "canvas" | "code";

const TABS: { id: MobileTab; label: string; icon: typeof BookOpen }[] = [
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "canvas", label: "Diagram", icon: Boxes },
  { id: "code", label: "Code", icon: Code2 },
];

export function MobileShell({
  pattern,
  scenarios,
  scenarioId,
  onScenario,
  mobileTab,
  onTab,
  patternsOpen,
  onPatternsOpen,
  children,
  patternsPanel,
}: {
  pattern: Pattern;
  scenarios: ReturnType<typeof scenariosOf>;
  scenarioId: string;
  onScenario: (id: string) => void;
  mobileTab: MobileTab;
  onTab: (tab: MobileTab) => void;
  patternsOpen: boolean;
  onPatternsOpen: (open: boolean) => void;
  children: ReactNode;
  patternsPanel: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-x-hidden overflow-y-hidden md:hidden">
      <div className="shrink-0 space-y-2 border-b border-line bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => onPatternsOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={patternsOpen}
          className="flex h-11 w-full items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-left text-sm font-semibold"
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="text-muted">{CATEGORY_COPY[pattern.category].label}: </span>
            {pattern.name}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
        {scenarios.length > 1 ? (
          <div
            className="scrollbar-none -mx-1 flex flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain whitespace-nowrap px-1 pb-0.5 touch-pan-x"
            role="tablist"
            aria-label="Scenario"
          >
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                role="tab"
                aria-selected={scenario.id === scenarioId}
                onClick={() => onScenario(scenario.id)}
                className={clsx(
                  "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold",
                  scenario.id === scenarioId
                    ? "border-primary bg-wash text-primary"
                    : "border-line text-muted",
                )}
              >
                {scenario.shortLabel}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-20">{children}</div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile sections"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onPatternsOpen(false);
                onTab(tab.id);
              }}
              className={clsx(
                "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
                active ? "text-primary" : "text-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPatternsOpen(!patternsOpen)}
          className={clsx(
            "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold",
            patternsOpen ? "text-primary" : "text-muted",
          )}
          aria-expanded={patternsOpen}
          aria-controls="mobile-patterns-sheet"
        >
          <Menu className="size-4" />
          <span>Patterns</span>
        </button>
      </nav>

      <PatternsSheet open={patternsOpen} onClose={() => onPatternsOpen(false)}>
        {patternsPanel}
      </PatternsSheet>
    </div>
  );
}

function PatternsSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink/40 md:hidden" onMouseDown={onClose}>
      <div
        id="mobile-patterns-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mt-10 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-sm"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-sm font-extrabold tracking-wide">
            All patterns
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close pattern list"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-lg border border-line"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function MobileCodePanel({
  pattern,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  pattern: Pattern;
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold tracking-widest">TYPESCRIPT</h2>
        <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-xs font-medium text-primary">
          {CATEGORY_COPY[pattern.category].label}
        </span>
      </div>
      <p className="mb-3 text-sm text-muted">{pattern.name} · working snippet</p>
      <CodeView
        snippet={pattern.snippet}
        objects={pattern.objects}
        hoveredEntityId={hoveredEntityId}
        hoveredAlsoId={hoveredAlsoId}
        onHover={onHover}
      />
    </section>
  );
}
