import type { Pattern } from "./types";

export const creational: Pattern[] = [
  {
    id: "factory-method",
    frequency: "high",
    name: "Factory Method",
    aka: "Virtual constructor",
    category: "creational",
    tagline: "Subclasses choose which object gets created.",
    intent:
      "Define creation in a superclass method, and let subclasses override that method to pick the concrete class.",
    problem:
      "A dialog calls `new WindowsButton()` itself. Shipping a web client means editing every call site, and the base class cannot be reused.",
    solution:
      "Move the `new` into an overridable factory method. `Dialog.render()` stays identical; `WindowsDialog` and `WebDialog` each return their own button. Callers depend on `Dialog`, not on a product.",
    participants: [
      { role: "Creator", does: "Declares the factory method and contains the shared logic that uses the product." },
      { role: "Concrete creator", does: "Overrides the factory method and returns one concrete product." },
      { role: "Product", does: "The interface the creator's code actually programs against." },
    ],
    useWhen: [
      "You do not know the exact types you will construct ahead of time.",
      "Shared behavior should live in one place, while the constructed type varies.",
      "You want to open the design to new products without editing the creator.",
    ],
    checks: [
      "Creator code never names a concrete product.",
      "A new product is a new subclass, not a new switch branch.",
      "The factory method returns the product interface, not a concrete class.",
    ],
    pros: [
      "Removes concrete `new` from business logic.",
      "One place owns the 'how we use a button' workflow.",
    ],
    cons: [
      "A class per variant can feel heavy for two types.",
      "Inheritance couples creators; a strategy-style factory function is sometimes enough.",
    ],
    avoid: "Skip it when construction is straightforward and the concrete type will not vary across environments.",
    related: ["abstract-factory", "template-method", "prototype"],
    prompt: "Design a cross-platform dialog. The rendering flow is shared; only the button widget changes per OS.",
    objects: [
      { id: "app", name: "App", stereotype: "client", x: 18, y: 48, lines: ["knows: Dialog", "never: new Button"] },
      { id: "dialog", name: "Dialog", stereotype: "creator", x: 48, y: 42, lines: ["render()", "createButton()"] },
      { id: "win", name: "WinButton", stereotype: "product", x: 80, y: 26, lines: ["paint()", "os: windows"] },
      { id: "web", name: "WebButton", stereotype: "product", x: 80, y: 72, lines: ["paint()", "os: web"] },
    ],
    links: [
      { from: "app", to: "dialog", label: "uses" },
      { from: "dialog", to: "win", label: "creates", dashed: true },
      { from: "dialog", to: "web", label: "creates", dashed: true },
    ],
    steps: [
      {
        title: "Hard-wired constructor",
        blurb: "The app constructs a Windows button by name. A web build cannot reuse this path without an edit.",
        call: "new WinButton()",
        note: "Concrete new inside the client. Every OS forks this line.",
        kind: "problem",
        from: "app",
        to: "win",
      },
      {
        title: "Creator owns the flow",
        blurb: "App only calls Dialog.render(). Construction is no longer the caller's job.",
        call: "render()",
        note: "Shared workflow moves into the creator.",
        kind: "call",
        from: "app",
        to: "dialog",
      },
      {
        title: "Factory method",
        blurb: "Dialog asks its factory method for a button, then paints whatever comes back. It never names WinButton.",
        call: "createButton()",
        note: "WindowsDialog overrides and returns WinButton.",
        kind: "create",
        from: "dialog",
        to: "win",
        updates: [{ id: "dialog", lines: ["subclass: Windows", "product: WinButton"] }],
      },
      {
        title: "Swap the subclass",
        blurb: "WebDialog overrides the same method. render() is untouched — that is the open/closed move.",
        call: "createButton()",
        note: "A new creator subclass, not a new switch.",
        kind: "create",
        from: "dialog",
        to: "web",
        reveal: ["web"],
        updates: [{ id: "dialog", lines: ["subclass: Web", "product: WebButton"] }],
      },
      {
        title: "Client stays stable",
        blurb: "App still talks only to Dialog. Adding macOS means another creator subclass, not another edit in App.",
        call: "render()",
        note: "Dependency points at the creator, not the product.",
        kind: "note",
        from: "app",
        to: "dialog",
      },
    ],
    snippet: `interface Button { paint(): void }

abstract class Dialog {
  protected abstract createButton(): Button
  render(): void {
    const button = this.createButton()
    button.paint()
  }
}

class WebDialog extends Dialog {
  protected createButton(): Button {
    return new WebButton()
  }
}`,
  },
  {
    id: "abstract-factory",
    name: "Abstract Factory",
    aka: "Kit",
    category: "creational",
    tagline: "Create families of objects that belong together.",
    intent:
      "Provide an interface for creating a whole family of related objects, without the client naming their concrete classes.",
    problem:
      "A theme switch builds a light button and a dark checkbox. Each widget is fine alone; together they are an inconsistent kit, and the mismatch is scattered across `new` calls.",
    solution:
      "UIFactory creates every widget in the family. LightThemeFactory and DarkThemeFactory each return a matched set. App asks the factory, never the concrete widgets. Factory Method builds one product; Abstract Factory builds a family that must agree.",
    useWhen: [
      "Products come in families that must be used together.",
      "You want to swap the entire family (theme, vendor, platform) in one place.",
      "Client code should not know concrete class names.",
    ],
    checks: [
      "No concrete widget name appears in the client.",
      "One factory instance produces the whole screen.",
      "A new theme is a new factory, not a pile of conditionals.",
    ],
    pros: ["Guarantees compatible products.", "Adding a theme does not touch clients."],
    cons: [
      "Adding a new product kind (say, Slider) changes the factory interface and every concrete factory.",
      "Lots of interfaces for a small kit.",
    ],
    avoid: "If there is only one product type, Factory Method or a simple factory function is the smaller tool.",
    related: ["factory-method", "prototype", "builder"],
    prompt: "Design a UI kit so a screen is entirely light or entirely dark. A LightButton next to a DarkCheckbox is a bug.",
    participants: [
      { role: "Abstract factory", does: "UIFactory declares createButton() and createCheckbox()." },
      { role: "Concrete factory", does: "LightThemeFactory and DarkThemeFactory each return one matched theme." },
      { role: "Product", does: "Button and Checkbox. LightButton stays with LightCheckbox; DarkButton stays with DarkCheckbox." },
      { role: "Client", does: "App renders through the factory and never names a concrete widget." },
    ],
    objects: [
      { id: "app", name: "App", stereotype: "client", x: 18, y: 48, lines: ["theme: light", "widgets via factory"] },
      { id: "factory", name: "UIFactory", stereotype: "abstract factory", x: 50, y: 46, lines: ["createButton()", "createCheckbox()"] },
      { id: "button", name: "Button", stereotype: "product", x: 82, y: 28, lines: ["LightButton", "paint()"] },
      { id: "box", name: "Checkbox", stereotype: "product", x: 82, y: 72, lines: ["LightCheckbox", "paint()"] },
    ],
    links: [
      { from: "app", to: "factory", label: "uses" },
      { from: "factory", to: "button", label: "creates", dashed: true },
      { from: "factory", to: "box", label: "creates", dashed: true },
    ],
    steps: [
      {
        title: "Mismatched kit",
        blurb: "The app constructs widgets one by one. Nothing stops a light button sitting next to a dark checkbox.",
        call: "new DarkCheckbox()",
        note: "Each new picks its own theme. Nothing keeps LightButton with LightCheckbox.",
        kind: "problem",
        from: "app",
        to: "box",
        updates: [
          { id: "button", lines: ["LightButton", "paint()"] },
          { id: "box", lines: ["DarkCheckbox", "paint()"] },
        ],
      },
      {
        title: "Ask the factory",
        blurb: "App receives a UIFactory. From here it cannot name LightButton or DarkCheckbox.",
        call: "setFactory(light)",
        note: "LightThemeFactory stands for the whole kit.",
        kind: "call",
        from: "app",
        to: "factory",
        updates: [{ id: "factory", lines: ["kit: LightTheme", "createButton()", "createCheckbox()"] }],
      },
      {
        title: "Matched button",
        blurb: "The concrete factory returns a button from its own family.",
        call: "createButton()",
        note: "LightThemeFactory returns LightButton.",
        kind: "create",
        from: "factory",
        to: "button",
        updates: [{ id: "button", lines: ["LightButton", "paint()"] }],
      },
      {
        title: "Matched checkbox",
        blurb: "The same factory returns the checkbox. Both widgets share a theme because they share a factory.",
        call: "createCheckbox()",
        note: "LightThemeFactory returns LightCheckbox.",
        kind: "create",
        from: "factory",
        to: "box",
        updates: [{ id: "box", lines: ["LightCheckbox", "paint()"] }],
      },
      {
        title: "Swap the kit",
        blurb: "Replacing LightThemeFactory with DarkThemeFactory re-skins every product. App code does not change.",
        call: "setFactory(dark)",
        note: "DarkButton and DarkCheckbox arrive together.",
        kind: "note",
        from: "app",
        to: "factory",
        updates: [
          { id: "factory", lines: ["kit: DarkTheme", "createButton()", "createCheckbox()"] },
          { id: "button", lines: ["DarkButton", "paint()"] },
          { id: "box", lines: ["DarkCheckbox", "paint()"] },
          { id: "app", lines: ["theme: dark", "widgets via factory"] },
        ],
      },
    ],
    snippet: `interface UIFactory {
  createButton(): Button
  createCheckbox(): Checkbox
}

class DarkThemeFactory implements UIFactory {
  createButton() { return new DarkButton() }
  createCheckbox() { return new DarkCheckbox() }
}

class LightThemeFactory implements UIFactory {
  createButton() { return new LightButton() }
  createCheckbox() { return new LightCheckbox() }
}

function render(ui: UIFactory) {
  ui.createButton().paint()
  ui.createCheckbox().paint()
}`,
  },
  {
    id: "builder",
    frequency: "high",
    name: "Builder",
    aka: "Fluent construction",
    category: "creational",
    tagline: "Build a complex object one step at a time.",
    intent:
      "Separate construction of a complex object from its final representation, so the same steps can produce different results.",
    problem:
      "A report constructor takes twelve arguments, half of them optional. Call sites pass `null` placeholders, and PDF versus HTML is a fork of the same messy constructor.",
    solution:
      "A builder exposes named steps (title, filter, chart, format) and a final `build()`. The report object is immutable and only appears when the steps are done. A director can reuse a fixed recipe; the client can also call the steps itself.",
    participants: [
      { role: "Builder", does: "Declares the construction steps and how to fetch the result." },
      { role: "Concrete builder", does: "Accumulates state and produces one representation." },
      { role: "Director", does: "Optional. Runs a known recipe of steps against any builder." },
    ],
    useWhen: [
      "The object has many optional parts or a required order of assembly.",
      "You want an immutable result without a telescoping constructor.",
      "The same steps should yield more than one representation.",
    ],
    checks: [
      "The product has no setter soup; it comes from build().",
      "Optional parts are methods, not null arguments.",
      "A second representation reuses the steps.",
    ],
    pros: ["Call sites read like a spec.", "You can enforce 'build only when valid'."],
    cons: ["A new mutable builder type beside the product.", "Overkill for two fields."],
    avoid: "A short constructor or object literal is clearer when every field is required and small.",
    related: ["abstract-factory", "factory-method"],
    prompt: "Design an export pipeline for a monthly report: title, date range, charts, and a format, without a 10-argument constructor.",
    objects: [
      { id: "client", name: "Client", stereotype: "director", x: 18, y: 48, lines: ["recipe: monthly", "format: pdf"] },
      { id: "builder", name: "ReportBuilder", stereotype: "builder", x: 50, y: 46, lines: ["title: —", "charts: 0", "format: —"] },
      { id: "report", name: "Report", stereotype: "product", x: 82, y: 46, lines: ["immutable", "pages: —"] },
    ],
    links: [
      { from: "client", to: "builder", label: "directs" },
      { from: "builder", to: "report", label: "builds", dashed: true },
    ],
    steps: [
      {
        title: "Telescoping constructor",
        blurb: "One constructor tries to cover every report shape. Callers pass nulls for charts they do not have, and order of arguments is tribal knowledge.",
        call: "new Report(…nulls)",
        note: "Optional parts encoded as positional nulls.",
        kind: "problem",
        from: "client",
        to: "builder",
      },
      {
        title: "Named step: title",
        blurb: "The builder takes one concern at a time. Order is flexible; names are not ambiguous.",
        call: "setTitle('March')",
        note: "Step does not produce the report yet.",
        kind: "call",
        from: "client",
        to: "builder",
        updates: [{ id: "builder", lines: ["title: March", "charts: 0", "format: —"] }],
      },
      {
        title: "Add a part",
        blurb: "Charts are a repeated step, not a constructor slot. The builder accumulates them.",
        call: "addChart(revenue)",
        note: "Same method can be called again for another chart.",
        kind: "call",
        from: "client",
        to: "builder",
        updates: [{ id: "builder", lines: ["title: March", "charts: 1", "format: —"] }],
      },
      {
        title: "Choose representation",
        blurb: "Format is just another step. A second builder could emit HTML from the same director recipe.",
        call: "setFormat('pdf')",
        note: "Representation is chosen before build, not inside the client.",
        kind: "call",
        from: "client",
        to: "builder",
        updates: [{ id: "builder", lines: ["title: March", "charts: 1", "format: pdf"] }],
      },
      {
        title: "Materialize",
        blurb: "build() returns an immutable report. Half-built state never escapes the builder.",
        call: "build()",
        note: "Product appears only when the recipe finishes.",
        kind: "create",
        from: "builder",
        to: "report",
        reveal: ["report"],
        updates: [{ id: "report", lines: ["immutable", "pages: 4", "format: pdf"] }],
      },
    ],
    snippet: `class ReportBuilder {
  private title = ""
  private charts: Chart[] = []
  private format: "pdf" | "html" = "pdf"

  setTitle(title: string) { this.title = title; return this }
  addChart(chart: Chart) { this.charts.push(chart); return this }
  setFormat(format: "pdf" | "html") { this.format = format; return this }

  build(): Report {
    if (!this.title) throw new Error("title required")
    return new Report(this.title, this.charts, this.format)
  }
}`,
  },
  {
    id: "prototype",
    name: "Prototype",
    aka: "Clone",
    category: "creational",
    tagline: "Copy a ready-made object instead of rebuilding it.",
    intent:
      "Create new objects by cloning a prototype, so the client does not depend on the concrete class or repeat expensive setup.",
    problem:
      "Every invoice reloads the logo, tax table, and footer from scratch. Construction is slow, and the client must know the concrete class to call `new`.",
    solution:
      "Keep a configured InvoiceTemplate and clone it per customer. The copy is independent: editing the customer name must not change the template. A registry lets clients ask for 'invoice' without knowing the class.",
    participants: [
      { role: "Prototype", does: "Declares clone(). The copy matches the original's concrete type." },
      { role: "Client", does: "Asks a registry or an existing object for a clone, then customizes it." },
      { role: "Registry", does: "Optional map from a name to a prebuilt prototype." },
    ],
    useWhen: [
      "Setup is expensive or awkward to repeat.",
      "You want a new object that matches a runtime instance, not a class you can name.",
      "Objects differ by a few fields from a known baseline.",
    ],
    checks: [
      "Clone is a deep copy where the object owns mutable state.",
      "Client has no `new Concrete` for the varying type.",
      "Mutating a clone does not mutate the prototype.",
    ],
    pros: ["Skips repeated setup.", "New variants can be authored as data, by configuring a prototype."],
    cons: ["Deep vs shallow copy is a classic bug.", "Cloning graphs with cycles needs care."],
    avoid: "Do not clone what a constructor can cheaply and clearly build, especially if copy semantics are fuzzy.",
    related: ["factory-method", "abstract-factory", "memento"],
    prompt: "Design invoice generation. Each invoice shares a heavy template (logo, tax rules) but has its own customer and lines.",
    objects: [
      { id: "client", name: "Billing", stereotype: "client", x: 16, y: 48, lines: ["needs: invoice", "knows class? no"] },
      { id: "registry", name: "Registry", stereotype: "catalog", x: 42, y: 30, lines: ["invoice → template"] },
      { id: "template", name: "Template", stereotype: "prototype", x: 74, y: 28, lines: ["logo: loaded", "tax: US", "customer: —"] },
      { id: "copy", name: "Invoice #18", stereotype: "clone", x: 74, y: 74, lines: ["logo: shared setup", "customer: Ada"] },
    ],
    links: [
      { from: "client", to: "registry", label: "looks up" },
      { from: "registry", to: "template", label: "stores" },
      { from: "template", to: "copy", label: "clone", dashed: true },
    ],
    steps: [
      {
        title: "Rebuild from scratch",
        blurb: "Billing constructs a fresh invoice and repeats logo and tax setup. It also has to name the concrete class.",
        call: "new Invoice()",
        note: "Expensive setup on every document. Class name leaks to the client.",
        kind: "problem",
        from: "client",
        to: "template",
      },
      {
        title: "Look up a prototype",
        blurb: "A registry holds the preconfigured template under a name. Billing does not import the concrete class.",
        call: "get('invoice')",
        note: "Prototype is data: a configured object, not a class reference.",
        kind: "call",
        from: "client",
        to: "registry",
      },
      {
        title: "Clone",
        blurb: "clone() returns a new invoice with logo and tax already set. The copy's identity is not the template's.",
        call: "clone()",
        note: "Deep-copy owned fields. Sharing the logo bytes is fine if they are immutable.",
        kind: "create",
        from: "template",
        to: "copy",
        reveal: ["copy"],
      },
      {
        title: "Customize the copy",
        blurb: "The client sets the customer on the clone only. The template stays a blank master.",
        call: "setCustomer('Ada')",
        note: "If this wrote through to the template, the next clone would be contaminated.",
        kind: "call",
        from: "client",
        to: "copy",
        updates: [{ id: "copy", lines: ["logo: loaded", "tax: US", "customer: Ada"] }],
      },
      {
        title: "Template unchanged",
        blurb: "The next customer clones the same master and gets an empty customer field. That independence is the whole point.",
        call: "customer === '—'",
        note: "Prototype and clone diverge after copy.",
        kind: "note",
        from: "registry",
        to: "template",
        updates: [{ id: "template", lines: ["logo: loaded", "tax: US", "customer: —"] }],
      },
    ],
    snippet: `class Invoice {
  constructor(
    private logo: Blob,
    private tax: TaxTable,
    private customer = "",
  ) {}

  clone(): Invoice {
    return new Invoice(this.logo, this.tax.clone(), this.customer)
  }
}

const master = registry.get("invoice")
const mine = master.clone()
mine.setCustomer("Ada")`,
  },
  {
    id: "singleton",
    frequency: "high",
    name: "Singleton",
    aka: "Single instance",
    category: "creational",
    tagline: "One shared instance, reached from anywhere.",
    intent:
      "Ensure a class has only one instance and offer a global access point to it.",
    problem:
      "OrderService and PaymentService each call `new Logger()`. You get two files, two buffers, and a race on rotation. The process needed one logger.",
    solution:
      "Hide the constructor. `Logger.getInstance()` builds the object on first use and returns that same reference forever. Both services now share one buffer. In low-level design this is a trade, not a trophy: the hidden global makes tests order-dependent. Prefer passing the logger in unless you truly need a process-wide unique.",
    participants: [
      { role: "Singleton", does: "Private constructor, static instance, static accessor." },
      { role: "Clients", does: "Call the accessor instead of constructing." },
    ],
    useWhen: [
      "A second instance would be wrong, not just wasteful (one process-wide config, one hardware handle).",
      "Lazy creation matters.",
      "You accept a global access point.",
    ],
    checks: [
      "Constructor is unreachable from outside.",
      "Two accessors return the same reference.",
      "If you mention it in an interview, also say how tests replace it.",
    ],
    pros: ["Controlled access to the sole instance.", "Lazy initialization."],
    cons: [
      "Hidden dependency. Call graphs lie.",
      "Hard to fake in tests. Often a disguised global.",
    ],
    avoid: "Do not use it for 'I might only need one'. Most of those are just one instance you pass in.",
    related: ["factory-method", "facade"],
    prompt: "A service process must write through exactly one logger. Show the design, then explain why dependency injection may still win.",
    objects: [
      { id: "orders", name: "OrderService", stereotype: "client", x: 22, y: 28, lines: ["calls: logger", "owns logger? no"] },
      { id: "payments", name: "PaymentService", stereotype: "client", x: 22, y: 74, lines: ["calls: logger", "owns logger? no"] },
      { id: "logger", name: "Logger", stereotype: "singleton", x: 70, y: 48, lines: ["instance: none", "refs: 0"] },
    ],
    links: [
      { from: "orders", to: "logger", label: "getInstance" },
      { from: "payments", to: "logger", label: "getInstance" },
    ],
    steps: [
      {
        title: "Two constructors",
        blurb: "Each service news up a logger. Two buffers means split logs and a double-rotate bug you will not reproduce locally.",
        call: "new Logger()",
        note: "Orders built logger #1. Nothing enforces uniqueness.",
        kind: "problem",
        from: "orders",
        to: "logger",
        updates: [{ id: "logger", lines: ["instance: #1 (orders)", "refs: 1"] }],
      },
      {
        title: "A second logger",
        blurb: "Payments does the same. The type system is happy. Production is not.",
        call: "new Logger()",
        note: "Payments built logger #2. Two files.",
        kind: "problem",
        from: "payments",
        to: "logger",
        updates: [{ id: "logger", lines: ["instance: #2 (payments)", "refs: 2 objects"] }],
      },
      {
        title: "First access builds it",
        blurb: "Constructor is private. The first getInstance() allocates and stores the reference in a static field.",
        call: "getInstance()",
        note: "Lazy init. Subsequent calls must not allocate.",
        kind: "create",
        from: "orders",
        to: "logger",
        updates: [{ id: "logger", lines: ["instance: #a1", "refs: 1"] }],
      },
      {
        title: "Second access reuses it",
        blurb: "Payments receives the identical object. One buffer, one rotation policy.",
        call: "getInstance()",
        note: "orders.logger === payments.logger.",
        kind: "call",
        from: "payments",
        to: "logger",
        updates: [{ id: "logger", lines: ["instance: #a1", "refs: 2"] }],
      },
      {
        title: "The cost of the global",
        blurb: "Uniqueness is real. So is the hidden dependency: any code can reach the logger, and tests share state unless you add a reset hook. Say that out loud in an interview.",
        call: "same ref #a1",
        note: "Unique instance, global access. Trade, not a default.",
        kind: "note",
        from: "orders",
        to: "logger",
      },
    ],
    snippet: `class Logger {
  private static inst: Logger | null = null
  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.inst) Logger.inst = new Logger()
    return Logger.inst
  }

  info(message: string) { /* one buffer */ }
}`,
  },
];
