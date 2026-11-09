import clsx from "clsx";
import {
  BookOpen,
  Boxes,
  Check,
  ChevronRight,
  Code2,
  Flame,
  HelpCircle,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Circle,
  CircleDot,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Group, Panel, Separator, useGroupRef, usePanelRef, type Layout } from "react-resizable-panels";
import { findPattern, isKnownPattern, patterns, resolvePattern, scenariosOf } from "@/data/catalog";
import { CATEGORY_COPY, type CategoryId, type Pattern, type PatternStep, type StepKind } from "@/data/types";
import { CodeView } from "./code-view";
import {
  CollisionCard,
  ComplexityCard,
  DecisionTreeDialog,
  DiagnosticCard,
  FindPatternButton,
  ReferenceCards,
  SpotQuiz,
  TradeoffCard,
} from "./learn";
import { MobileCodePanel, MobileShell, type MobileTab } from "./mobile-shell";
import { entityMatches, roleOf, type Lens } from "./roles";
import { Stage, type StageMode } from "./stage";
import { startTour, useProductTour } from "@/hooks/useProductTour";
import { ThemeMenu } from "./theme";
import { useProgress } from "./use-progress";

const SPEEDS = [0.5, 0.75, 1, 1.5, 2] as const;
const LAYOUT_KEY = "pattern-explorer-layout";
const DEFAULT_LAYOUT: Layout = { "nav-panel": 18, "canvas-panel": 52, "overview-panel": 30 };
const READING_LAYOUT: Layout = { "nav-panel": 0, "canvas-panel": 35, "overview-panel": 65 };

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const apply = () => setMatches(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [query]);
  return matches;
}

type DeskTab = "diagram" | "guide" | "code";
type ChromeMode = "mobile" | "laptop" | "ultrawide";

const DESK_TABS: { id: DeskTab; label: string; short: string; icon: typeof Boxes }[] = [
  { id: "diagram", label: "Visualizer & Trace", short: "Visual", icon: Boxes },
  { id: "guide", label: "Guide & Trade-offs", short: "Guide", icon: BookOpen },
  { id: "code", label: "Code", short: "Code", icon: Code2 },
];

type Filter = "all" | CategoryId;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "creational", label: "Create" },
  { id: "structural", label: "Struct" },
  { id: "behavioral", label: "Behave" },
];

export function Explorer({
  patternId,
  step,
  onChange,
}: {
  patternId: string;
  step: number;
  onChange: (patternId: string, step: number, replace?: boolean) => void;
}) {
  useProductTour();
  const source = findPattern(isKnownPattern(patternId) ? patternId : undefined);
  const [scenarioId, setScenarioId] = useState(() => scenariosOf(source)[0]?.id ?? "classic");
  const [treeOpen, setTreeOpen] = useState(false);
  const scenarios = scenariosOf(source);
  const pattern = resolvePattern(source, scenarioId);
  const safeStep = Math.max(0, Math.min(step, pattern.steps.length - 1));
  const [filter, setFilter] = useState<Filter>("all");
  const [topOnly, setTopOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<StageMode>("objects");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [showFlowBall, setShowFlowBall] = useState(true);
  const [navOpen, setNavOpen] = useState(true);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [overviewCollapsed, setOverviewCollapsed] = useState(false);
  const [reading, setReading] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("learn");
  const [deskTab, setDeskTab] = useState<DeskTab>("diagram");
  const [patternsOpen, setPatternsOpen] = useState(false);
  const wide = useMediaQuery("(min-width: 768px)");
  const ultrawide = useMediaQuery("(min-width: 1536px)");
  const chrome: ChromeMode = !wide ? "mobile" : ultrawide ? "ultrawide" : "laptop";
  const groupRef = useGroupRef();
  const leftRef = usePanelRef();
  const rightRef = usePanelRef();
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [hoveredAlsoId, setHoveredAlsoId] = useState<string | null>(null);
  const progress = useProgress();
  const restarting = useRef(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isKnownPattern(patternId) || step !== safeStep) {
      onChange(pattern.id, safeStep, true);
    }
  }, [patternId, step, safeStep, pattern.id, onChange]);

  useEffect(() => {
    progress.markSeen(pattern.id);
  }, [pattern.id, progress.markSeen]);

  useEffect(() => {
    if (safeStep === pattern.steps.length - 1) progress.markDone(pattern.id);
  }, [pattern.id, pattern.steps.length, safeStep, progress.markDone]);

  useEffect(() => {
    setScenarioId(scenariosOf(source)[0]?.id ?? "classic");
    setHoveredEntityId(null);
    setHoveredAlsoId(null);
  }, [source.id]);

  useEffect(() => {
    if (!playing) return;
    if (safeStep >= pattern.steps.length - 1) {
      if (restarting.current) return;
      setPlaying(false);
      return;
    }
    restarting.current = false;
    const timer = window.setTimeout(() => {
      onChange(pattern.id, safeStep + 1, true);
    }, 1500 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, safeStep, speed, pattern.id, pattern.steps.length, onChange]);

  const actions = useRef({ togglePlay, stepBy, resetPlay });
  actions.current = { togglePlay, stepBy, resetPlay };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (document.querySelector("[role='dialog']")) return;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return;
      }
      if (event.key === " " || event.code === "Space") {
        if (target?.closest("button, a, [role='tab']")) return;
        event.preventDefault();
        actions.current.togglePlay();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        actions.current.stepBy(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        actions.current.stepBy(-1);
      } else if (event.key === "r" || event.key === "R") {
        actions.current.resetPlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pick(id: string, nextStep = 0, replace = false) {
    setPlaying(false);
    restarting.current = false;
    setPatternsOpen(false);
    setTreeOpen(false);
    onChange(id, nextStep, replace);
  }

  function stepBy(delta: number) {
    setPlaying(false);
    restarting.current = false;
    const next = Math.max(0, Math.min(pattern.steps.length - 1, safeStep + delta));
    onChange(pattern.id, next, true);
  }

  function resetPlay() {
    setPlaying(false);
    restarting.current = false;
    onChange(pattern.id, 0, true);
  }

  function togglePlay() {
    if (!playing && safeStep >= pattern.steps.length - 1) {
      restarting.current = true;
      onChange(pattern.id, 0, true);
      setPlaying(true);
      return;
    }
    setPlaying((value) => !value);
  }

  function hover(id: string | null, also: string | null = null) {
    setHoveredEntityId(id);
    setHoveredAlsoId(also);
  }

  function rememberLayout(layout: Layout) {
    const overview = layout["overview-panel"] ?? 0;
    const nav = layout["nav-panel"] ?? 0;
    setReading(overview >= 58);
    setNavCollapsed(nav < 1);
    setOverviewCollapsed(overview < 1);
  }

  function onLayoutChanged(layout: Layout, meta: { isUserInteraction: boolean; requestedLayout?: Layout }) {
    const next = meta.requestedLayout ?? layout;
    rememberLayout(next);
    if (!meta.isUserInteraction) return;
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  }

  useEffect(() => {
    if (!ultrawide) return;
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Layout;
      if (typeof saved["nav-panel"] !== "number") return;
      groupRef.current?.setLayout(saved);
      rememberLayout(saved);
    } catch {
      localStorage.removeItem(LAYOUT_KEY);
    }
  }, [ultrawide, groupRef]);

  function toggleLeft() {
    if (chrome === "mobile") {
      setNavOpen((value) => !value);
      return;
    }
    if (chrome === "laptop") {
      setNavCollapsed((value) => !value);
      return;
    }
    const panel = leftRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }

  function toggleRight() {
    if (chrome === "laptop") {
      setDeskTab("guide");
      return;
    }
    const panel = rightRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }

  function toggleReading() {
    const group = groupRef.current;
    if (!group) return;
    const overview = group.getLayout()["overview-panel"] ?? 0;
    const next = overview >= 58 ? DEFAULT_LAYOUT : READING_LAYOUT;
    group.setLayout(next);
    rememberLayout(next);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
  }

  function chooseScenario(id: string) {
    setPlaying(false);
    restarting.current = false;
    setHoveredEntityId(null);
    setHoveredAlsoId(null);
    setScenarioId(id);
    onChange(pattern.id, 0, true);
  }

  const lens: Lens = pattern.steps[safeStep]?.kind === "problem" ? "problem" : "solution";
  const hasProblem = pattern.steps.some((item) => item.kind === "problem");

  function chooseLens(next: Lens) {
    setPlaying(false);
    restarting.current = false;
    if (next === "problem") {
      const index = pattern.steps.findIndex((item) => item.kind === "problem");
      if (index >= 0) onChange(pattern.id, index, true);
      return;
    }
    if (lens === "problem") {
      const index = pattern.steps.findIndex((item) => item.kind !== "problem");
      if (index >= 0) onChange(pattern.id, index, true);
    }
  }

  const learned = progress.ready
    ? patterns.filter((item) => progress.done.includes(item.id)).length
    : 0;
  const started = progress.ready
    ? patterns.filter((item) => progress.seen.includes(item.id) && !progress.done.includes(item.id)).length
    : 0;

  const sidebar = (
    <Sidebar
      open
      onToggle={toggleLeft}
      pattern={pattern}
      step={safeStep}
      filter={filter}
      query={query}
      done={progress.done}
      seen={progress.seen}
      searchRef={searchRef}
      onFilter={setFilter}
      onQuery={setQuery}
      topOnly={topOnly}
      onTopOnly={setTopOnly}
      onPick={(id) => pick(id)}
      onStep={(index) => pick(pattern.id, index, true)}
      onResetProgress={progress.reset}
      embedded
    />
  );

  const workspaceProps = {
    pattern,
    safeStep,
    mode,
    setMode,
    lens,
    hasProblem,
    chooseLens,
    playing,
    showFlowBall,
    onToggleFlowBall: () => setShowFlowBall((value) => !value),
    scenarios,
    scenarioId,
    chooseScenario,
    hoveredEntityId,
    hoveredAlsoId,
    hover,
    speed,
    setSpeed,
    stepBy,
    togglePlay,
    resetPlay,
    pick,
  } as const;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-bg text-ink">
      <Header
        pattern={pattern}
        learned={learned}
        started={started}
        progressReady={progress.ready}
        done={progress.done}
        seen={progress.seen}
        onFind={() => setTreeOpen(true)}
        navCollapsed={chrome === "mobile" ? !navOpen : navCollapsed}
        overviewCollapsed={chrome === "ultrawide" ? overviewCollapsed : false}
        onToggleNav={toggleLeft}
        onShowOverview={toggleRight}
        chrome={chrome}
      />

      {chrome === "ultrawide" ? (
        <div className="flex min-h-0 w-full flex-1 overflow-hidden p-3">
          <Group
            id="pattern-explorer-layout"
            className="h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden"
            orientation="horizontal"
            groupRef={groupRef}
            onLayoutChanged={onLayoutChanged}
          >
            <Panel
              id="nav-panel"
              panelRef={leftRef}
              collapsible
              collapsedSize="0"
              defaultSize="18"
              minSize="12"
              maxSize="25"
              className="flex h-full min-h-0 flex-col overflow-hidden"
              style={{ overflow: "hidden" }}
              onResize={(size) => setNavCollapsed(size.asPercentage < 1)}
            >
              {sidebar}
            </Panel>
            <Separator id="nav-separator" className="pane-separator" />
            <Panel
              id="canvas-panel"
              defaultSize="52"
              minSize="30"
              className="flex h-full min-h-0 flex-col overflow-hidden"
              style={{ overflow: "hidden" }}
            >
              <Workspace {...workspaceProps} />
            </Panel>
            <Separator id="overview-separator" className="pane-separator" />
            <Panel
              id="overview-panel"
              panelRef={rightRef}
              collapsible
              collapsedSize="0"
              defaultSize="30"
              minSize="20"
              maxSize="60"
              className="flex h-full min-h-0 flex-col overflow-hidden"
              style={{ overflow: "hidden" }}
              onResize={(size) => setOverviewCollapsed(size.asPercentage < 1)}
            >
              <Overview
                pattern={pattern}
                hoveredEntityId={hoveredEntityId}
                hoveredAlsoId={hoveredAlsoId}
                onHover={hover}
                onRelated={(id) => pick(id)}
                onQuizSolved={progress.markDone}
                reading={reading}
                onToggleReading={toggleReading}
                onCollapse={toggleRight}
              />
            </Panel>
          </Group>
        </div>
      ) : null}

      {chrome === "laptop" ? (
        <div className="flex min-h-0 w-full flex-1 gap-3 overflow-hidden p-3">
          <aside
            className={clsx(
              "flex h-full min-h-0 shrink-0 flex-col overflow-hidden transition-[width,opacity]",
              navCollapsed ? "w-0 opacity-0" : "w-60 opacity-100 xl:w-64",
            )}
            aria-hidden={navCollapsed}
          >
            {!navCollapsed ? sidebar : null}
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <div
              className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-canvas/70 px-2"
              role="tablist"
              aria-label="Workspace"
            >
              {DESK_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = deskTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setDeskTab(tab.id)}
                    className={clsx(
                      "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                      active ? "bg-primary text-on-primary" : "text-muted hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.short}</span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {deskTab === "diagram" ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden p-3">
                  <Workspace {...workspaceProps} tall />
                </div>
              ) : null}
              {deskTab === "guide" ? (
                <div className="h-full min-h-0 overflow-y-auto">
                  <div className="mx-auto max-w-4xl p-4 lg:p-6">
                    <Overview
                      pattern={pattern}
                      hoveredEntityId={hoveredEntityId}
                      hoveredAlsoId={hoveredAlsoId}
                      onHover={hover}
                      onRelated={(id) => {
                        pick(id);
                        setDeskTab("diagram");
                      }}
                      onQuizSolved={progress.markDone}
                      reading={false}
                      onToggleReading={() => undefined}
                      onCollapse={() => undefined}
                      showCode={false}
                      panelControls={false}
                    />
                  </div>
                </div>
              ) : null}
              {deskTab === "code" ? (
                <div className="h-full min-h-0 overflow-y-auto p-4 lg:p-6">
                  <LaptopCodePanel
                    pattern={pattern}
                    hoveredEntityId={hoveredEntityId}
                    hoveredAlsoId={hoveredAlsoId}
                    onHover={hover}
                  />
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {chrome === "mobile" ? (
        <MobileShell
          pattern={pattern}
          scenarios={scenarios}
          scenarioId={scenarioId}
          onScenario={chooseScenario}
          mobileTab={mobileTab}
          onTab={setMobileTab}
          patternsOpen={patternsOpen}
          onPatternsOpen={setPatternsOpen}
          patternsPanel={sidebar}
        >
          {mobileTab === "learn" ? (
            <Overview
              pattern={pattern}
              hoveredEntityId={hoveredEntityId}
              hoveredAlsoId={hoveredAlsoId}
              onHover={hover}
              onRelated={(id) => pick(id)}
              onQuizSolved={progress.markDone}
              reading={false}
              onToggleReading={() => undefined}
              onCollapse={() => undefined}
              showCode={false}
              panelControls={false}
            />
          ) : null}
          {mobileTab === "canvas" ? <Workspace {...workspaceProps} compact /> : null}
          {mobileTab === "code" ? (
            <MobileCodePanel
              pattern={pattern}
              hoveredEntityId={hoveredEntityId}
              hoveredAlsoId={hoveredAlsoId}
              onHover={hover}
            />
          ) : null}
        </MobileShell>
      ) : null}

      <DecisionTreeDialog
        open={treeOpen}
        onClose={() => setTreeOpen(false)}
        onPick={(id) => {
          setTreeOpen(false);
          pick(id);
        }}
      />
    </div>
  );
}

function Workspace({
  pattern,
  safeStep,
  mode,
  setMode,
  lens,
  hasProblem,
  chooseLens,
  playing,
  showFlowBall,
  onToggleFlowBall,
  scenarios,
  scenarioId,
  chooseScenario,
  hoveredEntityId,
  hoveredAlsoId,
  hover,
  speed,
  setSpeed,
  stepBy,
  togglePlay,
  resetPlay,
  pick,
  compact = false,
  tall = false,
}: {
  pattern: Pattern;
  safeStep: number;
  mode: StageMode;
  setMode: (mode: StageMode) => void;
  lens: Lens;
  hasProblem: boolean;
  chooseLens: (lens: Lens) => void;
  playing: boolean;
  showFlowBall: boolean;
  onToggleFlowBall: () => void;
  scenarios: ReturnType<typeof scenariosOf>;
  scenarioId: string;
  chooseScenario: (id: string) => void;
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  hover: (id: string | null, also?: string | null) => void;
  speed: (typeof SPEEDS)[number];
  setSpeed: (speed: (typeof SPEEDS)[number]) => void;
  stepBy: (delta: number) => void;
  togglePlay: () => void;
  resetPlay: () => void;
  pick: (id: string, nextStep?: number, replace?: boolean) => void;
  compact?: boolean;
  tall?: boolean;
}) {
  return (
    <section
      className={clsx(
        "order-1 flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden",
        compact ? "gap-3 overflow-visible" : "gap-2",
      )}
    >
      {/* Canvas block — flex-[1.3] + min height so nodes never crush */}
      <div
        className={clsx(
          "min-w-0",
          compact
            ? "shrink-0"
            : tall
              ? "flex min-h-[360px] flex-[1.3] flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-hidden",
        )}
      >
        <Stage
          pattern={pattern}
          step={safeStep}
          mode={mode}
          onMode={setMode}
          lens={lens}
          hasProblem={hasProblem}
          onLens={chooseLens}
          playing={playing}
          showFlowBall={showFlowBall}
          scenarios={scenarios}
          scenarioId={scenarios.some((item) => item.id === scenarioId) ? scenarioId : scenarios[0].id}
          onScenario={chooseScenario}
          hoveredEntityId={hoveredEntityId}
          hoveredAlsoId={hoveredAlsoId}
          onHover={hover}
          compact={compact}
          showScenarios={!compact}
          guaranteeCanvas={tall}
        />
      </div>
      {/* Call Trace — capped height, scrolls inside */}
      <Trace
        pattern={pattern}
        step={safeStep}
        playing={playing}
        speed={speed}
        showFlowBall={showFlowBall}
        onToggleFlowBall={onToggleFlowBall}
        hoveredEntityId={hoveredEntityId}
        hoveredAlsoId={hoveredAlsoId}
        onHover={hover}
        onSpeed={() => {
          const index = SPEEDS.indexOf(speed);
          setSpeed(SPEEDS[(index + 1) % SPEEDS.length]);
        }}
        onPrev={() => stepBy(-1)}
        onNext={() => stepBy(1)}
        onPlay={togglePlay}
        onReset={resetPlay}
        onSeek={(index) => pick(pattern.id, index, true)}
        compact={compact}
        dense={tall}
      />
    </section>
  );
}

function LaptopCodePanel({
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
  const [copied, setCopied] = useState(false);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(pattern.snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">TypeScript</h2>
          <p className="truncate text-xs text-muted">{pattern.name} · working snippet</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-xs font-medium text-primary">
            {CATEGORY_COPY[pattern.category].label}
          </span>
          <button type="button" onClick={() => void copySnippet()} className="text-xs font-semibold text-primary">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
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

function Header({
  pattern,
  learned,
  started,
  progressReady = true,
  done,
  seen,
  onFind,
  navCollapsed,
  overviewCollapsed,
  onToggleNav,
  onShowOverview,
  chrome,
}: {
  pattern: Pattern;
  learned: number;
  started: number;
  progressReady?: boolean;
  done: string[];
  seen: string[];
  onFind: () => void;
  navCollapsed: boolean;
  overviewCollapsed: boolean;
  onToggleNav: () => void;
  onShowOverview: () => void;
  chrome: ChromeMode;
}) {
  const group = CATEGORY_COPY[pattern.category];
  const desktop = chrome !== "mobile";
  const ultrawide = chrome === "ultrawide";

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {desktop ? (
          <button
            type="button"
            onClick={onToggleNav}
            aria-label={navCollapsed ? "Show design patterns" : "Hide design patterns"}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line"
          >
            {navCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        ) : null}
        <Logo />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-wide">PATTERN EXPLORER</p>
          <p className="hidden font-mono text-[11px] tracking-wide text-muted sm:block">LEARN LOW-LEVEL DESIGN</p>
        </div>
      </div>

      {desktop ? (
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="font-mono text-[11px] tracking-wide text-muted">NOW LEARNING</p>
          <p className="truncate text-sm font-semibold">
            {pattern.name}
            <span className="hidden font-normal text-muted lg:inline"> · {pattern.tagline}</span>
          </p>
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {ultrawide ? (
        <div className="hidden shrink-0 2xl:block">
          <p className="font-mono text-[11px] tracking-wide text-muted">INTENT GROUP</p>
          <p className="text-sm font-semibold">{group.label}</p>
        </div>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {ultrawide && overviewCollapsed ? (
          <button
            type="button"
            onClick={onShowOverview}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 text-xs font-semibold"
          >
            <PanelRightOpen className="size-4" />
            <span className="hidden xl:inline">Show reading</span>
          </button>
        ) : null}
        {desktop ? (
          <button
            type="button"
            onClick={() => startTour()}
            aria-label="Quick tour"
            title="Quick tour"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-canvas px-2.5 text-xs font-semibold text-ink"
          >
            <HelpCircle className="size-4" />
            <span className="hidden sm:inline">Tour</span>
          </button>
        ) : null}
        <ThemeMenu />
        {desktop ? <FindPatternButton onClick={onFind} /> : null}
        <div className="hidden text-right sm:block" aria-live="polite">
          <p className="font-mono text-[11px] tracking-wide text-muted">{chrome === "mobile" ? "PROGRESS" : "PROGRESS"}</p>
          <p className={clsx("text-xs font-semibold", !progressReady && "text-muted")}>
            {progressReady ? (
              <>
                {learned}/{patterns.length}
                {desktop && started > 0 ? <span className="font-normal text-muted"> · {started}</span> : null}
              </>
            ) : (
              <span className="inline-block min-w-12 animate-pulse rounded bg-line/60 text-transparent">0/23</span>
            )}
          </p>
        </div>
        {ultrawide ? (
          <div className="hidden h-4 w-28 overflow-hidden rounded-sm 2xl:flex" aria-hidden="true">
            {patterns.map((item) => (
              <span
                key={item.id}
                title={item.name}
                className={clsx(
                  "h-full min-w-0 flex-1",
                  done.includes(item.id) ? "bg-primary" : seen.includes(item.id) ? "bg-amber" : "bg-line",
                  item.id === pattern.id && "outline outline-2 outline-offset-1 outline-ink",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--color-primary)" />
      <rect x="7" y="7" width="18" height="7" rx="1.5" fill="var(--color-on-primary)" />
      <rect x="7" y="16.5" width="18" height="3" rx="1" fill="var(--color-on-primary)" opacity="0.7" />
      <rect x="7" y="21.5" width="11" height="3" rx="1" fill="var(--color-on-primary)" opacity="0.7" />
    </svg>
  );
}

function Sidebar({
  open,
  onToggle,
  pattern,
  step,
  filter,
  query,
  topOnly,
  onTopOnly,
  done,
  seen,
  searchRef,
  onFilter,
  onQuery,
  onPick,
  onStep,
  onResetProgress,
  embedded = false,
}: {
  open: boolean;
  onToggle: () => void;
  pattern: Pattern;
  step: number;
  filter: Filter;
  query: string;
  topOnly: boolean;
  onTopOnly: (value: boolean) => void;
  done: string[];
  seen: string[];
  searchRef: RefObject<HTMLInputElement | null>;
  onFilter: (filter: Filter) => void;
  onQuery: (query: string) => void;
  onPick: (id: string) => void;
  onStep: (index: number) => void;
  onResetProgress: () => void;
  embedded?: boolean;
}) {
  const listed = topOnly ? patterns.filter((item) => item.frequency === "high") : patterns;
  const tally = {
    all: listed.length,
    creational: listed.filter((item) => item.category === "creational").length,
    structural: listed.filter((item) => item.category === "structural").length,
    behavioral: listed.filter((item) => item.category === "behavioral").length,
  };
  const needle = query.trim().toLowerCase();
  const groups: CategoryId[] = ["creational", "structural", "behavioral"];

  if (!open) {
    return (
      <aside id="sidebar-nav" className="order-3 rounded-xl border border-line bg-surface shadow-sm md:order-1 md:min-h-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          aria-label="Show design patterns"
          className="flex h-11 w-full items-center justify-center gap-2 text-sm font-bold tracking-wide md:h-full md:flex-col"
        >
          <PanelLeftOpen className="size-4" />
          <span className="md:hidden">Patterns</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      id="sidebar-nav"
      className={clsx(
        "flex min-w-0 flex-col bg-surface",
        embedded
          ? "h-full min-h-0 overflow-hidden"
          : "order-3 rounded-xl border border-line shadow-sm md:order-1 md:h-full md:min-h-0 md:overflow-hidden",
      )}
    >
      <div className="shrink-0 border-b border-line px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xs font-bold tracking-widest">DESIGN PATTERNS</h1>
          {!embedded ? (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded
              aria-label="Hide design patterns"
              className="grid size-11 place-items-center rounded-md border border-line text-ink hover:bg-canvas"
            >
              <PanelLeftClose className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="mt-2 flex gap-1" role="group" aria-label="Pattern frequency">
          <button
            type="button"
            aria-pressed={!topOnly}
            onClick={() => onTopOnly(false)}
            className={clsx(
              "h-9 flex-1 rounded-md text-xs font-semibold",
              !topOnly ? "bg-wash text-primary" : "text-muted hover:bg-canvas",
            )}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={topOnly}
            onClick={() => onTopOnly(true)}
            className={clsx(
              "inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-md text-xs font-semibold",
              topOnly ? "bg-amber-soft text-ink" : "text-muted hover:bg-canvas",
            )}
          >
            <Flame className="size-3.5 text-amber" />
            Top patterns
          </button>
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search patterns"
            aria-label="Search patterns"
            className="h-10 w-full rounded-lg border border-line bg-canvas pr-3 pl-8 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilter(item.id)}
              className={clsx(
                "h-9 rounded-md text-xs font-semibold",
                filter === item.id ? "bg-wash text-primary" : "text-muted hover:bg-canvas",
              )}
            >
              {item.label}
              <span className="ml-1 font-mono text-xs opacity-70">{tally[item.id]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2">
        {groups.map((group) => {
          if (filter !== "all" && filter !== group) return null;
          const items = patterns.filter((item) => {
            if (item.category !== group) return false;
            if (topOnly && item.frequency !== "high") return false;
            if (!needle) return true;
            return (
              item.name.toLowerCase().includes(needle) ||
              item.tagline.toLowerCase().includes(needle) ||
              item.aka.toLowerCase().includes(needle)
            );
          });
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 font-mono text-xs tracking-wide text-muted">
                {CATEGORY_COPY[group].label}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active = item.id === pattern.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onPick(item.id)}
                        className={clsx(
                          "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left",
                          active ? "border-select-line bg-select" : "border-transparent hover:bg-canvas",
                        )}
                        aria-expanded={active}
                      >
                        <StatusDot done={done.includes(item.id)} seen={seen.includes(item.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            <span className="truncate">{item.name}</span>
                            {item.frequency === "high" ? (
                              <span title="Essential: frequently used in production and interviews">
                                <Flame className="size-3.5 shrink-0 text-amber" aria-hidden="true" />
                                <span className="sr-only">Essential: frequently used in production and interviews</span>
                              </span>
                            ) : null}
                          </span>
                          <span className="block truncate text-xs text-muted">{item.tagline}</span>
                        </span>
                        <ChevronRight
                          className={clsx("mt-0.5 size-4 shrink-0 text-muted transition-transform", active && "rotate-90")}
                        />
                      </button>
                      {active ? (
                        <ol className="mt-1 mb-2 ml-4 space-y-0.5 border-l border-line pl-2">
                          {(item.id === pattern.id ? pattern.steps : item.steps).map((itemStep, index) => (
                            <li key={itemStep.title}>
                              <button
                                type="button"
                                onClick={() => onStep(index)}
                                className={clsx(
                                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left",
                                  index === step ? "bg-wash text-primary" : "hover:bg-canvas",
                                )}
                              >
                                <span
                                  className={clsx(
                                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-mono text-xs",
                                    index === step ? "bg-primary text-on-primary" : "bg-canvas text-muted",
                                  )}
                                >
                                  {index + 1}
                                </span>
                                <span>
                                  <span className="block text-xs font-semibold tracking-wide uppercase">
                                    {itemStep.title}
                                  </span>
                                  <span className={clsx("block text-xs", index === step ? "text-ink" : "text-muted")}>
                                    {itemStep.call}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {groups.every((group) => {
          if (filter !== "all" && filter !== group) return true;
          return !patterns.some((item) => {
            if (item.category !== group) return false;
            if (topOnly && item.frequency !== "high") return false;
            if (!needle) return true;
            return item.name.toLowerCase().includes(needle) || item.tagline.toLowerCase().includes(needle);
          });
        }) ? (
          <p className="px-2 py-6 text-center text-sm text-muted">No pattern matches that search.</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line px-3 py-2">
        <p className="text-xs leading-snug text-muted">23 Gang of Four patterns, as LLD drills.</p>
        <button type="button" onClick={onResetProgress} className="shrink-0 text-xs font-semibold text-primary">
          Reset
        </button>
      </div>
    </aside>
  );
}

function StatusDot({ done, seen }: { done: boolean; seen: boolean }) {
  return (
    <span
      className={clsx(
        "mt-1 grid size-2.5 shrink-0 place-items-center rounded-full",
        done ? "bg-primary" : seen ? "bg-amber" : "border border-muted bg-surface",
      )}
      aria-hidden="true"
    >
      {done ? <Check className="size-2 text-on-primary" /> : null}
    </span>
  );
}

function Trace({
  pattern,
  step,
  playing,
  speed,
  showFlowBall,
  onToggleFlowBall,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
  onSpeed,
  onPrev,
  onNext,
  onPlay,
  onReset,
  onSeek,
  compact = false,
  dense = false,
}: {
  pattern: Pattern;
  step: number;
  playing: boolean;
  speed: number;
  showFlowBall: boolean;
  onToggleFlowBall: () => void;
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
  onSpeed: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  compact?: boolean;
  dense?: boolean;
}) {
  const activeRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [step, pattern.id]);

  return (
    <section
      id="call-trace-section"
      className={clsx(
        "flex shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm",
        compact
          ? "h-72"
          : dense
            ? "max-h-[220px] min-h-[160px] flex-1"
            : "h-64 shrink-0 sm:h-72 md:h-60",
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-canvas/60 px-3 py-1.5">
        <h2 className="text-xs font-bold tracking-widest">CALL TRACE</h2>
        <p className="hidden font-mono text-xs text-muted lg:block">Space plays · arrows step</p>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleFlowBall}
            aria-pressed={showFlowBall}
            aria-label={showFlowBall ? "Hide flow ball" : "Show flow ball"}
            title={showFlowBall ? "Hide flow ball" : "Show flow ball"}
            className={clsx(
              "inline-flex h-9 items-center gap-1 rounded-md border px-2 text-xs font-semibold",
              showFlowBall ? "border-primary bg-wash text-primary" : "border-line text-muted",
            )}
          >
            {showFlowBall ? <CircleDot className="size-3.5" /> : <Circle className="size-3.5" />}
            <span className="hidden sm:inline">Ball</span>
          </button>
          <button
            type="button"
            onClick={onSpeed}
            className="h-9 min-w-12 rounded-md border border-line px-2 font-mono text-xs font-semibold"
            aria-label="Cycle playback speed"
          >
            {speed}×
          </button>
          <IconButton label="Previous step" onClick={onPrev}>
            <SkipBack className="size-4" />
          </IconButton>
          <button
            type="button"
            onClick={onPlay}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-bold tracking-wide text-on-primary"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "PAUSE" : "PLAY"}
          </button>
          <IconButton label="Next step" onClick={onNext}>
            <SkipForward className="size-4" />
          </IconButton>
          <IconButton label="Reset to the first step" onClick={onReset}>
            <RotateCcw className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain touch-pan-x">
        <table
          className={clsx("w-full border-collapse text-left text-xs", (compact || dense) && "min-w-[34rem]")}
        >
          <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-muted">
            <tr className="font-mono tracking-wide">
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="hidden px-2 py-1.5 font-medium sm:table-cell">Time</th>
              <th className="px-2 py-1.5 font-medium">Source</th>
              <th className="px-2 py-1.5 font-medium">Destination</th>
              <th className="px-2 py-1.5 font-medium">Call</th>
              <th className="hidden px-2 py-1.5 font-medium md:table-cell">Info</th>
            </tr>
          </thead>
          <tbody>
            {pattern.steps.map((item, index) => {
              const active = index === step;
              const reached = index <= step;
              const linked = rowLinked(pattern, item, hoveredEntityId, hoveredAlsoId);
              return (
                <tr
                  key={item.title}
                  ref={active ? activeRef : undefined}
                  onClick={() => onSeek(index)}
                  onMouseEnter={() => onHover(item.to ?? item.from ?? null, item.from ?? null)}
                  onMouseLeave={() => onHover(null)}
                  className={clsx(
                    "cursor-pointer border-b border-line",
                    active && item.kind === "problem" && "row-problem",
                    active && item.kind !== "problem" && "row-live bg-wash",
                    !active && linked && "row-link",
                    !active && !linked && "hover:bg-canvas",
                    !reached && "text-muted",
                  )}
                >
                  <td className="px-2 py-2">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={clsx(
                          "grid size-5 place-items-center rounded-full font-mono text-xs",
                          kindClass(item.kind, reached),
                        )}
                      >
                        {index + 1}
                      </span>
                      {active && playing ? (
                        <span className="play-pip size-1.5 rounded-full bg-primary" aria-hidden="true" />
                      ) : null}
                    </span>
                  </td>
                  <td className="hidden px-2 py-2 font-mono sm:table-cell">{(index * 0.018).toFixed(3)}s</td>
                  <td className={clsx("px-2 py-2 font-semibold", roleText(pattern, item.from))}>
                    {objectName(pattern, item.from)}
                  </td>
                  <td className={clsx("px-2 py-2 font-semibold", roleText(pattern, item.to))}>
                    {objectName(pattern, item.to)}
                  </td>
                  <td className="px-2 py-2 font-mono font-medium">{item.call}</td>
                  <td className="hidden max-w-xs truncate px-2 py-2 md:table-cell">
                    {item.kind === "problem" ? problemNote(item) : item.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function kindClass(kind: StepKind, reached: boolean): string {
  if (!reached) return "bg-canvas text-muted";
  if (kind === "problem") return "bg-role-alert text-on-primary";
  if (kind === "create") return "bg-role-product text-on-primary";
  if (kind === "return" || kind === "note") return "bg-ink text-on-primary";
  return "bg-role-creator text-on-primary";
}

function rowLinked(
  pattern: Pattern,
  item: PatternStep,
  hoveredEntityId: string | null,
  hoveredAlsoId: string | null,
): boolean {
  return [item.from, item.to].some((id) => {
    const object = pattern.objects.find((entry) => entry.id === id);
    if (!object) return false;
    return entityMatches(object, hoveredEntityId) || entityMatches(object, hoveredAlsoId);
  });
}

function roleText(pattern: Pattern, id: string | undefined): string {
  const object = pattern.objects.find((entry) => entry.id === id);
  if (!object) return "";
  const role = roleOf(object.stereotype);
  if (role === "client") return "text-role-client";
  if (role === "product") return "text-role-product";
  return "text-role-creator";
}

function problemNote(item: PatternStep): string {
  if (/\bnew\b/.test(item.call)) return "Direct instantiation couples the caller to a concrete platform.";
  return item.note;
}

function participantTone(role: string): string {
  if (/client/i.test(role)) return "bg-role-client";
  if (/product/i.test(role)) return "bg-role-product";
  return "bg-role-creator";
}

function objectName(pattern: Pattern, id: string | undefined): string {
  if (!id) return "—";
  return pattern.objects.find((object) => object.id === id)?.name ?? id;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-md border border-line text-ink hover:bg-canvas"
    >
      {children}
    </button>
  );
}

function Overview({
  pattern,
  hoveredEntityId,
  hoveredAlsoId,
  onHover,
  onRelated,
  onQuizSolved,
  reading,
  onToggleReading,
  onCollapse,
  showCode = true,
  panelControls = true,
}: {
  pattern: Pattern;
  hoveredEntityId: string | null;
  hoveredAlsoId: string | null;
  onHover: (id: string | null, also?: string | null) => void;
  onRelated: (id: string) => void;
  onQuizSolved?: (patternId: string) => void;
  reading: boolean;
  onToggleReading: () => void;
  onCollapse: () => void;
  showCode?: boolean;
  panelControls?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const group = CATEGORY_COPY[pattern.category];

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(pattern.snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <aside
      className={clsx(
        "flex min-h-0 min-w-0 flex-col rounded-xl border border-line bg-surface shadow-sm",
        panelControls ? "h-full overflow-hidden" : "overflow-visible",
      )}
    >
      <div className="shrink-0 border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-bold tracking-widest">PATTERN OVERVIEW</h2>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-wash px-2 py-0.5 font-mono text-xs font-medium text-primary">
              {group.label}
            </span>
            {panelControls ? (
              <>
                <button
                  type="button"
                  onClick={onToggleReading}
                  aria-pressed={reading}
                  aria-label={reading ? "Restore the canvas" : "Focus reading"}
                  title={reading ? "Restore the canvas" : "Focus reading"}
                  className="hidden size-11 place-items-center rounded-lg border border-line md:grid"
                >
                  {reading ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={onCollapse}
                  aria-label="Collapse reading panel"
                  title="Collapse reading panel"
                  className="hidden size-11 place-items-center rounded-lg border border-line md:grid"
                >
                  <PanelRightClose className="size-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">{pattern.name}</p>
        <p className="text-sm text-muted">{pattern.tagline}</p>
        <p className="mt-2 text-sm leading-relaxed">{pattern.intent}</p>
      </div>
      <div className={clsx(panelControls && "min-h-0 flex-1 overflow-x-hidden overflow-y-auto")}>
        <DiagnosticCard patternId={pattern.id} />
        {pattern.complexityImpact ? <ComplexityCard impact={pattern.complexityImpact} /> : null}
        <dl className="px-4">
          <Fact k="Also known as" v={pattern.aka} />
          <Fact k="Intent group" v={group.label} />
          <Fact k="Participants" v={String(pattern.participants.length)} />
          <Fact k="Source" v="Gang of Four, 1994" />
        </dl>
        <div className="space-y-4 px-4 py-4">
          <CollisionCard patternId={pattern.id} onOpen={onRelated} />
          <SpotQuiz patternId={pattern.id} onSolved={onQuizSolved} />
          <div className="rounded-lg border border-line bg-wash px-3 py-2.5">
            <p className="font-mono text-xs font-medium tracking-wide text-primary">LLD PROMPT</p>
            <p className="mt-1 text-sm leading-relaxed">{pattern.prompt}</p>
          </div>
          <Block title="The problem" body={pattern.problem} />
          <Block title="The move" body={pattern.solution} />
          <section>
            <h3 className="font-mono text-xs tracking-wide text-muted">PARTICIPANTS</h3>
            <ul className="mt-2 space-y-2">
              {pattern.participants.map((participant) => (
                <li key={participant.role}>
                  <p className="text-sm font-semibold">
                    <span
                      className={clsx(
                        "mr-1.5 inline-block rounded-full px-1.5 py-0.5 align-middle font-mono text-xs font-semibold text-on-primary",
                        participantTone(participant.role),
                      )}
                    >
                      {participant.role}
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-muted">{participant.does}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-mono text-xs tracking-wide text-muted">DESIGN CHECK</h3>
            <ol className="mt-2 space-y-1.5">
              {pattern.checks.map((check, index) => (
                <li key={check} className="flex gap-2 text-sm leading-relaxed">
                  <span className="font-mono text-xs text-primary">{index + 1}</span>
                  <span>{check}</span>
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="font-mono text-xs tracking-wide text-muted">USE WHEN</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted">
              {pattern.useWhen.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <TradeoffCard pattern={pattern} />
          <section>
            <h3 className="font-mono text-xs tracking-wide text-muted">RELATED</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {pattern.related.map((id) => {
                const related = findPattern(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onRelated(id)}
                    className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold hover:border-primary hover:text-primary"
                  >
                    {related.name}
                  </button>
                );
              })}
            </div>
          </section>
          <ReferenceCards pattern={pattern} />
          {showCode ? (
            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-mono text-xs tracking-wide text-muted">TYPESCRIPT</h3>
                <button type="button" onClick={() => void copySnippet()} className="text-xs font-semibold text-primary">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="max-h-96 overflow-x-auto overflow-y-auto">
                <CodeView
                  snippet={pattern.snippet}
                  objects={pattern.objects}
                  hoveredEntityId={hoveredEntityId}
                  hoveredAlsoId={hoveredAlsoId}
                  onHover={onHover}
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2">
      <dt className="font-mono text-xs tracking-wide text-muted">{k}</dt>
      <dd className="text-right text-sm font-medium">{v}</dd>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h3 className="font-mono text-xs tracking-wide text-muted">{title.toUpperCase()}</h3>
      <p className="mt-1 text-sm leading-relaxed">{body}</p>
    </section>
  );
}
