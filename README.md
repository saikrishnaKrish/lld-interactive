# Pattern Explorer

An interactive lesson for the 23 Gang of Four design patterns. Pick a pattern, watch a concrete scenario run, and compare the tightly coupled version with the refactor.

The screen is three panels:

- **Catalog** — search, filter by family, or narrow to the patterns that show up most in interviews and production.
- **Stage** — an object diagram, a step-through call trace, and the matching code.
- **Overview** — the red flag in the code, when you actually need the pattern, why the refactor wins, and a short quiz.

Progress, theme, pane sizes, and the product tour are stored in the browser. There are no accounts.

## Run it

Node 22.

```bash
npm install
npm run dev
```

The dev server listens on [http://localhost:8080](http://localhost:8080). If that port is already taken:

```bash
node scripts/with-app-env.mjs vite dev --host 0.0.0.0 --port 5173
```

A pattern and step live in the URL, so a lesson can be shared:

```text
/?pattern=factory-method&step=1
```

`step` is the zero-based beat. The stage labels that same beat as “STEP 2”. An unknown pattern id falls back to Factory Method, and the address bar is rewritten to match.

## Using the lesson

| Action | How |
| --- | --- |
| Play or pause the call trace | Space, or the Play button |
| Step forward or back | Right and Left arrows |
| Reset the trace | R |
| Switch the story | Scenario pills (Classic UI, a backend case, an app or cloud case) |
| Compare the mess with the fix | Anti-pattern / Refactored |
| Resize the panels | Drag the dividers on a wide screen (1024px and up) |
| Replay the walkthrough | Tour, in the header |

Arrow keys and Space are ignored while a dialog is open or while focus is in a text field. The tour uses a dialog, so the arrows move the tour until you close it.

**Top patterns** keeps the nine marked essential: Factory Method, Builder, Singleton, Adapter, Decorator, Facade, Strategy, Observer, and Iterator. That filter stacks with the creational, structural, and behavioral chips.

Light, dark, and system themes follow the header control. The choice is applied before first paint so the page does not flash.

## The 23 patterns

Each pattern has three scenarios. Switching a pill updates the diagram, the call trace, and the snippet together.

**Creational** — Factory Method, Abstract Factory, Builder, Prototype, Singleton

**Structural** — Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy

**Behavioral** — Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor, Interpreter

Factory Method, Abstract Factory, and Builder each have two scored Spot the pattern questions. The other patterns use a shared set of dilemmas.

## Where the content lives

```text
src/data/creational.ts          pattern definitions (intent, steps, diagram)
src/data/structural.ts
src/data/behavioral.ts
src/data/factory-scenarios.ts   extra scenarios for Factory Method
src/data/abstract-factory-scenarios.ts
src/data/scenarios/             the other 21 patterns, built from a small helper
src/data/guidance.ts            red flags, rules of thumb, collisions, decision tree
src/data/complexity.ts          anti-pattern vs refactor comparison
src/data/quizzes.ts             scored quizzes
src/data/catalog.ts             stitches a pattern together for the current scenario
src/components/explorer/        the three panels, theme, and quiz UI
src/hooks/useProductTour.ts     first-visit spotlight tour
```

`resolvePattern` in `src/data/catalog.ts` is what the UI reads. A scenario can replace the prompt, participants, diagram, steps, snippet, and complexity card. Guidance copy stays on the pattern.

To add a scenario, follow the shape in `src/data/types.ts` (`Scenario`) and register it the way the neighboring pattern does. Factory Method and Abstract Factory keep their own files. Everything else goes through `src/data/scenarios/`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 8080 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run build` | Production build |

## Stack

React 19, TanStack Start, Vite, and Tailwind CSS v4. Pane layout uses `react-resizable-panels`. The tour uses `driver.js`.

## Saved in the browser

| Key | What it stores |
| --- | --- |
| `pattern-explorer-v1` | Patterns you have opened and finished |
| `pattern-explorer-layout` | Pane widths on a wide screen |
| `theme` | `light`, `dark`, or `system` |
| `has_seen_lld_tour` | Set after the tour is closed or finished |

Clearing site data brings the first-visit tour back.
