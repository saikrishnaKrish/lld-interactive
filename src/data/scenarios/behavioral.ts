import type { Pattern, Scenario } from "../types";
import { actor, beat, chain, classicScenario, fan } from "./build";

const roles = (client: string, core: string, product: string) => [
  { role: "Client", does: client },
  { role: "Abstraction", does: core },
  { role: "Concrete", does: product },
];

export function chainScenarios(): Scenario[] {
  const support = chain({
    id: "support-escalation",
    label: "Support Escalation",
    shortLabel: "Support",
    domain: "Operations",
    prompt: "A ticket starts at the agent. If the amount is too high, it moves to the lead, then the manager.",
    participants: roles(
      "Customer submits a ticket and does not pick the approver.",
      "Each handler takes the ticket or forwards it.",
      "Agent, Lead, and Manager form the chain.",
    ),
    nodes: [
      actor("customer", "Customer", "client", ["amount: $400"]),
      actor("agent", "Agent", "handler", ["limit: $50", "next: lead"]),
      actor("lead", "Lead", "handler", ["limit: $200", "next: manager"]),
      actor("manager", "Manager", "handler", ["limit: none", "next: —"]),
    ],
    beats: [
      beat("Customer picks a person", "The customer calls the manager directly. Agents never see the ticket.", "email(manager)", "The path is hard-wired."),
      beat("Start at the agent", "The customer submits. The agent is under the limit, so the ticket moves on.", "submit()", "The customer knows only the front of the chain."),
      beat("Lead passes it", "The lead's limit is $200. $400 continues.", "next.handle()", "The lead does not know who is after the manager."),
      beat("Manager decides", "The manager has no ceiling and approves.", "approve()", "A new tier is one more handler.", { id: "manager", lines: ["decision: approved"] }),
    ],
    snippet: `abstract class Handler {
  constructor(private next?: Handler) {}
  handle(amount: number): string {
    if (this.accepts(amount)) return this.reply()
    return this.next?.handle(amount) ?? "unhandled"
  }
}`,
  });
  const auth = chain({
    id: "auth-middleware",
    label: "Auth Middleware",
    shortLabel: "Auth",
    domain: "Backend",
    prompt: "A request passes a logger, then auth, then the route. The route must not know the earlier steps.",
    participants: roles(
      "Server sends the request into the first middleware.",
      "Each middleware handles or calls next.",
      "Logger, Auth, and Route are the chain.",
    ),
    nodes: [
      actor("server", "Server", "client", ["request /admin"]),
      actor("logger", "Logger", "handler", ["next: auth"]),
      actor("auth", "Auth", "handler", ["next: route"]),
      actor("route", "Route", "handler", ["200 or 401"]),
    ],
    beats: [
      beat("Checks inside the route", "The route logs, checks the token, then answers. Every route copies that.", "if (!token)", "Cross-cutting work sits in the handler."),
      beat("Enter the logger", "The server calls the first middleware only.", "handle(req)", "The server does not name Auth."),
      beat("Auth decides", "Auth rejects a missing token or calls next.", "next.handle()", "A 401 never reaches the route.", { id: "auth", lines: ["token: missing", "401"] }),
      beat("Route answers", "A valid token reaches the route, which only builds the response.", "200", "A new check is a new middleware.", { id: "route", lines: ["200", "body ready"] }),
    ],
    snippet: `class Auth extends Middleware {
  handle(req: Request): Response {
    if (!req.token) return new Response(401)
    return this.next.handle(req)
  }
}`,
  });
  const form = chain({
    id: "form-validation",
    label: "Form Validation",
    shortLabel: "Forms",
    domain: "Frontend",
    prompt: "An email field checks required, then format, then uniqueness. The input must not nest those ifs.",
    participants: roles(
      "EmailField runs the chain and shows the first error.",
      "Each rule passes or stops the chain.",
      "Required, Format, and Unique are the rules.",
    ),
    nodes: [
      actor("field", "EmailField", "client", ["value: ''"]),
      actor("required", "Required", "handler", ["next: format"]),
      actor("format", "Format", "handler", ["next: unique"]),
      actor("unique", "Unique", "handler", ["next: —"]),
    ],
    beats: [
      beat("Nested ifs", "The field checks empty, then regex, then the server, in one function.", "if (!value)", "A new rule edits the field."),
      beat("Start at required", "The field hands the value to Required.", "validate('')", "The field knows only the first rule."),
      beat("Format runs next", "Required passes a non-empty value. Format rejects 'ada'.", "next.validate()", "Format does not know about uniqueness.", { id: "format", lines: ["error: email"] }),
      beat("Unique is last", "A real email reaches Unique. The field still made one call.", "validate(ada@x)", "A new rule links in at the end.", { id: "unique", lines: ["ok"] }),
    ],
    snippet: `class Required extends Rule {
  validate(value: string): string | null {
    if (!value) return "Required"
    return this.next?.validate(value) ?? null
  }
}`,
  });
  return [support, auth, form];
}

export function commandScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "text-editor", label: "Text Editor", shortLabel: "Editor", domain: "Desktop" }),
    fan({
      id: "job-queue",
      label: "Job Queue",
      shortLabel: "Jobs",
      domain: "Backend",
      prompt: "Workers run tasks they can retry. The worker must not call email or billing methods directly.",
      participants: roles(
        "Worker calls execute() on whatever job it dequeued.",
        "Job is the command. The queue stores jobs.",
        "SendEmail and ChargeCard are two jobs.",
      ),
      client: actor("worker", "Worker", "invoker", ["execute()", "no billing import"]),
      core: actor("job", "Job", "command", ["execute()", "payload"]),
      a: actor("email", "SendEmail", "command", ["to: ada"]),
      b: actor("charge", "ChargeCard", "command", ["amount: 20"]),
      linkLabel: "runs",
      beats: [
        beat("Worker knows the task", "The worker calls mailer.send or cards.charge based on a string.", "if (type)", "A new task edits the worker."),
        beat("Dequeue a job", "The worker calls execute() and nothing else.", "execute()", "The queue stored the command, not a callback soup."),
        beat("Send the email", "SendEmail.execute() talks to the mailer.", "send()", "The worker never imported the mailer.", { id: "email", lines: ["sent", "to: ada"] }),
        beat("Charge is another job", "ChargeCard.execute() runs on the same worker loop.", "execute()", "A new task is a new class.", { id: "job", lines: ["type: charge"] }),
      ],
      snippet: `interface Job { execute(): void }

class SendEmail implements Job {
  constructor(private to: string) {}
  execute() { mailer.send(this.to) }
}

queue.pop().execute()`,
    }),
    fan({
      id: "smart-home",
      label: "Smart Home Remote",
      shortLabel: "Home",
      domain: "IoT",
      prompt: "A button turns the lamp on. The button must not import the lamp, so the same button can lock the door.",
      participants: roles(
        "Button calls execute() on the command it holds.",
        "Command is the slot. The button stores one.",
        "LightOn and DoorLock are two commands.",
      ),
      client: actor("button", "Button", "invoker", ["execute()", "knows lamp? no"]),
      core: actor("command", "Command", "command", ["execute()"]),
      a: actor("light", "LightOn", "command", ["lamp: off"]),
      b: actor("door", "DoorLock", "command", ["door: open"]),
      linkLabel: "runs",
      beats: [
        beat("Button calls the lamp", "The button imports Lamp and calls on(). A door button is a different class.", "lamp.on()", "The remote knows every device."),
        beat("Press the button", "The button calls execute() on its command.", "execute()", "The button stores a command, not a lamp."),
        beat("Lamp turns on", "LightOn.execute() calls the lamp.", "on()", "The lamp is the receiver.", { id: "light", lines: ["lamp: on"] }),
        beat("Rebind to the door", "The same button now holds DoorLock. The button class did not change.", "execute()", "A new device is a new command.", { id: "command", lines: ["bound: DoorLock"] }),
      ],
      snippet: `interface Command { execute(): void }

class LightOn implements Command {
  constructor(private lamp: Lamp) {}
  execute() { this.lamp.on() }
}

button.press()`,
    }),
  ];
}

export function iteratorScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "playlist", label: "Music Playlist", shortLabel: "Playlist", domain: "Interface" }),
    fan({
      id: "page-cursor",
      label: "Page Cursor",
      shortLabel: "Pages",
      domain: "Backend",
      prompt: "An export walks orders page by page. The exporter must not know the page size or the SQL.",
      participants: roles(
        "Exporter calls next() until the cursor is done.",
        "OrderQuery hides the offset and the page size.",
        "PageCursor yields one page at a time.",
      ),
      client: actor("export", "Exporter", "client", ["for each page", "no OFFSET"]),
      core: actor("query", "OrderQuery", "aggregate", ["pageSize: 100", "cursor()"]),
      a: actor("cursor", "PageCursor", "iterator", ["offset: 0"]),
      b: actor("page", "Page 2", "element", ["rows: 100"]),
      linkLabel: "yields",
      beats: [
        beat("OFFSET in the exporter", "The exporter computes OFFSET itself. A keyset change breaks it.", "OFFSET 200", "The client knows the storage."),
        beat("Ask for a cursor", "The exporter calls cursor() and stops thinking about SQL.", "cursor()", "Paging policy stays in the query."),
        beat("First page", "next() returns page 1 and advances the offset.", "next()", "The exporter sees rows, not SQL.", { id: "cursor", lines: ["offset: 100"] }),
        beat("Next page", "The same loop fetches page 2. The exporter did not change.", "next()", "A new page size edits the query only.", { id: "page", lines: ["rows: 100"] }),
      ],
      snippet: `interface Cursor<T> { next(): T | null }

class PageCursor implements Cursor<Page> {
  private offset = 0
  next() { return this.query.page(this.offset, this.offset += 100) }
}`,
    }),
    fan({
      id: "social-graph",
      label: "Social Graph",
      shortLabel: "Graph",
      domain: "Data",
      prompt: "A feed walks friends breadth-first. The feed must not know whether people live in a matrix or a list.",
      participants: roles(
        "Feed calls next() and never touches the adjacency list.",
        "Graph hides how people are stored.",
        "BfsCursor and the visited person are the walk.",
      ),
      client: actor("feed", "Feed", "client", ["for each person", "no matrix"]),
      core: actor("graph", "Graph", "aggregate", ["people: hidden", "cursor()"]),
      a: actor("bfs", "BfsCursor", "iterator", ["queue: 1"]),
      b: actor("person", "Ada", "element", ["id: ada"]),
      linkLabel: "yields",
      beats: [
        beat("Feed walks the matrix", "The feed indexes neighbors[i][j]. A list storage breaks the screen.", "neighbors[i]", "The UI knows the structure."),
        beat("Ask for a cursor", "The feed calls cursor() and loops.", "cursor()", "Breadth-first stays in the cursor."),
        beat("Visit the first person", "next() yields the start of the queue.", "next()", "The feed sees a person, not a cell.", { id: "bfs", lines: ["queue: 3"] }),
        beat("Ada comes out", "The next yield is Ada. The feed loop is unchanged.", "next()", "A depth-first walk would be a different cursor.", { id: "person", lines: ["id: ada"] }),
      ],
      snippet: `interface Cursor<T> { next(): T | null }

class BfsCursor implements Cursor<Person> {
  next() { return this.queue.shift() ?? null }
}`,
    }),
  ];
}

export function mediatorScenarios(pattern: Pattern): Scenario[] {
  return [
    fan({
      id: "air-traffic",
      label: "Air Traffic",
      shortLabel: "ATC",
      domain: "Aviation",
      prompt: "Planes must not call each other to negotiate a runway. The tower does that.",
      participants: roles(
        "A plane tells the tower it wants to land.",
        "Tower is the only object that knows every plane.",
        "PlaneA and PlaneB talk only to the tower.",
      ),
      client: actor("a", "PlaneA", "colleague", ["knows: tower", "runway: —"]),
      core: actor("tower", "Tower", "mediator", ["planes: 2", "grant()"]),
      a: actor("b", "PlaneB", "colleague", ["knows: tower", "runway: —"]),
      b: actor("runway", "Runway", "resource", ["busy: no"]),
      showAll: true,
      linkLabel: "directs",
      dashed: false,
      beats: [
        beat("Planes call each other", "PlaneA asks PlaneB if the runway is free. A third plane means a new method.", "ask(planeB)", "Every aircraft knows every other."),
        beat("Tell the tower", "PlaneA calls tower.request(land).", "request(land)", "PlaneA does not know PlaneB."),
        beat("Tower checks the runway", "The tower is the only caller of the runway.", "grant()", "The decision sits in one place.", { id: "runway", lines: ["busy: yes"] }),
        beat("PlaneB is told to hold", "The tower notifies PlaneB. PlaneA never referenced it.", "hold()", "A new plane registers with the tower only.", { id: "b", lines: ["knows: tower", "hold"] }),
      ],
      snippet: `class Tower {
  request(plane: Plane) {
    if (this.runway.busy) plane.hold()
    else plane.land()
  }
}`,
    }),
    classicScenario(pattern, { id: "chat-room", label: "Chat Room", shortLabel: "Chat", domain: "Realtime" }),
    fan({
      id: "checkout-form",
      label: "Checkout Form",
      shortLabel: "Checkout",
      domain: "Frontend",
      prompt: "Country, shipping, and tax must stay in sync. The widgets must not call each other.",
      participants: roles(
        "CountryField tells the form it changed.",
        "CheckoutForm is the mediator.",
        "Shipping and Tax update only when the form says so.",
      ),
      client: actor("country", "CountryField", "colleague", ["knows: form", "value: —"]),
      core: actor("form", "CheckoutForm", "mediator", ["fields: 3", "sync()"]),
      a: actor("ship", "Shipping", "colleague", ["options: —"]),
      b: actor("tax", "Tax", "colleague", ["rate: —"]),
      showAll: true,
      linkLabel: "syncs",
      dashed: false,
      beats: [
        beat("Fields call each other", "CountryField calls shipping.refresh and tax.recompute. A new field edits both.", "shipping.refresh()", "Widgets know their siblings."),
        beat("Tell the form", "CountryField calls form.changed(country).", "changed(US)", "The field knows only the form."),
        beat("Form refreshes shipping", "CheckoutForm is the only object that talks to Shipping.", "setOptions()", "Shipping does not import CountryField.", { id: "ship", lines: ["options: ground"] }),
        beat("Tax follows", "The form updates Tax. CountryField never named it.", "setRate()", "A new field registers with the form.", { id: "tax", lines: ["rate: 0.08"] }),
      ],
      snippet: `class CheckoutForm {
  changed(country: string) {
    this.shipping.setOptions(country)
    this.tax.setRate(country)
  }
}`,
    }),
  ];
}

export function mementoScenarios(): Scenario[] {
  return [
    fan({
      id: "game-save",
      label: "Game Checkpoint",
      shortLabel: "Save",
      domain: "Gaming",
      prompt: "A checkpoint must restore health and the room. The save slot must not read those fields itself.",
      participants: roles(
        "Player asks the hero to save, then the slot to restore.",
        "Hero creates and applies a sealed snapshot.",
        "SaveSlot stores the snapshot and cannot open it.",
      ),
      client: actor("hero", "Hero", "originator", ["hp: 12", "room: hall"]),
      core: actor("slot", "SaveSlot", "caretaker", ["stack: 0", "cannot read hp"]),
      a: actor("snap", "Snapshot", "snapshot", ["sealed", "hp: 12"]),
      b: actor("ui", "PauseMenu", "client", ["save()", "load()"]),
      showAll: true,
      linkLabel: "stores",
      dashed: false,
      beats: [
        beat("Menu reads health", "The pause menu copies hero.hp into its own struct.", "slot.hp = hero.hp", "The menu knows private fields."),
        beat("Hero makes a snapshot", "save() asks the hero for a memento. The menu stores the object.", "save()", "The snapshot is opaque.", { id: "snap", lines: ["sealed", "hp: 12"] }),
        beat("Hero takes a hit", "The live hero changes. The snapshot does not.", "hp = 4", "The slot still cannot read hp.", { id: "hero", lines: ["hp: 4", "room: hall"] }),
        beat("Restore", "load() hands the snapshot back. The hero writes its own fields.", "restore()", "The menu never saw the numbers.", { id: "hero", lines: ["hp: 12", "room: hall"] }),
      ],
      snippet: `class Hero {
  save() { return new Snapshot(this.hp, this.room) }
  restore(snap: Snapshot) { this.hp = snap.hp; this.room = snap.room }
}`,
    }),
    fan({
      id: "canvas-history",
      label: "Canvas History",
      shortLabel: "Canvas",
      domain: "Design",
      prompt: "Undo must restore the canvas. The history stack must not poke at shapes.",
      participants: roles(
        "Canvas creates a snapshot of its shapes.",
        "History stores snapshots and cannot edit them.",
        "Snapshot is sealed.",
      ),
      client: actor("canvas", "Canvas", "originator", ["shapes: 2"]),
      core: actor("history", "History", "caretaker", ["stack: 0", "cannot edit"]),
      a: actor("snap", "Snapshot", "snapshot", ["sealed", "shapes: 2"]),
      b: actor("tool", "Brush", "client", ["draws"]),
      showAll: true,
      linkLabel: "stores",
      dashed: false,
      beats: [
        beat("History edits shapes", "Undo reaches into the shape list and deletes the last one.", "shapes.pop()", "History knows the canvas internals."),
        beat("Canvas snapshots", "The canvas captures its shapes before the stroke.", "save()", "History pushes an opaque object.", { id: "history", lines: ["stack: 1"] }),
        beat("Brush adds a stroke", "The live canvas changes. The snapshot does not.", "draw()", "The stack still holds the old picture.", { id: "canvas", lines: ["shapes: 3"] }),
        beat("Undo restores", "History hands the snapshot back. The canvas applies it.", "restore()", "A new tool does not teach History about shapes.", { id: "canvas", lines: ["shapes: 2"] }),
      ],
      snippet: `class Canvas {
  save() { return new Snapshot(this.shapes.map((s) => s.copy())) }
  restore(snap: Snapshot) { this.shapes = snap.shapes }
}`,
    }),
    fan({
      id: "draft-save",
      label: "Draft Auto-Save",
      shortLabel: "Drafts",
      domain: "CMS",
      prompt: "An editor auto-saves a draft. The saver must not understand the article fields.",
      participants: roles(
        "Article creates a draft snapshot.",
        "DraftStore keeps the latest snapshot.",
        "The editor restores it after a crash.",
      ),
      client: actor("article", "Article", "originator", ["title: Hello", "body: …"]),
      core: actor("store", "DraftStore", "caretaker", ["saved: 0", "cannot read body"]),
      a: actor("draft", "Draft", "snapshot", ["sealed", "title: Hello"]),
      b: actor("editor", "Editor", "client", ["autosave()"]),
      showAll: true,
      linkLabel: "stores",
      dashed: false,
      beats: [
        beat("Saver reads the body", "The auto-save job copies article.body into a row by hand.", "row.body = article.body", "The job knows every field."),
        beat("Article snapshots", "The article builds a draft. The store saves the object.", "save()", "The store cannot see the title.", { id: "store", lines: ["saved: 1"] }),
        beat("The author keeps typing", "The live title changes. The draft stays put.", "title = Hello!", "Reload can still return to Hello.", { id: "article", lines: ["title: Hello!", "body: …"] }),
        beat("Reload restores", "The editor hands the draft back to the article.", "restore()", "A new field is snapshotted by the article only.", { id: "article", lines: ["title: Hello", "body: …"] }),
      ],
      snippet: `class Article {
  save() { return new Draft(this.title, this.body) }
  restore(draft: Draft) { this.title = draft.title; this.body = draft.body }
}`,
    }),
  ];
}

export function observerScenarios(): Scenario[] {
  return [
    fan({
      id: "newsletter",
      label: "Newsletter",
      shortLabel: "News",
      domain: "Classic",
      prompt: "A new issue should email subscribers. The publisher must not import each list.",
      participants: roles(
        "Publisher calls notify() and does not name the lists.",
        "Subscriber is the observer interface.",
        "EmailList and PushList react on their own.",
      ),
      client: actor("pub", "Publisher", "subject", ["listeners: 0", "publish()"]),
      core: actor("issue", "Issue", "product", ["title: May"]),
      a: actor("email", "EmailList", "observer", ["subscribed: no"]),
      b: actor("push", "PushList", "observer", ["subscribed: no"]),
      linkLabel: "notifies",
      beats: [
        beat("Publisher calls both", "publish() calls email.send and push.send. A third channel edits this method.", "email.send()", "The publisher knows its audience."),
        beat("Lists subscribe", "EmailList registers. The publisher stores the interface only.", "subscribe()", "Adding a list is a registration.", { id: "pub", lines: ["listeners: 1"] }),
        beat("Publish notifies", "notify() loops listeners. EmailList sends the issue.", "notify()", "The publisher did not name EmailList.", { id: "email", lines: ["sent May"] }),
        beat("Push joins", "PushList subscribes. publish() is unchanged.", "subscribe()", "A new channel is a new subscriber.", { id: "push", lines: ["subscribed: yes"] }),
      ],
      snippet: `interface Subscriber { update(issue: string): void }

class Publisher {
  private lists: Subscriber[] = []
  publish(issue: string) { this.lists.forEach((list) => list.update(issue)) }
}`,
    }),
    fan({
      id: "stock-ticker",
      label: "Stock Ticker",
      shortLabel: "Stocks",
      domain: "Fintech",
      prompt: "A price change should reach the tape and the alerts. The feed must not import either.",
      participants: roles(
        "Feed calls notify(price) and does not name the screens.",
        "Ticker is the observer interface.",
        "Tape and Alerts each decide what a price means.",
      ),
      client: actor("feed", "Feed", "subject", ["listeners: 0", "price: 190"]),
      core: actor("quote", "Quote", "product", ["AAPL", "190"]),
      a: actor("tape", "Tape", "observer", ["subscribed: no"]),
      b: actor("alerts", "Alerts", "observer", ["subscribed: no"]),
      linkLabel: "notifies",
      beats: [
        beat("Feed updates screens", "The feed calls tape.print and alerts.check. A dashboard edits the feed.", "tape.print()", "The source knows its listeners."),
        beat("Screens subscribe", "Tape registers with the feed.", "subscribe()", "The feed stores Ticker, not Tape.", { id: "feed", lines: ["listeners: 1"] }),
        beat("Price tick", "notify(190) runs. Tape prints the quote.", "notify(190)", "The feed did not import Tape.", { id: "tape", lines: ["AAPL 190"] }),
        beat("Alerts join", "Alerts subscribes to the same feed. The tick method is unchanged.", "subscribe()", "A new screen is a new subscriber.", { id: "alerts", lines: ["watching 190"] }),
      ],
      snippet: `interface Ticker { update(symbol: string, price: number): void }

class Feed {
  private tickers: Ticker[] = []
  tick(symbol: string, price: number) {
    this.tickers.forEach((t) => t.update(symbol, price))
  }
}`,
    }),
    fan({
      id: "app-store",
      label: "App Store",
      shortLabel: "Store",
      domain: "Frontend",
      prompt: "A cart change should refresh the badge and the total. The store must not import those components.",
      participants: roles(
        "Store calls notify() after setState.",
        "Listener is the observer interface.",
        "Badge and Total each re-render from the snapshot.",
      ),
      client: actor("store", "Store", "subject", ["listeners: 0", "items: 0"]),
      core: actor("state", "State", "product", ["items: 0"]),
      a: actor("badge", "Badge", "observer", ["subscribed: no"]),
      b: actor("total", "Total", "observer", ["subscribed: no"]),
      linkLabel: "notifies",
      beats: [
        beat("Store calls components", "add() calls badge.set and total.set. A new view edits the store.", "badge.set(1)", "The store knows the view tree."),
        beat("Views subscribe", "Badge registers a listener.", "subscribe()", "The store keeps a list of listeners.", { id: "store", lines: ["listeners: 1", "items: 0"] }),
        beat("Add an item", "setState notifies. Badge re-renders from the snapshot.", "notify()", "The store did not name Badge.", { id: "badge", lines: ["count: 1"] }),
        beat("Total joins", "Total subscribes. add() does not change.", "subscribe()", "A new view is a new listener.", { id: "total", lines: ["sum: 12"] }),
      ],
      snippet: `type Listener = (state: State) => void

class Store {
  private listeners: Listener[] = []
  add(item: string) {
    this.state = { items: [...this.state.items, item] }
    this.listeners.forEach((listen) => listen(this.state))
  }
}`,
    }),
  ];
}

export function stateScenarios(pattern: Pattern): Scenario[] {
  return [
    fan({
      id: "vending",
      label: "Vending Machine",
      shortLabel: "Vending",
      domain: "Hardware",
      prompt: "Inserting a coin and dispensing a can are illegal in some states. The machine must not switch on a status string.",
      participants: roles(
        "Panel calls insert() and dispense() with no status checks.",
        "Machine delegates to its current state.",
        "Idle and HasCoin know which moves are legal.",
      ),
      client: actor("panel", "Panel", "client", ["insert()", "dispense()"]),
      core: actor("machine", "Machine", "context", ["state: idle"]),
      a: actor("idle", "Idle", "state", ["insert → HasCoin", "dispense: no"]),
      b: actor("paid", "HasCoin", "state", ["dispense → Idle"]),
      beats: [
        beat("Status switches", "dispense() checks if (state === 'paid') else throws. Every new state edits both methods.", "if (state)", "Rules live in the machine."),
        beat("Panel calls dispense", "The panel does not read the status. The machine forwards.", "dispense()", "Illegal moves fail inside the state."),
        beat("Idle refuses", "Idle.dispense() rejects. No can comes out.", "dispense()", "The refusal is the state's job.", { id: "idle", lines: ["dispense: rejected"] }),
        beat("Coin then can", "insert() moves to HasCoin. dispense() then returns a can and goes back to Idle.", "insert()", "A new state is a new class.", { id: "machine", lines: ["state: has coin"] }),
      ],
      snippet: `interface VendState {
  insert(machine: Machine): void
  dispense(machine: Machine): void
}

class Idle implements VendState {
  dispense() { throw new Error("insert a coin") }
}`,
    }),
    classicScenario(pattern, { id: "order-lifecycle", label: "Order Lifecycle", shortLabel: "Orders", domain: "Commerce" }),
    fan({
      id: "media-player",
      label: "Media Player",
      shortLabel: "Player",
      domain: "Streaming",
      prompt: "Play, pause, and buffer behave differently. The player must not switch on a status string.",
      participants: roles(
        "Controls call play() and pause() with no status checks.",
        "Player delegates to its current state.",
        "Paused and Buffering know which buttons work.",
      ),
      client: actor("controls", "Controls", "client", ["play()", "pause()"]),
      core: actor("player", "Player", "context", ["state: paused"]),
      a: actor("paused", "Paused", "state", ["play → Buffering"]),
      b: actor("buffer", "Buffering", "state", ["ready → Playing"]),
      beats: [
        beat("Buttons check status", "play() switches on paused versus buffering versus playing.", "switch (status)", "A new status edits every button."),
        beat("Controls call play", "The controls do not read status. The player forwards.", "play()", "The state object owns the rule."),
        beat("Paused starts a buffer", "Paused.play() moves the player to Buffering.", "play()", "Pause does not know how playing works.", { id: "player", lines: ["state: buffering"] }),
        beat("Buffer finishes", "Buffering.ready() moves to Playing. The controls are unchanged.", "ready()", "A new status is a new class.", { id: "buffer", lines: ["ready → Playing"] }),
      ],
      snippet: `interface PlayState { play(player: Player): void }

class Paused implements PlayState {
  play(player: Player) { player.become(new Buffering()) }
}`,
    }),
  ];
}

export function strategyScenarios(pattern: Pattern): Scenario[] {
  return [
    fan({
      id: "sort-strategy",
      label: "Sort Strategy",
      shortLabel: "Sort",
      domain: "Algorithms",
      prompt: "A table sorts by name or by price. The table must not grow a switch for each algorithm.",
      participants: roles(
        "Table calls sort(rows) on its strategy.",
        "Sorter is the interface.",
        "ByName and ByPrice are the algorithms.",
      ),
      client: actor("table", "Table", "context", ["strategy: name", "rows: 3"]),
      core: actor("sorter", "Sorter", "interface", ["sort(rows)"]),
      a: actor("name", "ByName", "strategy", ["localeCompare"]),
      b: actor("price", "ByPrice", "strategy", ["numeric"]),
      beats: [
        beat("Switch in the table", "sort() branches on the column. A new column edits the table.", "switch (column)", "The algorithm sits in the view."),
        beat("Table holds a sorter", "The table calls strategy.sort(rows).", "sort(rows)", "The table does not know localeCompare."),
        beat("Sort by name", "ByName orders the rows.", "sort(rows)", "One algorithm, one class.", { id: "table", lines: ["strategy: name", "order: A–Z"] }),
        beat("Swap to price", "The table replaces the strategy. sort() is the same call.", "sort(rows)", "A new column is a new strategy.", { id: "table", lines: ["strategy: price", "order: 0–9"] }),
      ],
      snippet: `interface Sorter { sort(rows: Row[]): Row[] }

class ByPrice implements Sorter {
  sort(rows: Row[]) { return [...rows].sort((a, b) => a.price - b.price) }
}`,
    }),
    fan({
      id: "dynamic-pricing",
      label: "Dynamic Pricing",
      shortLabel: "Pricing",
      domain: "Fintech",
      prompt: "A cart prices a full fare, a coupon, or a member rate. Checkout must not switch on the campaign.",
      participants: roles(
        "Checkout calls price(cart) on its strategy.",
        "Pricer is the interface.",
        "Coupon and Member are the rates.",
      ),
      client: actor("checkout", "Checkout", "context", ["pricer: full", "total: —"]),
      core: actor("pricer", "Pricer", "interface", ["price(cart)"]),
      a: actor("coupon", "Coupon", "strategy", ["less 10"]),
      b: actor("member", "Member", "strategy", ["less 15%"]),
      beats: [
        beat("Campaign switch", "total() branches on coupon versus member versus full.", "switch (code)", "A new campaign edits checkout."),
        beat("Checkout asks the pricer", "Checkout calls price(cart) and stores the number.", "price(cart)", "Checkout does not know the formula."),
        beat("Coupon rate", "Coupon subtracts 10.", "price(cart)", "The rule is one class.", { id: "checkout", lines: ["pricer: coupon", "total: 90"] }),
        beat("Member rate", "Replacing the strategy changes the total. Checkout.price is untouched.", "price(cart)", "A new campaign is a new pricer.", { id: "checkout", lines: ["pricer: member", "total: 85"] }),
      ],
      snippet: `interface Pricer { price(cart: Cart): number }

class Coupon implements Pricer {
  price(cart: Cart) { return cart.subtotal - 10 }
}`,
    }),
    classicScenario(pattern, { id: "shipping-calc", label: "Shipping Calculator", shortLabel: "Shipping", domain: "Logistics" }),
  ];
}

export function templateScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "data-miner", label: "Data Miner", shortLabel: "Miner", domain: "Pipeline" }),
    fan({
      id: "game-turn",
      label: "Game Turn",
      shortLabel: "Turn",
      domain: "Gaming",
      prompt: "Every turn starts, plays, and ends. Chess and poker differ only in the play step.",
      participants: roles(
        "Match calls takeTurn() and does not know the rules.",
        "Turn.play() is the skeleton.",
        "ChessTurn and PokerTurn override play().",
      ),
      client: actor("match", "Match", "client", ["takeTurn()"]),
      core: actor("turn", "Turn", "template", ["start()", "play()", "end()"]),
      a: actor("chess", "ChessTurn", "subclass", ["play: move"]),
      b: actor("poker", "PokerTurn", "subclass", ["play: bet"]),
      beats: [
        beat("Copied loops", "Chess and poker each copy start and cleanup. A bug fix lands in one of them.", "copy loop", "The skeleton drifts."),
        beat("Match takes a turn", "Match calls takeTurn(). It does not know which game this is.", "takeTurn()", "start and end are shared."),
        beat("Chess plays", "ChessTurn.play() makes a move. start() already ran.", "play()", "Only the hook differs.", { id: "turn", lines: ["step: play", "impl: chess"] }),
        beat("Poker plays", "PokerTurn overrides the same hook. takeTurn() is untouched.", "play()", "A new game is a new subclass.", { id: "turn", lines: ["step: play", "impl: poker"] }),
      ],
      snippet: `abstract class Turn {
  takeTurn() { this.start(); this.play(); this.end() }
  protected abstract play(): void
}

class ChessTurn extends Turn {
  protected play() { this.move() }
}`,
    }),
    fan({
      id: "ci-pipeline",
      label: "CI Pipeline",
      shortLabel: "CI",
      domain: "DevOps",
      prompt: "Every build checks out, builds, tests, and deploys. Node and Go differ only in the build step.",
      participants: roles(
        "Runner calls run() and does not know the toolchain.",
        "Pipeline is the skeleton.",
        "NodePipeline and GoPipeline override build().",
      ),
      client: actor("runner", "Runner", "client", ["run()"]),
      core: actor("pipeline", "Pipeline", "template", ["checkout", "build", "test"]),
      a: actor("node", "NodePipeline", "subclass", ["build: npm"]),
      b: actor("golang", "GoPipeline", "subclass", ["build: go"]),
      beats: [
        beat("Copied scripts", "The Node script and the Go script each checkout and test. They drift.", "bash copy", "A failed test step is fixed twice."),
        beat("Runner starts", "Runner calls run(). Checkout and test are already in the base.", "run()", "The toolchain is a hook."),
        beat("Node builds", "NodePipeline.build() runs npm. test() still comes from the base.", "build()", "Only the build hook differs.", { id: "pipeline", lines: ["step: build", "impl: npm"] }),
        beat("Go builds", "GoPipeline overrides build(). run() is untouched.", "build()", "A new language is a new subclass.", { id: "pipeline", lines: ["step: build", "impl: go"] }),
      ],
      snippet: `abstract class Pipeline {
  run() { this.checkout(); this.build(); this.test() }
  protected abstract build(): void
}

class NodePipeline extends Pipeline {
  protected build() { this.exec("npm run build") }
}`,
    }),
  ];
}

export function visitorScenarios(): Scenario[] {
  return [
    fan({
      id: "cart-tax",
      label: "Cart Tax",
      shortLabel: "Tax",
      domain: "Fintech",
      prompt: "Food and electronics are taxed differently. Adding a receipt export must not edit those item classes.",
      participants: roles(
        "Checkout runs a visitor over the cart.",
        "Item.accept(visitor) is the only method items add.",
        "TaxVisitor and ReceiptVisitor are two operations.",
      ),
      client: actor("checkout", "Checkout", "client", ["visit cart"]),
      core: actor("food", "Food", "element", ["price: 4", "accept(v)"]),
      a: actor("tax", "TaxVisitor", "visitor", ["food: 0%", "elec: 8%"]),
      b: actor("receipt", "ReceiptVisitor", "visitor", ["lines: 0"]),
      linkLabel: "accepts",
      beats: [
        beat("Tax methods on the item", "Food.tax() and Electronics.tax() exist. A receipt method means editing both classes.", "item.tax()", "New operations change stable types."),
        beat("Checkout picks a visitor", "Checkout calls accept(tax) on each item.", "accept(tax)", "The item does not know the rate table."),
        beat("Food tax", "TaxVisitor.visitFood returns 0. The food class did not change.", "visitFood()", "The operation lives on the visitor.", { id: "tax", lines: ["food: 0"] }),
        beat("A receipt visitor", "ReceiptVisitor walks the same items. Food is untouched.", "accept(receipt)", "A new operation is a new visitor.", { id: "receipt", lines: ["lines: 2"] }),
      ],
      snippet: `interface Item { accept(visitor: ItemVisitor): number }

class TaxVisitor {
  visitFood(item: Food) { return 0 }
  visitElectronics(item: Electronics) { return item.price * 0.08 }
}`,
    }),
    fan({
      id: "ast-lint",
      label: "AST Linter",
      shortLabel: "Linter",
      domain: "Compilers",
      prompt: "The syntax tree is done. A linter and a formatter must walk it without adding methods to every node.",
      participants: roles(
        "Tool runs a visitor over the file.",
        "Node.accept(visitor) dispatches.",
        "LintVisitor and FormatVisitor are two passes.",
      ),
      client: actor("tool", "Tool", "client", ["walk file"]),
      core: actor("call", "CallExpr", "element", ["name: print", "accept(v)"]),
      a: actor("lint", "LintVisitor", "visitor", ["warnings: 0"]),
      b: actor("format", "FormatVisitor", "visitor", ["out: —"]),
      linkLabel: "accepts",
      beats: [
        beat("Lint methods on nodes", "CallExpr.lint() and IfStmt.lint() exist. A formatter edits every node.", "node.lint()", "The tree changes for every tool."),
        beat("Tool picks a visitor", "The tool calls accept(lint) on the root.", "accept(lint)", "Nodes only know accept()."),
        beat("Lint the call", "LintVisitor.visitCall flags a missing argument.", "visitCall()", "The warning lives on the visitor.", { id: "lint", lines: ["warnings: 1"] }),
        beat("Format the same tree", "FormatVisitor walks the same nodes. CallExpr is untouched.", "accept(format)", "A new pass is a new visitor.", { id: "format", lines: ["out: print()"] }),
      ],
      snippet: `interface AstNode { accept(visitor: AstVisitor): void }

class LintVisitor {
  visitCall(node: CallExpr) {
    if (node.args.length === 0) this.warn(node)
  }
}`,
    }),
    fan({
      id: "doc-export",
      label: "Doc Export",
      shortLabel: "Export",
      domain: "Tooling",
      prompt: "A document has headings and tables. HTML and PDF export must not add methods to those nodes.",
      participants: roles(
        "Exporter runs a visitor over the document.",
        "Block.accept(visitor) dispatches.",
        "HtmlVisitor and PdfVisitor are two formats.",
      ),
      client: actor("export", "Exporter", "client", ["walk doc"]),
      core: actor("heading", "Heading", "element", ["text: May", "accept(v)"]),
      a: actor("html", "HtmlVisitor", "visitor", ["out: —"]),
      b: actor("pdf", "PdfVisitor", "visitor", ["pages: 0"]),
      linkLabel: "accepts",
      beats: [
        beat("Export methods on blocks", "Heading.toHtml() and Heading.toPdf() both exist. Markdown means another edit.", "toHtml()", "Nodes change for every format."),
        beat("Pick a visitor", "The exporter calls accept(html) on each block.", "accept(html)", "The heading does not know HTML."),
        beat("HTML heading", "HtmlVisitor.visitHeading writes an h1.", "visitHeading()", "The tag lives on the visitor.", { id: "html", lines: ["<h1>May</h1>"] }),
        beat("PDF of the same doc", "PdfVisitor walks the same blocks. Heading is untouched.", "accept(pdf)", "A new format is a new visitor.", { id: "pdf", lines: ["pages: 1"] }),
      ],
      snippet: `interface Block { accept(visitor: DocVisitor): void }

class HtmlVisitor {
  visitHeading(node: Heading) { this.out += "<h1>" + node.text + "</h1>" }
}`,
    }),
  ];
}

export function interpreterScenarios(): Scenario[] {
  return [
    fan({
      id: "query-filter",
      label: "Query Filter",
      shortLabel: "Query",
      domain: "Database",
      prompt: "Users combine status = paid AND total > 10. The evaluator must not grow a switch per operator.",
      participants: roles(
        "Search calls interpret(row) on the tree.",
        "Expr is the node interface.",
        "Equals and And are two node types.",
      ),
      client: actor("search", "Search", "client", ["interpret(row)"]),
      core: actor("and", "And", "expression", ["left", "right"]),
      a: actor("eq", "Equals", "expression", ["status = paid"]),
      b: actor("gt", "Greater", "expression", ["total > 10"]),
      showAll: true,
      linkLabel: "nests",
      dashed: false,
      beats: [
        beat("One giant if", "The evaluator switches on =, >, and AND in one function.", "switch (op)", "A new operator edits the evaluator."),
        beat("Search interprets", "Search calls interpret(row) on the root.", "interpret(row)", "The tree is the query."),
        beat("Equals checks status", "Equals returns whether the row is paid.", "interpret(row)", "The comparison is one class.", { id: "eq", lines: ["true"] }),
        beat("And combines", "And interprets both sides. Search did not change.", "interpret(row)", "A new operator is a new node.", { id: "and", lines: ["true && true"] }),
      ],
      snippet: `interface Expr { interpret(row: Row): boolean }

class And implements Expr {
  constructor(private left: Expr, private right: Expr) {}
  interpret(row: Row) { return this.left.interpret(row) && this.right.interpret(row) }
}`,
    }),
    fan({
      id: "math-expr",
      label: "Math Expression",
      shortLabel: "Math",
      domain: "Calculator",
      prompt: "1 + 2 * 3 should be a tree. The calculator must not re-parse the string for every operator.",
      participants: roles(
        "Calculator calls interpret() on the root.",
        "Expr is the node interface.",
        "Add and Mul are two operators.",
      ),
      client: actor("calc", "Calculator", "client", ["interpret()"]),
      core: actor("add", "Add", "expression", ["1 + (2*3)"]),
      a: actor("mul", "Mul", "expression", ["2 * 3"]),
      b: actor("num", "Num", "expression", ["value: 1"]),
      showAll: true,
      linkLabel: "nests",
      dashed: false,
      beats: [
        beat("Parse on the fly", "The calculator scans the string and switches on + and *.", "switch (token)", "Precedence is a pile of conditionals."),
        beat("Interpret the tree", "Calculator calls interpret() on Add.", "interpret()", "The string was parsed once."),
        beat("Multiply first", "Mul interprets 2 and 3 and returns 6.", "interpret()", "Mul does not know about Add.", { id: "mul", lines: ["value: 6"] }),
        beat("Add the result", "Add interprets 1 and the product. The calculator is unchanged.", "interpret()", "Exponent would be a new node.", { id: "add", lines: ["value: 7"] }),
      ],
      snippet: `interface Expr { interpret(): number }

class Add implements Expr {
  constructor(private left: Expr, private right: Expr) {}
  interpret() { return this.left.interpret() + this.right.interpret() }
}`,
    }),
    fan({
      id: "regex-rules",
      label: "Regex Rules",
      shortLabel: "Rules",
      domain: "Strings",
      prompt: "A rule is 'starts with ERR' or that rule OR 'contains timeout'. Do not special-case each combinator.",
      participants: roles(
        "Router calls test(line) on the rule tree.",
        "Rule is the node interface.",
        "StartsWith and Or are two nodes.",
      ),
      client: actor("router", "Router", "client", ["test(line)"]),
      core: actor("or", "Or", "expression", ["left or right"]),
      a: actor("starts", "StartsWith", "expression", ["ERR"]),
      b: actor("has", "Contains", "expression", ["timeout"]),
      showAll: true,
      linkLabel: "nests",
      dashed: false,
      beats: [
        beat("Combinators in the router", "The router checks startsWith, then contains, then ORs them by hand.", "if / else", "A new combinator edits the router."),
        beat("Test the tree", "Router calls test(line) on the root.", "test(line)", "The rule was built once."),
        beat("StartsWith matches", "StartsWith checks the prefix ERR.", "test(line)", "The match is one class.", { id: "starts", lines: ["ERR: true"] }),
        beat("Or combines", "Or is true if either side matches. The router did not change.", "test(line)", "A new combinator is a new node.", { id: "or", lines: ["true"] }),
      ],
      snippet: `interface Rule { test(line: string): boolean }

class Or implements Rule {
  constructor(private left: Rule, private right: Rule) {}
  test(line: string) { return this.left.test(line) || this.right.test(line) }
}`,
    }),
  ];
}
