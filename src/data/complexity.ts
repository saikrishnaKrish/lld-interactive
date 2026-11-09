import type { ComplexityImpact } from "./types";

const IMPACTS: Record<string, ComplexityImpact> = {
  "factory-method": {
    timeOrScaleMetric: {
      antiPattern: "O(N) edits at every new WinButton()",
      withPattern: "O(1) client change: App still calls render()",
    },
    coupling: {
      antiPattern: "App imports WinButton and every later OS button",
      withPattern: "App imports only Dialog",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every call site (high risk) vs 1 new Dialog subclass (WinButton untouched)",
    },
    keyWin: "Adding WebDialog never risks the Windows render path.",
  },
  "abstract-factory": {
    timeOrScaleMetric: {
      antiPattern: "O(N) widget constructions, each new picking its own theme",
      withPattern: "O(1): App keeps calling the same UIFactory methods",
    },
    coupling: {
      antiPattern: "App imports LightButton, DarkButton, LightCheckbox, and DarkCheckbox",
      withPattern: "App imports UIFactory plus the Button and Checkbox interfaces",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every screen that mixes themes (high risk) vs 1 new theme factory (the other theme untouched)",
    },
    keyWin: "A dark theme cannot ship a light checkbox by accident.",
  },
  builder: {
    timeOrScaleMetric: {
      antiPattern: "O(N) constructor overloads as optional fields grow",
      withPattern: "O(1) recipe: the same steps, then build()",
    },
    coupling: {
      antiPattern: "The client knows every Report field and its order",
      withPattern: "The client calls builder steps and receives only Report",
    },
    blastRadius: {
      filesModifiedToAddVariant: "The telescoping constructor (high risk) vs 1 new builder (the PDF builder untouched)",
    },
    keyWin: "A CSV report cannot skip a field the PDF path already requires.",
  },
  prototype: {
    timeOrScaleMetric: {
      antiPattern: "O(N) setup repeated per invoice: logo, tax, defaults",
      withPattern: "O(1) clone of the registered template, then set the customer",
    },
    coupling: {
      antiPattern: "Billing constructs the concrete invoice and its setup",
      withPattern: "Billing asks the registry to clone a prototype",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Setup copied into Billing (high risk) vs 1 registered prototype (other templates untouched)",
    },
    keyWin: "A new invoice copies the expensive setup without reopening Billing.",
  },
  singleton: {
    timeOrScaleMetric: {
      antiPattern: "O(N) loggers: each service does new Logger()",
      withPattern: "O(1) instance: every caller uses the same Logger",
    },
    coupling: {
      antiPattern: "Each service owns a private logger and its own config",
      withPattern: "Callers share one access point",
    },
    blastRadius: {
      filesModifiedToAddVariant: "A config change in N services (high risk) vs 1 instance (every service sees it)",
    },
    keyWin: "OrderService and PaymentService cannot log to two different sinks.",
  },
  adapter: {
    timeOrScaleMetric: {
      antiPattern: "O(N) call sites rewritten to speak the vendor SDK",
      withPattern: "O(1): callers keep using the Gateway you own",
    },
    coupling: {
      antiPattern: "The client imports the third-party SDK",
      withPattern: "The client imports your interface; only the adapter imports the SDK",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every caller (high risk) vs 1 new adapter (the current vendor untouched)",
    },
    keyWin: "Swapping the SDK does not rewrite the code that charges a card.",
  },
  bridge: {
    timeOrScaleMetric: {
      antiPattern: "O(platforms × features) classes such as WindowsIconButton",
      withPattern: "O(platforms + features): two small hierarchies",
    },
    coupling: {
      antiPattern: "Each widget inherits a concrete window toolkit",
      withPattern: "The abstraction holds an implementor interface only",
    },
    blastRadius: {
      filesModifiedToAddVariant: "A new OS forks every widget (high risk) vs 1 new implementor (widgets untouched)",
    },
    keyWin: "Adding macOS does not fork IconButton into another subclass.",
  },
  composite: {
    timeOrScaleMetric: {
      antiPattern: "O(N) branches: files and folders need different loops",
      withPattern: "O(1) loop over Component",
    },
    coupling: {
      antiPattern: "The client imports File and Folder and switches on type",
      withPattern: "The client imports only Component",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every walker (high risk) vs 1 new component (walkers untouched)",
    },
    keyWin: "A shortcut node uses the same tree walk as a folder.",
  },
  decorator: {
    timeOrScaleMetric: {
      antiPattern: "O(2^features) subclasses for every combination",
      withPattern: "O(features) wrappers, stacked when you build the object",
    },
    coupling: {
      antiPattern: "The client picks one subclass that hard-wires the mix",
      withPattern: "The client wraps a component and still sees that interface",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Each mix is a subclass (high risk) vs 1 new decorator (existing wraps untouched)",
    },
    keyWin: "A scroll wrapper never edits the border wrapper.",
  },
  facade: {
    timeOrScaleMetric: {
      antiPattern: "O(N) subsystem calls copied into every client",
      withPattern: "O(1) call: place() on the facade",
    },
    coupling: {
      antiPattern: "Checkout imports inventory, payment, shipping, and mail",
      withPattern: "Checkout imports only OrderFacade",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every caller (high risk) vs 1 facade method (clients untouched)",
    },
    keyWin: "Replacing the shipper does not ripple through checkout.",
  },
  flyweight: {
    timeOrScaleMetric: {
      antiPattern: "O(trees) full copies of mesh, texture, and species",
      withPattern: "O(species) shared types, plus a position per tree",
    },
    coupling: {
      antiPattern: "Each tree owns a private copy of repeated data",
      withPattern: "Trees share one TreeType and pass x, y at draw time",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Assets copied onto every instance (high risk) vs 1 shared flyweight (instances stay small)",
    },
    keyWin: "Ten thousand trees do not mean ten thousand oak textures.",
  },
  proxy: {
    timeOrScaleMetric: {
      antiPattern: "O(N) callers that each open the expensive resource",
      withPattern: "O(1) stand-in: callers use the subject, the proxy gates it",
    },
    coupling: {
      antiPattern: "The client imports the heavy service and its access rules",
      withPattern: "The client imports the subject interface; the proxy owns the real service",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every caller (high risk) vs 1 proxy (the real service untouched)",
    },
    keyWin: "A cache or a permission check does not rewrite the callers.",
  },
  "chain-of-responsibility": {
    timeOrScaleMetric: {
      antiPattern: "O(N) nested checks in submit() as approvers change",
      withPattern: "O(1) submit(): the request walks the next handler",
    },
    coupling: {
      antiPattern: "Employee imports Manager, Director, and VP",
      withPattern: "Employee imports only the handler interface",
    },
    blastRadius: {
      filesModifiedToAddVariant: "The submit method (high risk) vs 1 new handler (other limits untouched)",
    },
    keyWin: "A CFO approver never rewrites the manager's limit.",
  },
  command: {
    timeOrScaleMetric: {
      antiPattern: "O(N) button methods that call the editor and cannot undo",
      withPattern: "O(1) execute() and undo() on the command the button holds",
    },
    coupling: {
      antiPattern: "The Cut button imports Editor and its text model",
      withPattern: "The button imports only Command",
    },
    blastRadius: {
      filesModifiedToAddVariant: "The button and the history code (high risk) vs 1 new command (history untouched)",
    },
    keyWin: "Undo works for a new action without teaching the button about the editor.",
  },
  iterator: {
    timeOrScaleMetric: {
      antiPattern: "O(collections) loops that index songs[] directly",
      withPattern: "O(1) loop: hasNext() and next() hide the storage",
    },
    coupling: {
      antiPattern: "Player UI depends on the playlist's array layout",
      withPattern: "Player UI depends only on the iterator",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every screen that walks tracks (high risk) vs 1 new iterator (the UI untouched)",
    },
    keyWin: "Shuffling the playlist does not change the player loop.",
  },
  mediator: {
    timeOrScaleMetric: {
      antiPattern: "O(N²) links: every colleague calls every other",
      withPattern: "O(N) links: each colleague knows only the room",
    },
    coupling: {
      antiPattern: "Alice imports Bob and every later member",
      withPattern: "Alice imports only ChatRoom",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every peer (high risk) vs 1 registration on the mediator (peers untouched)",
    },
    keyWin: "A third person does not add a method on Alice or Bob.",
  },
  memento: {
    timeOrScaleMetric: {
      antiPattern: "O(fields) undo code that reaches into the editor",
      withPattern: "O(1) restore of a sealed snapshot",
    },
    coupling: {
      antiPattern: "History reads and writes the editor's private text",
      withPattern: "History holds a Memento and cannot see the text",
    },
    blastRadius: {
      filesModifiedToAddVariant: "History, for every new field (high risk) vs the originator snapshot (the caretaker untouched)",
    },
    keyWin: "Undo cannot publish the editor's private text.",
  },
  observer: {
    timeOrScaleMetric: {
      antiPattern: "O(N) direct calls inside place(): mail, push, analytics",
      withPattern: "O(1) notify(): the store does not name the listeners",
    },
    coupling: {
      antiPattern: "Store imports Email, Push, and Analytics",
      withPattern: "Store imports only the observer interface",
    },
    blastRadius: {
      filesModifiedToAddVariant: "place() (high risk) vs 1 new subscriber (checkout untouched)",
    },
    keyWin: "Adding analytics never risks the email that already sends.",
  },
  state: {
    timeOrScaleMetric: {
      antiPattern: "O(states × actions) branches inside pay() and ship()",
      withPattern: "O(1) call: Order delegates to the current state",
    },
    coupling: {
      antiPattern: "Order switches on status strings in every action",
      withPattern: "Checkout calls pay() and ship(); only state classes know the rules",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every status switch (high risk) vs 1 new state class (other states untouched)",
    },
    keyWin: "A shipped order cannot grow a pay() path without a new state class.",
  },
  strategy: {
    timeOrScaleMetric: {
      antiPattern: "O(carriers) branches inside Checkout.total()",
      withPattern: "O(1) cost() call; Air replaces Ground without editing Checkout",
    },
    coupling: {
      antiPattern: "Checkout imports every carrier formula",
      withPattern: "Checkout imports only Strategy",
    },
    blastRadius: {
      filesModifiedToAddVariant: "The switch in Checkout (high risk) vs 1 new strategy (Ground untouched)",
    },
    keyWin: "Overnight shipping never risks the ground-rate math.",
  },
  "template-method": {
    timeOrScaleMetric: {
      antiPattern: "O(formats) copied mine() methods that drift apart",
      withPattern: "O(1) skeleton in DataMiner; only extract() changes",
    },
    coupling: {
      antiPattern: "The job duplicates the pipeline for PDF and CSV",
      withPattern: "The job calls mine() on DataMiner",
    },
    blastRadius: {
      filesModifiedToAddVariant: "N copied pipelines (high risk) vs 1 template method (the extract hooks untouched)",
    },
    keyWin: "A fix in mine() lands in both the PDF and CSV miners.",
  },
  visitor: {
    timeOrScaleMetric: {
      antiPattern: "O(operations × types), or a switch in every new tool",
      withPattern: "O(types) accept() methods, plus one visitor per operation",
    },
    coupling: {
      antiPattern: "Each tool switches on Circle, Rectangle, and the next shape",
      withPattern: "The tool is a visitor; shapes only call accept()",
    },
    blastRadius: {
      filesModifiedToAddVariant: "Every shape (high risk) vs 1 new visitor (shapes untouched)",
    },
    keyWin: "An XML export does not add a method to Circle.",
  },
  interpreter: {
    timeOrScaleMetric: {
      antiPattern: "O(rules) nested conditionals that re-parse the expression",
      withPattern: "O(grammar) small nodes; interpret() walks the tree",
    },
    coupling: {
      antiPattern: "The evaluator imports every operator and special case",
      withPattern: "The client builds an Expression tree and calls interpret()",
    },
    blastRadius: {
      filesModifiedToAddVariant: "The parser switch (high risk) vs 1 expression class (other nodes untouched)",
    },
    keyWin: "Exponentiation does not reopen the addition node.",
  },
};

export function complexityFor(id: string): ComplexityImpact {
  const impact = IMPACTS[id];
  if (!impact) {
    throw new Error(`Missing complexity impact for ${id}`);
  }
  return impact;
}
