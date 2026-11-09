import type { ComplexityImpact, Pattern, PatternStep, Scenario, StepKind } from "../types";

export type Actor = {
  id: string;
  name: string;
  stereotype: string;
  lines: string[];
};

export function actor(id: string, name: string, stereotype: string, lines: string[]): Actor {
  return { id, name, stereotype, lines };
}

export function beat(
  title: string,
  blurb: string,
  call: string,
  note: string,
  ...lines: { id: string; lines: string[] }[]
): Beat {
  return { title, blurb, call, note, lines: lines.length ? lines : undefined };
}

export type Beat = {
  title: string;
  blurb: string;
  call: string;
  note: string;
  kind?: StepKind;
  from?: string;
  to?: string;
  reveal?: string[];
  lines?: { id: string; lines: string[] }[];
};

type Meta = {
  id: string;
  label: string;
  shortLabel: string;
  domain: string;
  prompt: string;
  participants: { role: string; does: string }[];
  snippet: string;
};

export function classicScenario(
  pattern: Pattern,
  meta: { id: string; label: string; shortLabel: string; domain: string },
): Scenario {
  return {
    ...meta,
    participants: pattern.participants,
    prompt: pattern.prompt,
    objects: pattern.objects,
    links: pattern.links,
    steps: pattern.steps,
    snippet: pattern.snippet,
  };
}

export function fan(
  spec: Meta & {
    client: Actor;
    core: Actor;
    a: Actor;
    b: Actor;
    c?: Actor;
    linkLabel?: string;
    dashed?: boolean;
    showAll?: boolean;
    beats: Beat[];
  },
): Scenario {
  const { client, core, a, b, c } = spec;
  const objects = [
    { ...client, x: 16, y: 48 },
    { ...core, x: 46, y: 46 },
    { ...a, x: 80, y: c ? 20 : 26 },
    { ...b, x: 80, y: c ? 50 : 72 },
    ...(c ? [{ ...c, x: 80, y: 78 }] : []),
  ];
  const dashed = spec.dashed !== false;
  const label = spec.linkLabel ?? "creates";
  const links = [
    { from: client.id, to: core.id, label: "uses" },
    { from: core.id, to: a.id, label, dashed },
    { from: core.id, to: b.id, label, dashed },
    ...(c ? [{ from: core.id, to: c.id, label, dashed }] : []),
  ];
  const hidden = spec.showAll ? [] : [b.id, ...(c ? [c.id] : [])];
  const defaults: Pick<PatternStep, "kind" | "from" | "to" | "reveal">[] = [
    { kind: "problem", from: client.id, to: a.id },
    { kind: "call", from: client.id, to: core.id },
    { kind: "create", from: core.id, to: a.id },
    { kind: "note", from: client.id, to: core.id, reveal: hidden },
    { kind: "call", from: core.id, to: b.id },
  ];
  return pack(
    spec,
    objects,
    links,
    spec.beats.map((beat, index) => toStep(beat, defaults[index] ?? defaults[defaults.length - 1])),
    impactFor(client.name, core.name, a.name, b.name, spec.beats[1]?.call ?? "the same call"),
  );
}

export function chain(
  spec: Meta & {
    nodes: [Actor, Actor, Actor, Actor];
    beats: Beat[];
  },
): Scenario {
  const at = [
    { x: 12, y: 48 },
    { x: 38, y: 48 },
    { x: 62, y: 48 },
    { x: 88, y: 48 },
  ];
  const objects = spec.nodes.map((node, index) => ({ ...node, ...at[index] }));
  const links = [0, 1, 2].map((index) => ({
    from: spec.nodes[index].id,
    to: spec.nodes[index + 1].id,
    label: "next",
  }));
  const [n0, n1, n2, n3] = spec.nodes;
  const defaults: Pick<PatternStep, "kind" | "from" | "to">[] = [
    { kind: "problem", from: n0.id, to: n3.id },
    { kind: "call", from: n0.id, to: n1.id },
    { kind: "call", from: n1.id, to: n2.id },
    { kind: "call", from: n2.id, to: n3.id },
    { kind: "note", from: n0.id, to: n1.id },
  ];
  return pack(
    spec,
    objects,
    links,
    spec.beats.map((beat, index) => toStep(beat, defaults[index] ?? defaults[defaults.length - 1])),
    impactFor(n0.name, n1.name, n3.name, n2.name, spec.beats[1]?.call ?? "the same call"),
  );
}

function toStep(beat: Beat, fallback: Pick<PatternStep, "kind" | "from" | "to" | "reveal">): PatternStep {
  return {
    title: beat.title,
    blurb: beat.blurb,
    call: beat.call,
    note: beat.note,
    kind: beat.kind ?? fallback.kind,
    from: beat.from ?? fallback.from,
    to: beat.to ?? fallback.to,
    reveal: beat.reveal ?? fallback.reveal,
    updates: beat.lines,
  };
}

function impactFor(client: string, core: string, concrete: string, variant: string, stableCall: string): ComplexityImpact {
  return {
    timeOrScaleMetric: {
      antiPattern: `O(N) edits wherever ${client} constructs ${concrete}`,
      withPattern: `O(1): ${client} still calls ${stableCall}`,
    },
    coupling: {
      antiPattern: `${client} depends on ${concrete} directly`,
      withPattern: `${client} depends only on ${core}`,
    },
    blastRadius: {
      filesModifiedToAddVariant: `Every caller (high risk) vs 1 new ${variant} (${concrete} untouched)`,
    },
    keyWin: `Adding ${variant} does not rewrite ${client}.`,
  };
}

function pack(
  spec: Meta,
  objects: Scenario["objects"],
  links: Scenario["links"],
  steps: PatternStep[],
  complexityImpact?: ComplexityImpact,
): Scenario {
  return {
    id: spec.id,
    label: spec.label,
    shortLabel: spec.shortLabel,
    domain: spec.domain,
    prompt: spec.prompt,
    participants: spec.participants,
    complexityImpact,
    objects,
    links,
    steps,
    snippet: spec.snippet.trim(),
  };
}
