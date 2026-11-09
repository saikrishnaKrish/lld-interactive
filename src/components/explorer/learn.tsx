import clsx from "clsx";
import { BookOpen, Compass, X, Zap } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { findPattern } from "@/data/catalog";
import {
  collisionsFor,
  diagnosticFor,
  DILEMMAS,
  questionById,
  readingsFor,
  type DecisionChoice,
} from "@/data/guidance";
import { quizzesFor } from "@/data/quizzes";
import type { ComplexityImpact, Pattern, PatternQuiz } from "@/data/types";

export function DiagnosticCard({ patternId }: { patternId: string }) {
  const diagnostic = diagnosticFor(patternId);
  return (
    <section className="border-b border-line px-4 py-3">
      <h3 className="font-mono text-xs tracking-wide text-muted">WHEN TO REACH FOR THIS</h3>
      <dl className="mt-2 space-y-2">
        <div>
          <dt className="text-xs font-semibold text-role-alert">The red flag in your code</dt>
          <dd className="text-sm leading-relaxed">{diagnostic.redFlag}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-primary">When you'll actually need this</dt>
          <dd className="text-sm leading-relaxed">{diagnostic.whenToReachFor}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-ink">Remember this</dt>
          <dd className="text-sm leading-relaxed">{diagnostic.ruleOfThumb}</dd>
        </div>
      </dl>
    </section>
  );
}

export function ComplexityCard({ impact }: { impact: ComplexityImpact }) {
  const rows = [
    { label: "Scale", anti: impact.timeOrScaleMetric.antiPattern, pattern: impact.timeOrScaleMetric.withPattern },
    { label: "Coupling", anti: impact.coupling.antiPattern, pattern: impact.coupling.withPattern },
  ];
  return (
    <section className="border-b border-line px-4 py-3" aria-label="Why the refactor wins">
      <h3 className="font-mono text-xs tracking-wide text-muted">WHY THE REFACTOR WINS</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <p className="font-mono text-xs font-semibold text-role-alert">Anti-pattern</p>
        <p className="font-mono text-xs font-semibold text-primary">With the pattern</p>
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <div className="rounded-lg border border-line bg-role-alert-soft px-2.5 py-2">
              <p className="font-mono text-xs text-muted">{row.label}</p>
              <p className="mt-0.5 text-sm leading-snug">{row.anti}</p>
            </div>
            <div className="rounded-lg border border-line bg-wash px-2.5 py-2">
              <p className="font-mono text-xs text-muted">{row.label}</p>
              <p className="mt-0.5 text-sm leading-snug">{row.pattern}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg border border-line px-2.5 py-2">
        <p className="font-mono text-xs text-muted">Files to add a variant</p>
        <p className="mt-0.5 text-sm leading-snug">{impact.blastRadius.filesModifiedToAddVariant}</p>
      </div>
      <p className="mt-2 rounded-lg bg-amber-soft px-2.5 py-2 text-sm font-medium leading-snug">{impact.keyWin}</p>
    </section>
  );
}

export function CollisionCard({ patternId, onOpen }: { patternId: string; onOpen: (id: string) => void }) {
  const items = collisionsFor(patternId);
  return (
    <section className="rounded-lg border border-line bg-canvas px-3 py-2.5">
      <h3 className="font-mono text-xs tracking-wide text-muted">EASY TO MIX UP</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.title}>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-sm leading-relaxed text-muted">{item.why}</p>
            {item.patternId ? (
              <button
                type="button"
                onClick={() => onOpen(item.patternId!)}
                className="mt-1 text-xs font-semibold text-primary"
              >
                Open {findPattern(item.patternId).name}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function quizBank(patternId: string): PatternQuiz[] {
  const own = quizzesFor(patternId);
  if (own.length > 0) return own;
  return [...DILEMMAS]
    .sort((a, b) => Number(b.answer === patternId) - Number(a.answer === patternId))
    .map((dilemma) => ({
      question: dilemma.prompt,
      options: dilemma.options.map((option) => option.label),
      correctAnswer: dilemma.options.find((option) => option.id === dilemma.answer)?.label ?? "",
      explanation: dilemma.why,
    }));
}

export function SpotQuiz({
  patternId,
  onSolved,
}: {
  patternId: string;
  onSolved?: (patternId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const bank = quizBank(patternId);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const quiz = bank[index] ?? bank[0];

  useEffect(() => {
    setIndex(0);
    setPicked(null);
  }, [patternId]);

  function choose(option: string) {
    setPicked(option);
    if (option === quiz.correctAnswer) onSolved?.(patternId);
  }

  function another() {
    setPicked(null);
    setIndex((value) => (value + 1) % bank.length);
  }

  function reset() {
    setPicked(null);
  }

  if (!quiz) return null;
  const revealed = picked !== null;

  return (
    <section id="spot-the-pattern-card" className="rounded-lg border border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <Zap className="size-4 text-primary" />
        <span className="text-sm font-semibold">Spot the pattern</span>
        <span className="ml-auto font-mono text-xs text-muted">{open ? "Hide" : "Quiz"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-line px-3 py-3">
          <p className="text-sm leading-relaxed">{quiz.question}</p>
          <div className="grid gap-1.5" role="group" aria-label="Pattern choices">
            {quiz.options.map((option) => {
              const correct = option === quiz.correctAnswer;
              const chosen = picked === option;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => choose(option)}
                  className={clsx(
                    "rounded-lg border px-3 py-2 text-left text-sm font-semibold disabled:cursor-default",
                    !revealed && "border-line hover:border-primary",
                    revealed && correct && "border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-100",
                    revealed && chosen && !correct && "border-role-alert bg-role-alert-soft text-role-alert",
                    revealed && !chosen && !correct && "border-line text-muted",
                  )}
                >
                  <span className="block">{option}</span>
                  {revealed && correct ? <span className="mt-0.5 block text-xs font-medium">Correct</span> : null}
                  {revealed && chosen && !correct ? <span className="mt-0.5 block text-xs font-medium">Not this one</span> : null}
                </button>
              );
            })}
          </div>
          {revealed ? (
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">{quiz.explanation}</p>
              <div className="flex gap-3">
                {bank.length > 1 ? (
                  <button type="button" onClick={another} className="text-xs font-semibold text-primary">
                    Try another
                  </button>
                ) : null}
                <button type="button" onClick={reset} className="text-xs font-semibold text-muted">
                  Reset
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function TradeoffCard({ pattern }: { pattern: Pattern }) {
  return (
    <section className="rounded-lg border border-line px-3 py-2.5">
      <h3 className="font-mono text-xs tracking-wide text-muted">TRADE-OFFS AND SKIP IT WHEN</h3>
      <p className="mt-2 text-sm leading-relaxed">
        <span className="font-semibold">Skip it when. </span>
        {pattern.avoid}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div>
          <p className="font-mono text-xs text-muted">Gains</p>
          <ul className="mt-1 space-y-1 text-sm leading-relaxed">
            {pattern.pros.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-xs text-muted">Costs</p>
          <ul className="mt-1 space-y-1 text-sm leading-relaxed">
            {pattern.cons.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function ReferenceCards({ pattern }: { pattern: Pattern }) {
  const links = readingsFor(pattern.id, pattern.name);
  return (
    <section>
      <h3 className="font-mono text-xs tracking-wide text-muted">READING AND DRILLS</h3>
      <ul className="mt-2 space-y-2">
        {links.map((link) => (
          <li key={link.href + link.title}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 rounded-lg border border-line px-3 py-2 hover:border-primary"
            >
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-semibold">{link.title}</span>
                <span className="block text-sm leading-relaxed text-muted">{link.note}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FindPatternButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-canvas px-3 text-sm font-semibold"
    >
      <Compass className="size-4 text-primary" />
      <span className="hidden sm:inline">Find my pattern</span>
      <span className="sm:hidden">Find pattern</span>
    </button>
  );
}

export function DecisionTreeDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (patternId: string) => void;
}) {
  const titleId = useId();
  const [stack, setStack] = useState<string[]>(["root"]);
  const [choice, setChoice] = useState<DecisionChoice | null>(null);
  const questionId = stack[stack.length - 1] ?? "root";
  const question = questionById(questionId);

  useEffect(() => {
    if (!open) return;
    setStack(["root"]);
    setChoice(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !question) return null;

  function pickChoice(next: DecisionChoice) {
    if (next.patternId) {
      setChoice(next);
      return;
    }
    if (next.next) {
      setChoice(null);
      setStack((value) => [...value, next.next!]);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-3 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[85dvh] w-full max-w-lg overflow-x-hidden overflow-y-auto rounded-xl border border-line bg-surface shadow-sm"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">DECISION TREE</p>
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
              Which pattern do I need?
            </h2>
          </div>
          <button type="button" aria-label="Close decision tree" onClick={onClose} className="grid size-11 place-items-center rounded-lg border border-line">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="text-sm font-semibold">{question.prompt}</p>
          <div className="grid gap-2">
            {question.choices.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => pickChoice(item)}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-left",
                  choice?.label === item.label ? "border-primary bg-wash" : "border-line hover:border-primary",
                )}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-sm leading-relaxed text-muted">{item.detail}</span>
              </button>
            ))}
          </div>
          {choice?.patternId ? (
            <div className="rounded-lg border border-line bg-canvas px-3 py-3">
              <p className="text-sm font-semibold">{findPattern(choice.patternId).name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{findPattern(choice.patternId).tagline}</p>
              <button
                type="button"
                onClick={() => onPick(choice.patternId!)}
                className="mt-3 h-11 rounded-lg bg-primary px-3 text-sm font-bold text-on-primary"
              >
                Open this pattern
              </button>
            </div>
          ) : null}
          {stack.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                setChoice(null);
                setStack((value) => value.slice(0, -1));
              }}
              className="text-sm font-semibold text-primary"
            >
              Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
