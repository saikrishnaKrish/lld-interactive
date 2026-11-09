import { abstractFactoryScenarios } from "./abstract-factory-scenarios";
import { scenariosFor } from "./scenarios";
import { complexityFor } from "./complexity";
import { quizFor } from "./quizzes";
import { behavioral } from "./behavioral";
import { creational } from "./creational";
import { factoryScenarios } from "./factory-scenarios";
import { structural } from "./structural";
import type { CategoryId, Pattern, Scenario } from "./types";

function withScenarios(pattern: Pattern): Pattern {
  const complexityImpact = complexityFor(pattern.id);
  const quiz = quizFor(pattern.id);
  if (pattern.id === "factory-method") {
    return { ...pattern, complexityImpact, quiz, scenarios: factoryScenarios(pattern) };
  }
  if (pattern.id === "abstract-factory") {
    return { ...pattern, complexityImpact, quiz, scenarios: abstractFactoryScenarios(pattern) };
  }
  const scenarios = scenariosFor(pattern);
  if (scenarios) return { ...pattern, complexityImpact, quiz, scenarios };
  return { ...pattern, complexityImpact, quiz };
}

export const patterns: Pattern[] = [...creational, ...structural, ...behavioral].map(withScenarios);

export const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));

export function findPattern(id: string | undefined): Pattern {
  if (!id) return patterns[0];
  return patternById.get(id) ?? patterns[0];
}

export function isKnownPattern(id: string | undefined): boolean {
  return !!id && patternById.has(id);
}

export function scenariosOf(pattern: Pattern): Scenario[] {
  if (pattern.scenarios && pattern.scenarios.length > 0) return pattern.scenarios;
  return [
    {
      id: "classic",
      label: "Classic",
      shortLabel: "Classic",
      domain: "Textbook",
      participants: pattern.participants,
      prompt: pattern.prompt,
      objects: pattern.objects,
      links: pattern.links,
      steps: pattern.steps,
      snippet: pattern.snippet,
    },
  ];
}

export function resolvePattern(pattern: Pattern, scenarioId: string): Pattern {
  const scenarios = scenariosOf(pattern);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  if (!scenario) return pattern;
  return {
    ...pattern,
    prompt: scenario.prompt ?? pattern.prompt,
    participants: scenario.participants ?? pattern.participants,
    complexityImpact: scenario.complexityImpact ?? pattern.complexityImpact,
    objects: scenario.objects,
    links: scenario.links,
    steps: scenario.steps,
    snippet: scenario.snippet,
  };
}

export function objectLines(pattern: Pattern, step: number, id: string): string[] {
  const base = pattern.objects.find((object) => object.id === id)?.lines ?? [];
  let lines = base;
  for (let i = 0; i <= step; i += 1) {
    const update = pattern.steps[i]?.updates?.find((item) => item.id === id);
    if (update) lines = update.lines;
  }
  return lines;
}

export function isVisible(pattern: Pattern, step: number, id: string): boolean {
  const gated = new Set<string>();
  for (const item of pattern.steps) {
    for (const revealed of item.reveal ?? []) gated.add(revealed);
  }
  if (!gated.has(id)) return true;
  for (let i = 0; i <= step; i += 1) {
    if (pattern.steps[i]?.reveal?.includes(id)) return true;
  }
  return false;
}

export function counts(): Record<CategoryId | "all", number> {
  return {
    all: patterns.length,
    creational: patterns.filter((pattern) => pattern.category === "creational").length,
    structural: patterns.filter((pattern) => pattern.category === "structural").length,
    behavioral: patterns.filter((pattern) => pattern.category === "behavioral").length,
  };
}
