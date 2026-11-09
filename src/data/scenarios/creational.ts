import type { Pattern, Scenario } from "../types";
import { actor, beat, classicScenario, fan } from "./build";

const people = (client: string, core: string, product: string): { role: string; does: string }[] => [
  { role: "Client", does: client },
  { role: "Abstraction", does: core },
  { role: "Concrete", does: product },
];

export function builderScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "report-builder", label: "Report Builder", shortLabel: "Report", domain: "Office" }),
    fan({
      id: "query-builder",
      label: "SQL Query Builder",
      shortLabel: "SQL",
      domain: "Backend",
      prompt: "Reports assemble a SELECT with filters and a limit. Callers must not concatenate SQL strings.",
      participants: people(
        "AnalyticsJob calls build() and never concatenates SQL.",
        "QueryBuilder collects select, where, and limit, then emits one statement.",
        "SelectQuery and CountQuery are the finished statements.",
      ),
      client: actor("job", "AnalyticsJob", "client", ["build()", "no string SQL"]),
      core: actor("builder", "QueryBuilder", "builder", ["select: —", "where: 0"]),
      a: actor("select", "SelectQuery", "product", ["sql: —", "rows: ?"]),
      b: actor("count", "CountQuery", "product", ["sql: —", "rows: count"]),
      beats: [
        beat("Hand-built SQL", "The job glues a SELECT by hand. A quote in a filter becomes an injection.", "sql += filter", "Every report invents its own string."),
        beat("Collect the clauses", "The job only calls the builder. Order of clauses is the builder's job.", "where(status)", "Shared assembly moves into the builder.", { id: "builder", lines: ["select: orders", "where: 1"] }),
        beat("Build the select", "build() returns a statement. The job never sees the string until then.", "build()", "SelectQuery is immutable once built.", { id: "select", lines: ["sql: sealed", "rows: ?"] }),
        beat("Same steps, other shape", "A count report reuses where() and limit(). Only the final product changes.", "build()", "A new product, not a new string template.", { id: "builder", lines: ["select: count", "where: 1"] }),
      ],
      snippet: `class QueryBuilder {
  private filters: string[] = []
  where(filter: string) { this.filters.push(filter); return this }
  build(): Query { return new SelectQuery(this.filters) }
}

const query = new QueryBuilder().where("status = paid").build()`,
    }),
    fan({
      id: "form-builder",
      label: "Form Builder",
      shortLabel: "Form",
      domain: "Frontend",
      prompt: "A settings screen and a checkout screen share field rules. Screens should not each hand-roll inputs.",
      participants: people(
        "SettingsPage calls build() and does not import input widgets.",
        "FormBuilder adds fields, then returns one form.",
        "SettingsForm and CheckoutForm are the finished trees.",
      ),
      client: actor("page", "SettingsPage", "client", ["build()", "no widget new"]),
      core: actor("builder", "FormBuilder", "builder", ["fields: 0", "valid: —"]),
      a: actor("settings", "SettingsForm", "product", ["fields: —", "submit()"]),
      b: actor("checkout", "CheckoutForm", "product", ["fields: —", "pay()"]),
      beats: [
        beat("Widgets in the page", "The page constructs inputs itself. Validation is copied into the next screen.", "new TextField()", "Each screen owns a private form dialect."),
        beat("Describe the fields", "The page adds fields to the builder and stops there.", "field(email)", "Rules live on the builder, not the page.", { id: "builder", lines: ["fields: 1", "valid: email"] }),
        beat("Build settings", "build() returns a settings form the page can render.", "build()", "SettingsForm carries the email rule.", { id: "settings", lines: ["fields: 1", "submit()"] }),
        beat("Reuse for checkout", "Checkout adds a card field with the same builder. SettingsPage does not change.", "build()", "A second product, same construction steps.", { id: "builder", lines: ["fields: 2", "valid: card"] }),
      ],
      snippet: `class FormBuilder {
  private fields: Field[] = []
  field(name: string) { this.fields.push({ name }); return this }
  build(): Form { return new SettingsForm(this.fields) }
}

const form = new FormBuilder().field("email").build()`,
    }),
  ];
}

export function prototypeScenarios(): Scenario[] {
  return [
    fan({
      id: "doc-template",
      label: "Document Template",
      shortLabel: "Docs",
      domain: "Office",
      prompt: "Every contract shares a letterhead and clause set. Copying the file by hand drops the logo.",
      participants: people(
        "ContractDesk calls clone() and never rebuilds the letterhead.",
        "TemplateRegistry stores one prototype per document kind.",
        "Contract and Nda are clones with their own parties.",
      ),
      client: actor("desk", "ContractDesk", "client", ["clone()", "no letterhead setup"]),
      core: actor("registry", "TemplateRegistry", "catalog", ["key: contract"]),
      a: actor("contract", "Contract", "prototype", ["logo: loaded", "party: —"]),
      b: actor("nda", "Nda", "clone", ["logo: loaded", "party: —"]),
      linkLabel: "clones",
      beats: [
        beat("Blank document", "The desk builds a contract from scratch and forgets the logo.", "new Contract()", "Heavy setup is repeated, and it drifts."),
        beat("Ask the registry", "The desk requests the contract prototype. It does not know the class.", "get(contract)", "One registered object owns the shared setup."),
        beat("Clone the contract", "clone() copies letterhead and clauses. The desk fills the parties.", "clone()", "The copy is independent after clone.", { id: "contract", lines: ["logo: loaded", "party: Ada"] }),
        beat("Another template", "An NDA is a second prototype. ContractDesk still only calls clone().", "clone()", "A new preset, not a new constructor in the desk.", { id: "registry", lines: ["key: nda"] }),
      ],
      snippet: `interface Document { clone(): Document }

class Contract implements Document {
  constructor(private logo: string) {}
  clone() { return new Contract(this.logo) }
}

const copy = registry.get("contract").clone()`,
    }),
    fan({
      id: "vm-snapshot",
      label: "Server VM Snapshot",
      shortLabel: "VM",
      domain: "Cloud",
      prompt: "A base image has packages and agents. New instances should clone that image, not reinstall it.",
      participants: people(
        "Provisioner calls clone() and never reruns the base install.",
        "ImageRegistry holds the golden snapshot.",
        "WebImage and WorkerImage are the presets.",
      ),
      client: actor("prov", "Provisioner", "client", ["clone()", "no apt install"]),
      core: actor("images", "ImageRegistry", "catalog", ["key: web"]),
      a: actor("web", "WebImage", "prototype", ["agent: loaded", "role: —"]),
      b: actor("worker", "WorkerImage", "clone", ["agent: loaded", "role: —"]),
      linkLabel: "clones",
      beats: [
        beat("Reinstall every boot", "The provisioner runs the full setup on a blank VM.", "new BlankVm()", "Packages and agents are rebuilt from zero."),
        beat("Pick the golden image", "The provisioner asks the registry for the web snapshot.", "get(web)", "The expensive setup already happened once."),
        beat("Clone the image", "clone() copies packages and the agent. The instance only sets its role.", "clone()", "WebImage stays the untouched preset.", { id: "web", lines: ["agent: loaded", "role: api"] }),
        beat("Worker preset", "A worker image is another snapshot. The provisioner still only clones.", "clone()", "A new image, not a new install script.", { id: "images", lines: ["key: worker"] }),
      ],
      snippet: `interface MachineImage { clone(): MachineImage }

class WebImage implements MachineImage {
  constructor(private agent: string) {}
  clone() { return new WebImage(this.agent) }
}

const node = images.get("web").clone()`,
    }),
    fan({
      id: "npc-spawner",
      label: "Game NPC Spawner",
      shortLabel: "NPCs",
      domain: "Gaming",
      prompt: "A goblin preset has stats and loot. Spawning one must not rebuild that preset.",
      participants: people(
        "Spawner calls clone() and never retypes goblin stats.",
        "Bestiary stores one prototype per creature.",
        "Goblin and Orc are the presets.",
      ),
      client: actor("spawn", "Spawner", "client", ["clone()", "no stat tables"]),
      core: actor("book", "Bestiary", "catalog", ["key: goblin"]),
      a: actor("goblin", "Goblin", "prototype", ["hp: 12", "name: —"]),
      b: actor("orc", "Orc", "clone", ["hp: 30", "name: —"]),
      linkLabel: "clones",
      beats: [
        beat("Stats typed again", "The spawner constructs a goblin and retypes hit points.", "new Goblin(12)", "Every spawn site can drift from the preset."),
        beat("Read the preset", "The spawner asks the bestiary. It does not know the class.", "get(goblin)", "One object is the source of the stats."),
        beat("Clone a goblin", "clone() copies hp and loot. The spawner only sets the name.", "clone()", "The preset stays in the bestiary.", { id: "goblin", lines: ["hp: 12", "name: Rik"] }),
        beat("Orc preset", "An orc is a second prototype. The spawner still only calls clone().", "clone()", "A new creature, not a new switch.", { id: "book", lines: ["key: orc"] }),
      ],
      snippet: `interface Creature { clone(): Creature }

class Goblin implements Creature {
  constructor(private hp: number) {}
  clone() { return new Goblin(this.hp) }
}

const mob = bestiary.get("goblin").clone()`,
    }),
  ];
}

export function singletonScenarios(): Scenario[] {
  return [
    fan({
      id: "app-config",
      label: "App Config Registry",
      shortLabel: "Config",
      domain: "System",
      prompt: "API host and feature flags must be the same object everywhere. Two registries means two truths.",
      participants: people(
        "ApiClient and WebApp both call Config.instance().",
        "Config hides the constructor and returns one registry.",
        "The single registry holds host and flags.",
      ),
      client: actor("api", "ApiClient", "client", ["reads host", "owns config? no"]),
      core: actor("config", "Config", "singleton", ["instance: none", "host: —"]),
      a: actor("web", "WebApp", "client", ["reads flags", "owns config? no"]),
      b: actor("boot", "Boot", "client", ["loads env", "once"]),
      showAll: true,
      linkLabel: "reads",
      dashed: false,
      beats: [
        beat("Two registries", "ApiClient builds its own Config. WebApp builds another.", "new Config()", "Hosts diverge. Flags disagree.", { id: "config", lines: ["instance: #1 and #2", "host: split"] }),
        beat("Ask for the instance", "ApiClient calls instance(). Construction is no longer its job.", "instance()", "The first caller creates the registry.", { id: "config", lines: ["instance: #a1", "host: api"] }),
        beat("WebApp joins", "WebApp receives the same object. It does not call new.", "instance()", "Both callers share #a1.", { id: "config", lines: ["instance: #a1", "refs: 2"] }),
        beat("Boot loads once", "Boot fills the registry. Later readers cannot open a second copy.", "load(env)", "One write, every reader sees it.", { id: "config", lines: ["instance: #a1", "host: prod"] }),
      ],
      snippet: `class Config {
  private static current: Config | null = null
  private constructor(readonly host: string) {}
  static instance(host = "prod") {
    return (this.current ??= new Config(host))
  }
}`,
    }),
    fan({
      id: "db-pool",
      label: "Database Pool",
      shortLabel: "Pool",
      domain: "Backend",
      prompt: "Orders and payments must share one connection pool. A pool per service exhausts the database.",
      participants: people(
        "OrderService and PaymentService call Pool.instance().",
        "Pool owns the connections and hands one out.",
        "A single pool caps the open sockets.",
      ),
      client: actor("orders", "OrderService", "client", ["query()", "owns pool? no"]),
      core: actor("pool", "Pool", "singleton", ["instance: none", "open: 0"]),
      a: actor("payments", "PaymentService", "client", ["query()", "owns pool? no"]),
      b: actor("db", "Database", "resource", ["max: 10", "open: 0"]),
      showAll: true,
      linkLabel: "uses",
      dashed: false,
      beats: [
        beat("A pool per service", "Each service opens its own pool. The database hits its connection cap.", "new Pool()", "Ten services means ten pools."),
        beat("Take the shared pool", "OrderService calls instance() and checks out a connection.", "instance()", "The pool is created once.", { id: "pool", lines: ["instance: #p1", "open: 1"] }),
        beat("Payments reuse it", "PaymentService checks out from the same pool.", "checkout()", "Open sockets stay under the cap.", { id: "pool", lines: ["instance: #p1", "open: 2"] }),
        beat("Cap holds", "The database sees one client, the pool, not every service.", "query()", "Adding a service does not add a pool.", { id: "db", lines: ["max: 10", "open: 2"] }),
      ],
      snippet: `class Pool {
  private static current: Pool | null = null
  private constructor(private open = 0) {}
  static instance() { return (this.current ??= new Pool()) }
  checkout() { this.open += 1 }
}`,
    }),
    fan({
      id: "telemetry-bus",
      label: "Telemetry Bus",
      shortLabel: "Events",
      domain: "Frontend",
      prompt: "Clicks and page views must share one event bus. Two buses means a dropped funnel.",
      participants: people(
        "Checkout and Nav both call Bus.instance().",
        "TelemetryBus is the single publisher.",
        "Analytics receives every event from that bus.",
      ),
      client: actor("checkout", "Checkout", "client", ["track()", "owns bus? no"]),
      core: actor("bus", "TelemetryBus", "singleton", ["instance: none", "sinks: 0"]),
      a: actor("nav", "Nav", "client", ["track()", "owns bus? no"]),
      b: actor("sink", "Analytics", "observer", ["events: 0"]),
      showAll: true,
      linkLabel: "publishes",
      dashed: false,
      beats: [
        beat("A bus per screen", "Checkout and Nav each construct a bus. Analytics hears only one of them.", "new TelemetryBus()", "Funnels split across instances."),
        beat("Checkout publishes", "Checkout uses instance() and emits checkout_started.", "instance()", "The bus now exists.", { id: "bus", lines: ["instance: #t1", "sinks: 1"] }),
        beat("Nav uses the same bus", "Nav emits page_view on #t1. It does not call new.", "track(page)", "Both screens share the bus.", { id: "bus", lines: ["instance: #t1", "events: 2"] }),
        beat("One sink", "Analytics subscribes once and sees both events.", "subscribe()", "A new screen does not create a new bus.", { id: "sink", lines: ["events: 2"] }),
      ],
      snippet: `class TelemetryBus {
  private static current: TelemetryBus | null = null
  private constructor() {}
  static instance() { return (this.current ??= new TelemetryBus()) }
  track(name: string) { this.emit(name) }
}`,
    }),
  ];
}
