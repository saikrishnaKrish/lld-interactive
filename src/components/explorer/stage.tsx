import clsx from "clsx";
import { Cloud, Cpu, CreditCard, FileText, Gamepad2, Monitor, Server, Shield } from "lucide-react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { isVisible, objectLines } from "@/data/catalog";
import type { DiagramObject, Pattern, PatternStep, Scenario } from "@/data/types";
import { edgeMotion, entityMatches, kindTone, problemHint, roleOf, type Lens, type Role } from "./roles";

export type { Lens };
export type StageMode = "objects" | "sequence";

const CARD_W = 144;
const CARD_H = 96;

type Point = { x: number; y: number };

type HoverHandlers = {
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
};

export function Stage({
  pattern,
  step,
  mode,
  onMode,
  lens,
  hasProblem,
  onLens,
  playing,
  scenarios,
  scenarioId,
  onScenario,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  pattern: Pattern;
  step: number;
  mode: StageMode;
  onMode: (mode: StageMode) => void;
  lens: Lens;
  hasProblem: boolean;
  onLens: (lens: Lens) => void;
  playing: boolean;
  scenarios: Scenario[];
  scenarioId: string;
  onScenario: (id: string) => void;
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
}) {
  const current = pattern.steps[step];
  const hover = { hoveredEntityId, hoveredAlsoId, onHover };

  return (
    <section className="flex h-full min-h-96 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-canvas p-1" role="tablist" aria-label="Diagram mode">
            <ModeButton active={mode === "objects"} onClick={() => onMode("objects")}>
              Objects
            </ModeButton>
            <ModeButton active={mode === "sequence"} onClick={() => onMode("sequence")}>
              Sequence
            </ModeButton>
          </div>
          <div id="mode-toggle" className="flex rounded-lg bg-canvas p-1" role="tablist" aria-label="Coupling view">
            <ModeButton
              active={lens === "problem"}
              disabled={!hasProblem}
              tone="alert"
              onClick={() => onLens("problem")}
            >
              <span className="sm:hidden">Problem</span>
              <span className="hidden sm:inline">Anti-pattern</span>
            </ModeButton>
            <ModeButton active={lens === "solution"} onClick={() => onLens("solution")}>
              <span className="sm:hidden">Pattern</span>
              <span className="hidden sm:inline">Refactored</span>
            </ModeButton>
          </div>
        </div>
        <p className="font-mono text-xs text-muted">{pattern.name}</p>
      </div>
      {scenarios.length > 1 ? (
        <div id="scenario-switcher" className="flex flex-wrap gap-1 border-b border-line px-3 py-2" role="tablist" aria-label="Scenario">
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              role="tab"
              aria-selected={scenario.id === scenarioId}
              onClick={() => onScenario(scenario.id)}
              className={clsx(
                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold",
                scenario.id === scenarioId ? "border-primary bg-wash text-primary" : "border-line text-muted hover:text-ink",
              )}
            >
              <ScenarioIcon id={scenario.id} domain={scenario.domain} />
              <span className="sm:hidden">{scenario.shortLabel}</span>
              <span className="hidden sm:inline">{scenario.label}</span>
              <span className="hidden font-mono text-xs font-medium text-muted md:inline">{scenario.domain}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-1.5">
        <Legend swatch="bg-role-client" label="Client" />
        <Legend swatch="bg-role-creator" label="Creator" />
        <Legend swatch="bg-role-product" label="Product" />
        <Legend swatch="bg-role-alert" label="Tight coupling" />
      </div>
      <div className="min-h-72 flex-1">
        {mode === "objects" ? (
          <ObjectBoard pattern={pattern} step={step} lens={lens} playing={playing} {...hover} />
        ) : (
          <SequenceBoard pattern={pattern} step={step} lens={lens} {...hover} />
        )}
      </div>
      {current ? (
        <div className="border-t border-line bg-surface px-3 py-2.5">
          <p
            className={clsx(
              "font-mono text-xs font-medium tracking-wide",
              current.kind === "problem" ? "text-role-alert" : "text-primary",
            )}
          >
            STEP {step + 1} / {pattern.steps.length} · {current.kind.toUpperCase()}
          </p>
          <p className="text-sm font-semibold">{current.title}</p>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
            {lens === "problem" && current.kind === "problem" ? problemHint(current) : current.blurb}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function ScenarioIcon({ id, domain }: { id: string; domain: string }) {
  const className = "size-3.5 shrink-0";
  if (id === "payments") return <CreditCard className={className} />;
  if (id === "storage" || id === "cloud-kit") return <Cloud className={className} />;
  if (id === "exporter") return <FileText className={className} />;
  const key = domain.toLowerCase();
  if (/(cloud|devops|storage)/.test(key)) return <Cloud className={className} />;
  if (/(fintech|commerce|logistics)/.test(key)) return <CreditCard className={className} />;
  if (key.includes("security")) return <Shield className={className} />;
  if (/(backend|database|pipeline|data|compiler|calculator)/.test(key)) return <Server className={className} />;
  if (/(gaming|game)/.test(key)) return <Gamepad2 className={className} />;
  if (/(iot|hardware|streaming|media|aviation)/.test(key)) return <Cpu className={className} />;
  return <Monitor className={className} />;
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-ink">
      <span className={clsx("size-2 rounded-full", swatch)} />
      {label}
    </span>
  );
}

function ModeButton({
  active,
  onClick,
  disabled,
  tone = "primary",
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone?: "primary" | "alert";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "h-9 rounded-md px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40",
        active && tone === "alert" && "bg-role-alert text-on-primary",
        active && tone === "primary" && "bg-primary text-on-primary",
        !active && "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function lit(object: DiagramObject, hover: HoverHandlers): boolean {
  return entityMatches(object, hover.hoveredEntityId) || entityMatches(object, hover.hoveredAlsoId);
}

function ObjectBoard({
  pattern,
  step,
  lens,
  playing,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  pattern: Pattern;
  step: number;
  lens: Lens;
  playing: boolean;
} & HoverHandlers) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const hover = { hoveredEntityId, hoveredAlsoId, onHover };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const current = pattern.steps[step];
  const visible = pattern.objects.filter((object) => isVisible(pattern, step, object.id));
  const hot = new Set([current?.from, current?.to].filter(Boolean));
  const narrow = size.w > 0 && size.w < 640;

  return (
    <div ref={ref} className="blueprint relative h-full min-h-72 overflow-hidden">
      {narrow ? (
        <CompactObjects pattern={pattern} visible={visible} hot={hot} stepIndex={step} current={current} {...hover} />
      ) : (
        <>
          {size.w > 0 ? (
            <Arrows
              pattern={pattern}
              step={step}
              lens={lens}
              playing={playing}
              visible={visible}
              width={size.w}
              height={size.h}
              {...hover}
            />
          ) : null}
          {size.w > 0 && current?.from && current.to && current.kind !== "problem" ? (
            <CallLabel
              pattern={pattern}
              step={step}
              lens={lens}
              visible={visible}
              width={size.w}
              height={size.h}
            />
          ) : null}
          {lens === "problem" && current?.kind === "problem" ? (
            <p className="role-alert pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-lg border px-3 py-2 text-sm font-medium">
              <span className="font-mono font-semibold">{current.call}</span>
              <span className="mx-2">·</span>
              {problemHint(current)}
            </p>
          ) : null}
          {visible.map((object) => (
            <ObjectCard
              key={object.id}
              pattern={pattern}
              object={object}
              step={step}
              lens={lens}
              hot={hot.has(object.id) || lit(object, hover)}
              alert={lens === "problem" && (current?.from === object.id || current?.to === object.id)}
              onHover={onHover}
              className="absolute w-36"
              style={{
                left: `${object.x}%`,
                top: `${object.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

function ObjectCard({
  pattern,
  object,
  step,
  lens,
  hot,
  alert,
  onHover,
  className,
  style,
}: {
  pattern: Pattern;
  object: DiagramObject;
  step: number;
  lens: Lens;
  hot: boolean;
  alert: boolean;
  onHover: (id: string | null, also?: string | null) => void;
  className?: string;
  style?: CSSProperties;
}) {
  const role = roleOf(object.stereotype);
  return (
    <article
      className={clsx(
        "rounded-lg border px-2.5 py-2 shadow-sm transition-shadow",
        alert ? "role-alert" : roleClass(role),
        hot && "role-hot",
        className,
      )}
      style={style}
      onMouseEnter={() => onHover(object.id)}
      onMouseLeave={() => onHover(null)}
    >
      <p
        className={clsx(
          "inline-block max-w-full truncate rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-on-primary",
          alert ? "bg-role-alert" : badgeClass(role),
        )}
      >
        {object.stereotype}
      </p>
      <h3 className="mt-1 truncate text-sm font-bold text-ink" title={object.name}>
        {object.name}
      </h3>
      <ul className="mt-1 space-y-0.5 border-t border-line pt-1">
        {objectLines(pattern, step, object.id).map((line) => (
          <li key={line} className="truncate font-mono text-xs text-muted">
            {line}
          </li>
        ))}
      </ul>
      {lens === "problem" && alert ? <span className="sr-only">Tightly coupled in the anti-pattern</span> : null}
    </article>
  );
}

function roleClass(role: Role): string {
  if (role === "client") return "role-client";
  if (role === "product") return "role-product";
  return "role-creator";
}

function badgeClass(role: Role): string {
  if (role === "client") return "bg-role-client";
  if (role === "product") return "bg-role-product";
  return "bg-role-creator";
}

function CompactObjects({
  pattern,
  visible,
  hot,
  stepIndex,
  current,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  pattern: Pattern;
  visible: DiagramObject[];
  hot: Set<string | undefined>;
  stepIndex: number;
  current: PatternStep | undefined;
} & HoverHandlers) {
  const hover = { hoveredEntityId, hoveredAlsoId, onHover };
  const from = pattern.objects.find((object) => object.id === current?.from);
  const to = pattern.objects.find((object) => object.id === current?.to);
  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-3">
      <div className="flex flex-wrap gap-2">
        {visible.map((object) => (
          <ObjectCard
            key={object.id}
            pattern={pattern}
            object={object}
            step={stepIndex}
            lens={current?.kind === "problem" ? "problem" : "solution"}
            hot={hot.has(object.id) || lit(object, hover)}
            alert={current?.kind === "problem" && (current.from === object.id || current.to === object.id)}
            onHover={onHover}
            className="min-w-36 flex-1"
          />
        ))}
      </div>
      {current ? (
        <p
          className={clsx(
            "rounded-lg border px-3 py-2 font-mono text-sm",
            current.kind === "problem" ? "role-alert" : "border-line bg-surface text-ink",
          )}
        >
          <span className="text-ink">{from?.name ?? "—"}</span>
          <span className="px-2 text-primary">→</span>
          <span className="text-ink">{to?.name ?? "—"}</span>
          <span className="mt-1 block font-semibold">{current.call}</span>
          {current.kind === "problem" ? <span className="mt-1 block text-xs font-medium">{problemHint(current)}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

function Arrows({
  pattern,
  step,
  lens,
  playing,
  visible,
  width,
  height,
  hoveredEntityId,
  hoveredAlsoId,
}: {
  pattern: Pattern;
  step: number;
  lens: Lens;
  playing: boolean;
  visible: DiagramObject[];
  width: number;
  height: number;
} & Omit<HoverHandlers, "onHover">) {
  const byId = new Map(visible.map((object) => [object.id, object]));
  const current = pattern.steps[step];
  const markerId = `arrow-${pattern.id}-${lens}`;
  const motion = current ? edgeMotion(current) : null;
  const call =
    current?.from && current.to && showStepEdge(lens, current)
      ? linkGeometry(byId.get(current.from), byId.get(current.to), width, height)
      : null;
  const hover = { hoveredEntityId, hoveredAlsoId, onHover: () => undefined };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <Marker id={markerId} color="var(--color-role-creator)" />
        <Marker id={`${markerId}-muted`} color="var(--color-muted)" />
        <Marker id={`${markerId}-active`} color={motion?.color ?? "var(--color-primary)"} />
        <Marker id={`${markerId}-product`} color="var(--color-role-product)" />
      </defs>
      {lens === "solution"
        ? pattern.links.map((link) => {
            if (current && showStepEdge(lens, current) && link.from === current.from && link.to === current.to) {
              return null;
            }
            const geometry = linkGeometry(byId.get(link.from), byId.get(link.to), width, height);
            if (!geometry) return null;
            const from = byId.get(link.from);
            const to = byId.get(link.to);
            const emphasized = (from && lit(from, hover)) || (to && lit(to, hover));
            const stroke = structureStroke(link.label, link.dashed);
            return (
              <path
                key={`${link.from}-${link.to}-${link.label}`}
                d={geometry.path}
                fill="none"
                stroke={stroke.color}
                strokeWidth={emphasized ? 2.25 : 1.25}
                strokeDasharray={stroke.dash}
                markerEnd={`url(#${stroke.marker === "product" ? `${markerId}-product` : markerId})`}
                opacity={emphasized ? 1 : 0.45}
              />
            );
          })
        : null}
      {call && motion ? (
        <g key={`${pattern.id}-${step}-${lens}`}>
          <path
            d={call.path}
            fill="none"
            stroke={motion.color}
            strokeWidth="2.4"
            strokeDasharray={motion.dash}
            markerEnd={`url(#${markerId}-active)`}
          />
          <circle r={motion.particle === "spawn" ? 4 : 5} fill={motion.color} className="travel-dot">
            <animateMotion
              dur={playing ? "1.1s" : "0.75s"}
              repeatCount={playing ? "indefinite" : "1"}
              fill="freeze"
              path={call.path}
            />
            {motion.particle === "spawn" ? (
              <animate attributeName="r" values="2;3;8;4" keyTimes="0;0.62;0.84;1" dur="0.75s" fill="freeze" />
            ) : null}
          </circle>
        </g>
      ) : null}
    </svg>
  );
}

function Marker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill={color} />
    </marker>
  );
}

function showStepEdge(lens: Lens, step: PatternStep): boolean {
  if (lens === "problem") return step.kind === "problem";
  return step.kind !== "problem";
}

function structureStroke(
  label: string,
  dashed: boolean | undefined,
): { color: string; dash?: string; marker: "product" | "creator" } {
  const key = label.toLowerCase();
  if (/\b(creates|create|builds|build|clone|new)\b/.test(key)) {
    return { color: "var(--color-role-product)", dash: "2 6", marker: "product" };
  }
  if (/implement|extend/.test(key)) {
    return { color: "var(--color-role-creator)", dash: "7 5", marker: "creator" };
  }
  if (dashed) {
    return { color: "var(--color-role-creator)", dash: "7 5", marker: "creator" };
  }
  return { color: "var(--color-role-creator)", marker: "creator" };
}

function CallLabel({
  pattern,
  step,
  lens,
  visible,
  width,
  height,
}: {
  pattern: Pattern;
  step: number;
  lens: Lens;
  visible: DiagramObject[];
  width: number;
  height: number;
}) {
  const current = pattern.steps[step];
  const byId = new Map(visible.map((object) => [object.id, object]));
  if (!current?.from || !current.to || !showStepEdge(lens, current)) return null;
  const call = linkGeometry(byId.get(current.from), byId.get(current.to), width, height);
  if (!call) return null;
  const problem = current.kind === "problem";
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2"
      style={{ left: call.label.x, top: problem ? call.label.y - 36 : call.label.y }}
    >
      <p
        title={problem ? problemHint(current) : undefined}
        className={clsx(
          "mx-auto max-w-40 truncate rounded-full border px-2 py-0.5 text-center font-mono text-xs",
          problem ? "role-alert font-semibold" : "border-line bg-surface text-ink",
        )}
      >
        {current.call}
      </p>
    </div>
  );
}

function linkGeometry(
  from: DiagramObject | undefined,
  to: DiagramObject | undefined,
  width: number,
  height: number,
): { path: string; label: Point } | null {
  if (!from || !to || width === 0 || height === 0) return null;
  const hw = CARD_W / 2;
  const hh = CARD_H / 2;
  const a = { x: (from.x / 100) * width, y: (from.y / 100) * height };
  const b = { x: (to.x / 100) * width, y: (to.y / 100) * height };
  if (from.id === to.id) {
    const x = a.x + hw;
    const y = a.y;
    return {
      path: `M ${x} ${y - 16} C ${x + 46} ${y - 28}, ${x + 46} ${y + 28}, ${x} ${y + 16}`,
      label: { x: x + 48, y },
    };
  }
  const start = inset(edgePoint(a, b, hw, hh), b, 2);
  const end = inset(edgePoint(b, a, hw, hh), a, 8);
  return {
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    label: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 12 },
  };
}

function edgePoint(from: Point, toward: Point, hw: number, hh: number): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const tx = hw / (Math.abs(dx) || 0.0001);
  const ty = hh / (Math.abs(dy) || 0.0001);
  const t = Math.min(tx, ty);
  return { x: from.x + dx * t, y: from.y + dy * t };
}

function inset(point: Point, toward: Point, pad: number): Point {
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: point.x + (dx / len) * pad, y: point.y + (dy / len) * pad };
}

function SequenceBoard({
  pattern,
  step,
  lens,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
}: {
  pattern: Pattern;
  step: number;
  lens: Lens;
} & HoverHandlers) {
  const hover = { hoveredEntityId, hoveredAlsoId, onHover };
  const visible = pattern.objects.filter((object) => isVisible(pattern, step, object.id));
  const shown = pattern.steps
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => index === step || (lens === "problem" ? item.kind === "problem" : item.kind !== "problem"));
  const columns = `repeat(${Math.max(visible.length, 1)}, minmax(0, 1fr))`;

  return (
    <div className="flex h-full min-h-72 flex-col bg-canvas">
      <div className="grid border-b border-line bg-surface" style={{ gridTemplateColumns: columns }}>
        {visible.map((object) => {
          const hot = pattern.steps[step]?.from === object.id || pattern.steps[step]?.to === object.id || lit(object, hover);
          const role = roleOf(object.stereotype);
          return (
            <button
              key={object.id}
              type="button"
              onMouseEnter={() => onHover(object.id)}
              onMouseLeave={() => onHover(null)}
              className={clsx(
                "border-r border-line px-2 py-2 text-center last:border-r-0",
                hot && roleClass(role),
              )}
            >
              <p
                className={clsx(
                  "mx-auto inline-block max-w-full truncate rounded-full px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wide text-on-primary",
                  badgeClass(role),
                )}
              >
                {object.stereotype}
              </p>
              <p className="truncate text-sm font-semibold text-ink" title={object.name}>
                {object.name}
              </p>
            </button>
          );
        })}
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: columns }}>
          {visible.map((object) => (
            <div key={object.id} className="relative">
              <div className="absolute bottom-2 left-1/2 top-2 w-px bg-line" />
            </div>
          ))}
        </div>
        <ol className="relative space-y-1 px-1 py-3">
          {shown.map(({ item, index }) => (
            <SequenceRow
              key={`${item.title}-${index}`}
              item={item}
              objects={visible}
              active={index === step}
              linked={traceLinked(item, pattern, hover)}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

function traceLinked(item: PatternStep, pattern: Pattern, hover: HoverHandlers): boolean {
  return [item.from, item.to].some((id) => {
    const object = pattern.objects.find((entry) => entry.id === id);
    return object ? lit(object, hover) : false;
  });
}

function SequenceRow({
  item,
  objects,
  active,
  linked,
}: {
  item: PatternStep;
  objects: DiagramObject[];
  active: boolean;
  linked: boolean;
}) {
  const n = objects.length || 1;
  const from = objects.findIndex((object) => object.id === item.from);
  const to = objects.findIndex((object) => object.id === item.to);
  const valid = from >= 0 && to >= 0;
  const tone = kindTone(item.kind);
  const bar =
    tone === "alert" ? "border-role-alert" : tone === "product" ? "border-role-product" : "border-role-creator";
  const dotted = item.kind === "create" || /\bnew\b/.test(item.call);
  const dashed = item.kind === "note";

  return (
    <li className={clsx("relative flex h-11 items-center", active && item.kind === "problem" && "row-problem", active && item.kind !== "problem" && "bg-wash", !active && linked && "row-link")}>
      {!valid ? (
        <span className="mx-3 truncate rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-xs">
          {item.call}
        </span>
      ) : null}
      {valid && from === to ? (
        <span
          className="absolute max-w-36 -translate-x-1/2 truncate rounded-full border border-primary bg-surface px-2 py-0.5 font-mono text-xs"
          style={{ left: `${((from + 0.5) / n) * 100}%` }}
        >
          {item.call}
        </span>
      ) : null}
      {valid && from !== to ? (
        <span
          className="absolute flex -translate-y-1 items-center"
          style={{
            left: `${((Math.min(from, to) + 0.5) / n) * 100}%`,
            width: `${(Math.abs(to - from) / n) * 100}%`,
            flexDirection: to < from ? "row-reverse" : "row",
          }}
        >
          {active ? (
            <span
              className={clsx(
                "absolute top-1/2 z-10 size-2 -translate-y-1/2 rounded-full",
                to < from ? "seq-particle-back" : "seq-particle",
              )}
              style={{
                background:
                  tone === "alert"
                    ? "var(--color-role-alert)"
                    : tone === "product"
                      ? "var(--color-role-product)"
                      : "var(--color-role-creator)",
              }}
            />
          ) : null}
          <span
            className={clsx(
              "h-0 flex-1 border-t-2",
              bar,
              dotted && "border-dotted",
              dashed && "border-dashed",
              active && (to < from ? "seq-draw-reverse" : "seq-draw"),
            )}
          />
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true" className={to < from ? "rotate-180" : undefined}>
            <path
              d="M0 0 L8 4 L0 8 Z"
              fill={
                tone === "alert"
                  ? "var(--color-role-alert)"
                  : tone === "product"
                    ? "var(--color-role-product)"
                    : "var(--color-role-creator)"
              }
            />
          </svg>
          <span className="absolute left-1/2 top-0 max-w-full -translate-x-1/2 -translate-y-full truncate rounded-full border border-line bg-surface px-2 font-mono text-xs text-ink">
            {item.call}
          </span>
        </span>
      ) : null}
    </li>
  );
}
