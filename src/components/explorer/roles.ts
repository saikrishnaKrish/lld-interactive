import type { DiagramObject, PatternStep, StepKind } from "@/data/types";

export type Role = "client" | "creator" | "product";

export type Lens = "problem" | "solution";

export type EdgeMotion = {
  color: string;
  dash?: string;
  particle: "pulse" | "spawn" | "glide";
};

const CLIENTS = new Set(["client", "director"]);

const PRODUCTS = new Set([
  "product",
  "concrete",
  "leaf",
  "component",
  "subsystem",
  "flyweight",
  "adaptee",
  "resource",
  "clone",
  "prototype",
  "singleton",
  "element",
  "observer",
  "state",
  "implementor",
  "colleague",
  "receiver",
  "visitor",
  "terminal",
  "subclass",
  "snapshot",
  "caretaker",
]);

export function roleOf(stereotype: string): Role {
  const key = stereotype.toLowerCase();
  if (CLIENTS.has(key)) return "client";
  if (PRODUCTS.has(key)) return "product";
  return "creator";
}

function namesLink(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left === right) return true;
  const short = left.length <= right.length ? left : right;
  const long = left.length <= right.length ? right : left;
  if (short.length < 4) return false;
  return long.includes(short);
}

export function entityMatches(object: DiagramObject, hovered: string | null): boolean {
  if (!hovered) return false;
  if (object.id === hovered || object.name.toLowerCase() === hovered.toLowerCase()) return true;
  return namesLink(object.name, hovered);
}

export function hoverTokenFor(name: string, objects: DiagramObject[]): string {
  const hits = objects.filter((object) => entityMatches(object, name));
  if (hits.length === 1) return hits[0].id;
  return name;
}

export function roleForType(name: string, objects: DiagramObject[]): Role {
  const hit = objects.find((object) => entityMatches(object, name));
  return hit ? roleOf(hit.stereotype) : "creator";
}

export function problemHint(step: PatternStep): string {
  if (/\bnew\b/.test(step.call)) {
    return "Direct instantiation couples the caller to a concrete platform.";
  }
  return step.note;
}

export function edgeMotion(step: PatternStep): EdgeMotion {
  const isNew = /\bnew\b/.test(step.call);
  if (step.kind === "problem") {
    return {
      color: "var(--color-role-alert)",
      dash: isNew ? "2 7" : undefined,
      particle: isNew ? "spawn" : "pulse",
    };
  }
  if (step.kind === "create" || isNew) {
    return { color: "var(--color-role-product)", dash: "2 7", particle: "spawn" };
  }
  if (step.kind === "note") {
    return { color: "var(--color-role-creator)", dash: "6 5", particle: "glide" };
  }
  return { color: "var(--color-role-creator)", particle: "pulse" };
}

export function kindTone(kind: StepKind): Role | "alert" {
  if (kind === "problem") return "alert";
  if (kind === "create") return "product";
  return "creator";
}

export type LineMark = { badge: "Abstract" | "Override" | "Concrete"; role: Role };

export type CodeBlock = {
  name: string;
  badge: "Abstract" | "Concrete";
  role: Role;
  code: string;
  marks: (LineMark | null)[];
};

const DECLARATION = /^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum)\s+(\w+)/;

function isSignature(line: string): boolean {
  const text = line.trim();
  if (!text || text.startsWith("//") || text.startsWith("*") || text.startsWith("/*")) return false;
  if (/^(return|const|let|if|for|while|switch|new|else|case|throw|import)\b/.test(text)) return false;
  if (/^(?:export\s+)?(?:abstract\s+)?(?:class|interface|type|enum)\b/.test(text)) return false;
  return /\w\s*\(/.test(text);
}

export function parseSnippet(snippet: string, objects: DiagramObject[]): CodeBlock[] {
  const lines = snippet.replace(/\r\n/g, "\n").split("\n");
  const starts: { index: number; name: string; line: string }[] = [];
  lines.forEach((line, index) => {
    const match = line.match(DECLARATION);
    if (match) starts.push({ index, name: match[1] ?? "", line });
  });
  if (starts.length === 0) {
    return [
      {
        name: "",
        badge: "Concrete",
        role: "creator",
        code: snippet.trim(),
        marks: [],
      },
    ];
  }

  return starts.map((start, index) => {
    const end = starts[index + 1]?.index ?? lines.length;
    const chunk = lines.slice(start.index, end);
    const code = chunk.join("\n").trimEnd();
    const isInterface = /\binterface\b/.test(start.line);
    const isAbstractClass = /\babstract\s+class\b/.test(start.line);
    const isSubclass = /\b(extends|implements)\b/.test(code);
    const badge = isInterface || isAbstractClass ? "Abstract" : "Concrete";
    const role = roleForType(start.name, objects);
    const marks = chunk.map((line, lineIndex) => markLine(line, lineIndex === 0, isInterface, isAbstractClass, isSubclass, role));
    return { name: start.name, badge, role, code, marks };
  });
}

function markLine(
  line: string,
  isDeclaration: boolean,
  isInterface: boolean,
  isAbstractClass: boolean,
  isSubclass: boolean,
  role: Role,
): LineMark | null {
  if (isDeclaration || !isSignature(line)) return null;
  if (isInterface || /\babstract\b/.test(line)) return { badge: "Abstract", role: "creator" };
  if (isSubclass) return { badge: "Override", role };
  if (isAbstractClass) return { badge: "Concrete", role: "creator" };
  return null;
}
