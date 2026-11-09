import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { Explorer } from "@/components/explorer/explorer";

type Search = {
  pattern: string;
  step: number;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const pattern = typeof search.pattern === "string" ? search.pattern : "factory-method";
    const raw = typeof search.step === "number" ? search.step : Number(search.step);
    const step = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    return { pattern, step };
  },
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onChange = useCallback(
    (pattern: string, step: number, replace?: boolean) => {
      void navigate({ search: { pattern, step }, replace });
    },
    [navigate],
  );
  return <Explorer patternId={search.pattern} step={search.step} onChange={onChange} />;
}
