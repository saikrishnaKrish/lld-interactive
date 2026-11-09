export type Diagnostic = {
  redFlag: string;
  whenToReachFor: string;
  ruleOfThumb: string;
};

export type Collision = { title: string; why: string; patternId?: string };

export type Dilemma = {
  id: string;
  prompt: string;
  options: { id: string; label: string }[];
  answer: string;
  why: string;
};

export type DecisionChoice = { label: string; detail: string; next?: string; patternId?: string };

export type DecisionQuestion = { id: string; prompt: string; choices: DecisionChoice[] };

export type ReadingLink = { title: string; href: string; note: string };

const DIAGNOSTICS: Record<string, Diagnostic> = {
  "factory-method": {
    redFlag:
      "You see a giant switch or if-else block creating classes with new all over your code. Every time your team adds a new platform, payment provider, or file type, you are forced to go back and edit that same messy block.",
    whenToReachFor:
      "Your app knows what it wants to do (render a screen, process a payment, or upload a file), but it shouldn't have to care which specific tool or brand is doing the job behind the scenes.",
    ruleOfThumb: "If the steps stay the same and only the concrete class changes, let a subclass decide what gets created.",
  },
  "abstract-factory": {
    redFlag: "You build a light button in one place and a dark checkbox in another, then the screen looks like two apps glued together.",
    whenToReachFor: "You need a matching set, such as a button, a checkbox, and a menu, that all come from the same theme.",
    ruleOfThumb: "Use it when the products have to belong together, not when you only need one object.",
  },
  builder: {
    redFlag: "The constructor takes a dozen optional arguments, and callers pass null for everything they skip.",
    whenToReachFor: "You are assembling one complicated thing, like a report, and you want the recipe to read like steps.",
    ruleOfThumb: "If construction has optional steps, build it in stages. One honest constructor does not need a builder.",
  },
  prototype: {
    redFlag: "Every new invoice repeats the same expensive setup: logo, tax rules, and fonts, copied by hand.",
    whenToReachFor: "You already have a good object and you just need a copy with a few fields changed.",
    ruleOfThumb: "Clone what is expensive to set up. Don't clone what a normal constructor can say clearly.",
  },
  singleton: {
    redFlag: "Orders builds one logger and payments builds another, then their settings don't match.",
    whenToReachFor: "The whole process really can have only one of this thing, and passing it in is not an option.",
    ruleOfThumb: "Most 'I'll only need one' objects should just be passed in. Save this for a true single instance.",
  },
  adapter: {
    redFlag: "Checkout speaks Stripe's method names. Adding another provider means editing every call.",
    whenToReachFor: "Your code already expects one shape, and the library you must use speaks another.",
    ruleOfThumb: "Wrap the odd library so the rest of the app keeps its own words.",
  },
  bridge: {
    redFlag: "You end up with a class for every combination: RemoteWindows, RemoteWeb, AdvancedWindows, AdvancedWeb.",
    whenToReachFor: "Two things vary on their own, like which features you offer and which device brand you talk to.",
    ruleOfThumb: "Split the two varying sides so they don't multiply into a grid of classes.",
  },
  composite: {
    redFlag: "Before you can ask for a size, the code checks isFolder and then treats a file as a special case.",
    whenToReachFor: "A folder and a file should both answer the same question, such as how big they are.",
    ruleOfThumb: "If a group and a single item share the same actions, give them the same methods.",
  },
  decorator: {
    redFlag: "You grow a pile of classes: GzipFile, EncryptedFile, GzipEncryptedFile, EncryptedGzipFile.",
    whenToReachFor: "You want to add a behavior, like compression, around an object without editing its class.",
    ruleOfThumb: "Wrap the object. Don't invent a subclass for every combination.",
  },
  facade: {
    redFlag: "Placing an order calls stock, payment, and shipping in order, and every screen copies that sequence.",
    whenToReachFor: "Callers need one simple door, like placeOrder(), and should not have to conduct the subsystems.",
    ruleOfThumb: "Hide the choreography behind one method when every caller would otherwise repeat it.",
  },
  flyweight: {
    redFlag: "A hundred thousand map pins each carry their own copy of the same heavy icon.",
    whenToReachFor: "Lots of objects share the heavy part, and only a little data, like a latitude, is unique.",
    ruleOfThumb: "Share the heavy bytes. Keep the unique bits outside.",
  },
  proxy: {
    redFlag: "Every click loads a huge document, or the same permission check is pasted before every read.",
    whenToReachFor: "You want a stand-in that can delay the real work, or stop a call the caller is not allowed to make.",
    ruleOfThumb: "Put a lookalike in front when access, cost, or timing should be controlled.",
  },
  "chain-of-responsibility": {
    redFlag: "One function is a ladder of ifs: manager, then director, then VP, each approving or passing the request on.",
    whenToReachFor: "Several people might handle a request, and the sender should not have to know who says yes.",
    ruleOfThumb: "Pass the request along a line. Don't make the caller pick the handler.",
  },
  command: {
    redFlag: "The Cut button calls the editor directly, so there is nowhere to store the action for undo.",
    whenToReachFor: "You need to remember, queue, or undo a request, not just fire it and forget.",
    ruleOfThumb: "Turn the request into an object when you need to keep it.",
  },
  iterator: {
    redFlag: "The player UI reaches into the playlist array. Change the storage, and the UI breaks.",
    whenToReachFor: "You want to walk the songs one by one without showing how they are stored.",
    ruleOfThumb: "Hand out a cursor. Don't hand out the collection.",
  },
  mediator: {
    redFlag: "Every chat widget holds a reference to every other widget and updates them by hand.",
    whenToReachFor: "Many pieces need to react, but they should talk to a room, not to each other.",
    ruleOfThumb: "If everyone knows everyone, put a hub in the middle.",
  },
  memento: {
    redFlag: "Undo code reaches into the editor and reads its private text.",
    whenToReachFor: "You need a snapshot the owner can restore, and nobody else should be able to peek inside.",
    ruleOfThumb: "Let the object pack its own suitcase. Don't unpack it from the outside.",
  },
  observer: {
    redFlag: "The store imports email, push, and analytics, then calls each one by name when an order lands.",
    whenToReachFor: "Several parts of the app need to hear about a change, and the subject should not list them.",
    ruleOfThumb: "Publish the news and let listeners subscribe. Don't call them by name.",
  },
  state: {
    redFlag: "Every button starts with a switch on status: draft, paid, shipped, each doing something different.",
    whenToReachFor: "The same object should act like a different class once its situation changes.",
    ruleOfThumb: "When the lifecycle changes the behavior, give each status its own object.",
  },
  strategy: {
    redFlag: "Shipping cost is one method with a switch: flat, by weight, or by zone.",
    whenToReachFor: "The goal stays the same, but you want to swap the steps while the object is already alive.",
    ruleOfThumb: "Strategy swaps the how. It does not decide which object gets created.",
  },
  "template-method": {
    redFlag: "Two report classes copy the same steps, and only the middle step is different.",
    whenToReachFor: "The outline is fixed, and subclasses should fill in the parts that change.",
    ruleOfThumb: "Keep the skeleton in one place. Let subclasses fill the blanks.",
  },
  visitor: {
    redFlag: "Every new export, PDF or CSV, adds another method to every shape class.",
    whenToReachFor: "The types rarely change, and you keep adding new operations over them.",
    ruleOfThumb: "Add a visitor for a new operation. Don't add a method to every class.",
  },
  interpreter: {
    redFlag: "A tiny filter language is parsed with a pile of ifs instead of a grammar.",
    whenToReachFor: "Sentences in a small language should become a tree you can walk.",
    ruleOfThumb: "If the input is a little language, turn each phrase into an object that knows how to run.",
  },
};

const COLLISIONS: Record<string, Collision[]> = {
  "factory-method": [
    {
      title: "Factory Method vs Simple Factory",
      why: "A Simple Factory is just a single helper function with a switch statement. Factory Method is more flexible: it uses inheritance so new types can plug in as new subclasses without touching existing code.",
    },
    {
      title: "Factory Method vs Abstract Factory",
      patternId: "abstract-factory",
      why: "Factory Method builds one object, like just a button. Abstract Factory builds a whole matching set together, like a button, checkbox, and dropdown that must share the same theme.",
    },
    {
      title: "Factory Method vs Strategy",
      patternId: "strategy",
      why: "Factory Method is about birth: creating the right object. Strategy is about action: swapping how an existing object behaves on the fly.",
    },
  ],
  "abstract-factory": [
    {
      title: "Abstract Factory vs Factory Method",
      patternId: "factory-method",
      why: "Factory Method makes one thing. Abstract Factory makes a matching set. If you only need a button, you don't need a whole kit.",
    },
    {
      title: "Abstract Factory vs Builder",
      patternId: "builder",
      why: "Abstract Factory hands you finished products from one family. Builder is for one product you assemble step by step.",
    },
  ],
  strategy: [
    {
      title: "Strategy vs Factory Method",
      patternId: "factory-method",
      why: "Strategy changes what an object does. Factory Method chooses which object is created. Don't use Strategy just to hide a new.",
    },
    {
      title: "Strategy vs State",
      patternId: "state",
      why: "You pick a strategy. A state picks itself when the object's situation changes.",
    },
  ],
  builder: [
    {
      title: "Builder vs Factory Method",
      patternId: "factory-method",
      why: "Factory Method returns the object in one call. Builder is for when construction is a recipe with optional steps.",
    },
  ],
  observer: [
    {
      title: "Observer vs Mediator",
      patternId: "mediator",
      why: "Observer announces a fact. Mediator stops objects from calling each other. If the problem is who knows whom, use a mediator.",
    },
  ],
  command: [
    {
      title: "Command vs Strategy",
      patternId: "strategy",
      why: "A command is a request you can save and undo. A strategy is just a swappable way to do the work.",
    },
  ],
  state: [
    {
      title: "State vs Strategy",
      patternId: "strategy",
      why: "Both swap a helper. State changes because the object moved to a new stage. Strategy changes because you chose a different way to do the work.",
    },
  ],
};

const FALLBACK_COLLISION: Collision[] = [
  {
    title: "Compare the related pattern",
    why: "Open the related pattern and ask what actually changes: what gets created, how the pieces fit, or who talks to whom while the program runs.",
  },
];

export const QUESTIONS: DecisionQuestion[] = [
  {
    id: "root",
    prompt: "What is the hard part of this design?",
    choices: [
      { label: "Creating an object", detail: "Who constructs it, and which concrete class.", next: "create" },
      { label: "Structuring classes", detail: "How pieces fit without a class explosion.", next: "structure" },
      { label: "Runtime communication", detail: "Who talks to whom while the program runs.", next: "behavior" },
    ],
  },
  {
    id: "create",
    prompt: "What kind of creation is this?",
    choices: [
      { label: "One product, chosen by a subclass", detail: "The workflow is shared. The concrete class is not.", patternId: "factory-method" },
      { label: "A whole matching family", detail: "Button, checkbox, and dialog must come from one theme.", patternId: "abstract-factory" },
      { label: "Step-by-step assembly", detail: "Same product, many optional steps, readable recipes.", patternId: "builder" },
      { label: "Copy a configured instance", detail: "Cloning is cheaper than building from scratch.", patternId: "prototype" },
      { label: "Exactly one shared instance", detail: "A second instance would be a bug.", patternId: "singleton" },
    ],
  },
  {
    id: "structure",
    prompt: "What structural pain is this?",
    choices: [
      { label: "An incompatible interface", detail: "The client cannot call the vendor as-is.", patternId: "adapter" },
      { label: "Two dimensions vary independently", detail: "Features and implementations should not multiply.", patternId: "bridge" },
      { label: "Leaves and groups share an API", detail: "A folder and a file both answer size().", patternId: "composite" },
      { label: "Add behavior without new subclasses", detail: "Wrap the object instead of extending it.", patternId: "decorator" },
      { label: "One door into a subsystem", detail: "Callers should not orchestrate five services.", patternId: "facade" },
      { label: "Too many identical heavy objects", detail: "Share the intrinsic bytes.", patternId: "flyweight" },
      { label: "Control access to a heavy object", detail: "Check permission, or load it later.", patternId: "proxy" },
    ],
  },
  {
    id: "behavior",
    prompt: "What runtime conversation is this?",
    choices: [
      { label: "Pass a request until someone handles it", detail: "The sender does not pick the handler.", patternId: "chain-of-responsibility" },
      { label: "Turn a request into an object", detail: "You need undo, a queue, or a log.", patternId: "command" },
      { label: "Walk a collection privately", detail: "Clients should not see the storage.", patternId: "iterator" },
      { label: "Stop colleagues from calling each other", detail: "A hub owns the conversation.", patternId: "mediator" },
      { label: "Snapshot state without exposing fields", detail: "Undo must not break encapsulation.", patternId: "memento" },
      { label: "Notify many dependents", detail: "The subject should not name the listeners.", patternId: "observer" },
      { label: "Behavior changes with lifecycle", detail: "The object acts like a different class.", patternId: "state" },
      { label: "Swap an algorithm at runtime", detail: "The goal stays; the steps change.", patternId: "strategy" },
      { label: "A fixed skeleton, varying steps", detail: "Subclasses fill the holes.", patternId: "template-method" },
      { label: "New operations on a stable set of types", detail: "Keep the types, add visitors.", patternId: "visitor" },
      { label: "A small language", detail: "Sentences become an expression tree.", patternId: "interpreter" },
    ],
  },
];

export const DILEMMAS: Dilemma[] = [
  {
    id: "gateway",
    prompt:
      "Checkout charges cards through Stripe today. Next quarter the same order flow must charge through Razorpay in India. The steps after construction do not change, but the concrete class does.",
    options: [
      { id: "factory-method", label: "Factory Method" },
      { id: "strategy", label: "Strategy" },
      { id: "singleton", label: "Singleton" },
    ],
    answer: "factory-method",
    why: "You already know how to charge. You do not know which gateway exists until runtime. A subclass supplies the gateway; the charge workflow stays in the creator. Strategy would fit if the charging steps themselves were different algorithms. Singleton only limits how many objects exist.",
  },
  {
    id: "report",
    prompt:
      "A monthly report may include a cover, any number of charts, and an optional footer. Callers want to read the recipe, not pass twelve nullable constructor arguments.",
    options: [
      { id: "builder", label: "Builder" },
      { id: "factory-method", label: "Factory Method" },
      { id: "abstract-factory", label: "Abstract Factory" },
    ],
    answer: "builder",
    why: "The product is one report assembled in steps. Factory Method returns a finished product in a single method. Abstract Factory would matter if you also had to mint a matching family of other documents.",
  },
  {
    id: "pins",
    prompt:
      "A map draws a hundred thousand cafe pins. Every pin has its own latitude, and they all paint the same 40kb icon.",
    options: [
      { id: "flyweight", label: "Flyweight" },
      { id: "singleton", label: "Singleton" },
      { id: "prototype", label: "Prototype" },
    ],
    answer: "flyweight",
    why: "The icon is intrinsic and can be shared. The coordinates stay outside each pin. Singleton would force one pin for the whole map. Prototype copies a template; it does not share the heavy bytes across live objects.",
  },
  {
    id: "shipping",
    prompt:
      "Shipping cost is either flat, by weight, or by zone. The checkout object already exists. Operators switch the formula without reconstructing checkout.",
    options: [
      { id: "strategy", label: "Strategy" },
      { id: "factory-method", label: "Factory Method" },
      { id: "state", label: "State" },
    ],
    answer: "strategy",
    why: "The object is already alive and the algorithm is what changes. Factory Method would choose a class at construction. State would fit if checkout itself moved through a lifecycle that changed what the buttons do.",
  },
];

const DRILLS: Record<string, { title: string; href: string; note: string }> = {
  "factory-method": {
    title: "Multi-provider checkout",
    href: "https://github.com/ashishps1/awesome-low-level-design",
    note: "Implement one charge workflow with Stripe and Razorpay behind a processor.",
  },
  facade: {
    title: "Parking lot",
    href: "https://leetcode.com/discuss/interview-question/object-oriented-design/124631/object-oriented-design-parking-lot",
    note: "One entry point hides spots, tickets, and payment.",
  },
  proxy: {
    title: "Multi-level cache",
    href: "https://github.com/ashishps1/awesome-low-level-design",
    note: "A stand-in checks memory, then disk, then origin.",
  },
  decorator: {
    title: "Multi-level cache",
    href: "https://github.com/ashishps1/awesome-low-level-design",
    note: "Wrap a store with compression, then metrics, without a subclass for each mix.",
  },
  composite: {
    title: "File system",
    href: "https://github.com/ashishps1/awesome-low-level-design",
    note: "Files and folders answer the same size() call.",
  },
};

const DEFAULT_DRILL = {
  title: "LLD drill library",
  href: "https://github.com/ashishps1/awesome-low-level-design",
  note: "Pick a problem whose pain matches this pattern, and implement only that shape.",
};

export function diagnosticFor(id: string): Diagnostic {
  return (
    DIAGNOSTICS[id] ?? {
      redFlag: "The same concrete class name shows up in more than one place, and a new variant means editing all of them.",
      whenToReachFor: "You already know a change is coming, and you don't want that change to rip through the rest of the code.",
      ruleOfThumb: "Name the variation once, and let the rest of the code talk to the stable part.",
    }
  );
}

export function collisionsFor(id: string): Collision[] {
  return COLLISIONS[id] ?? FALLBACK_COLLISION;
}

export function readingsFor(id: string, name: string): ReadingLink[] {
  const slug = id.replace(/-/g, "_");
  const drill = DRILLS[id] ?? DEFAULT_DRILL;
  return [
    {
      title: "Refactoring.Guru",
      href: `https://refactoring.guru/design-patterns/${id}`,
      note: `${name} structure, sample, and when to use it.`,
    },
    {
      title: "SourceMaking",
      href: `https://sourcemaking.com/design_patterns/${slug}`,
      note: "The refactoring motivation and the resulting shape.",
    },
    {
      title: "Martin Fowler",
      href: "https://martinfowler.com/bliki/GangOfFour.html",
      note: "How the Gang of Four book sits in later architecture writing.",
    },
    {
      title: drill.title,
      href: drill.href,
      note: drill.note,
    },
  ];
}

export function questionById(id: string): DecisionQuestion | undefined {
  return QUESTIONS.find((question) => question.id === id);
}
