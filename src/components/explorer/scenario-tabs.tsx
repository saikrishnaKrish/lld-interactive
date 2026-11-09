import clsx from "clsx";
import type { Scenario } from "@/data/types";

const PLACEHOLDERS = [
  { id: "__scenario-a", shortLabel: "Scenario" },
  { id: "__scenario-b", shortLabel: "Scenario" },
  { id: "__scenario-c", shortLabel: "Scenario" },
] as const;

export function ScenarioTabs({
  scenarios,
  scenarioId,
  onScenario,
  className,
}: {
  scenarios: Scenario[];
  scenarioId: string;
  onScenario: (id: string) => void;
  className?: string;
}) {
  const loading = scenarios.length === 0;
  const items = loading
    ? PLACEHOLDERS
    : scenarios.map((scenario) => ({ id: scenario.id, shortLabel: scenario.shortLabel }));

  return (
    <div
      className={clsx(
        "scrollbar-none flex min-h-9 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain whitespace-nowrap touch-pan-x",
        className,
      )}
      role="tablist"
      aria-label="Scenario"
      aria-busy={loading || undefined}
    >
      {items.map((item) => {
        const selected = !loading && item.id === scenarioId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={loading ? undefined : selected}
            disabled={loading}
            onClick={() => {
              if (!loading) onScenario(item.id);
            }}
            className={clsx(
              "inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-lg border px-3 text-sm font-semibold",
              loading && "animate-pulse border-line bg-canvas text-transparent",
              !loading && selected && "border-primary bg-wash text-primary",
              !loading && !selected && "border-line text-muted",
            )}
          >
            {item.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
