export type CategoryId = "creational" | "structural" | "behavioral";

export type PatternFrequency = "high" | "medium" | "rare";

export type PatternQuiz = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type DiagramObject = {
  id: string;
  name: string;
  stereotype: string;
  x: number;
  y: number;
  lines: string[];
};

export type DiagramLink = {
  from: string;
  to: string;
  label: string;
  dashed?: boolean;
};

export type StepKind = "problem" | "create" | "call" | "return" | "note";

export type PatternStep = {
  title: string;
  blurb: string;
  call: string;
  note: string;
  kind: StepKind;
  from?: string;
  to?: string;
  updates?: { id: string; lines: string[] }[];
  reveal?: string[];
};

export type ComplexityImpact = {
  timeOrScaleMetric: {
    antiPattern: string;
    withPattern: string;
  };
  coupling: {
    antiPattern: string;
    withPattern: string;
  };
  blastRadius: {
    filesModifiedToAddVariant: string;
  };
  keyWin: string;
};

export type Scenario = {
  id: string;
  label: string;
  shortLabel: string;
  domain: string;
  participants?: { role: string; does: string }[];
  prompt?: string;
  complexityImpact?: ComplexityImpact;
  objects: DiagramObject[];
  links: DiagramLink[];
  steps: PatternStep[];
  snippet: string;
};

export type Pattern = {
  id: string;
  name: string;
  aka: string;
  category: CategoryId;
  frequency?: PatternFrequency;
  tagline: string;
  intent: string;
  problem: string;
  solution: string;
  participants: { role: string; does: string }[];
  useWhen: string[];
  checks: string[];
  pros: string[];
  cons: string[];
  avoid: string;
  related: string[];
  prompt: string;
  objects: DiagramObject[];
  links: DiagramLink[];
  steps: PatternStep[];
  snippet: string;
  scenarios?: Scenario[];
  complexityImpact?: ComplexityImpact;
  quiz?: PatternQuiz;
};

export const CATEGORY_COPY: Record<CategoryId, { label: string; blurb: string }> = {
  creational: {
    label: "Creational",
    blurb: "Object creation, without welding callers to concrete classes.",
  },
  structural: {
    label: "Structural",
    blurb: "Compose classes and objects so the structure can still change.",
  },
  behavioral: {
    label: "Behavioral",
    blurb: "Move algorithms and responsibilities between objects.",
  },
};
