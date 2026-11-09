import type { Pattern, Scenario } from "../types";
import { actor, beat, classicScenario, fan } from "./build";

const roles = (client: string, core: string, product: string) => [
  { role: "Client", does: client },
  { role: "Abstraction", does: core },
  { role: "Concrete", does: product },
];

export function adapterScenarios(): Scenario[] {
  return [
    fan({
      id: "legacy-widget",
      label: "Legacy UI Widget",
      shortLabel: "Widget",
      domain: "Interface",
      prompt: "A new screen speaks Widget.paint(). The old chart library speaks drawChart(). Wrap it.",
      participants: roles(
        "Dashboard calls paint() and never imports ChartLib.",
        "Widget is the interface the screen already uses.",
        "ChartAdapter translates paint() into drawChart().",
      ),
      client: actor("dash", "Dashboard", "client", ["paint()", "no ChartLib"]),
      core: actor("widget", "Widget", "target", ["paint()", "owned by us"]),
      a: actor("chart", "ChartAdapter", "adapter", ["paint()", "holds ChartLib"]),
      b: actor("grid", "GridAdapter", "adapter", ["paint()", "holds GridLib"]),
      linkLabel: "adapts",
      beats: [
        beat("Library in the screen", "Dashboard calls drawChart() by name. The next library means an edit here.", "drawChart()", "The screen depends on a vendor method."),
        beat("Speak Widget", "Dashboard only calls paint() on the Widget interface.", "paint()", "Vendor names leave the screen."),
        beat("Chart adapter", "ChartAdapter.paint() calls ChartLib.drawChart().", "drawChart()", "The translation sits in one class.", { id: "chart", lines: ["paint() → drawChart()"] }),
        beat("Swap the library", "GridAdapter implements the same Widget. Dashboard is unchanged.", "paint()", "A new adapter, not a new screen.", { id: "widget", lines: ["impl: GridAdapter"] }),
      ],
      snippet: `interface Widget { paint(): void }

class ChartAdapter implements Widget {
  constructor(private lib: ChartLib) {}
  paint() { this.lib.drawChart() }
}

dashboard.render(new ChartAdapter(lib))`,
    }),
    fan({
      id: "soap-bank",
      label: "SOAP Bank Gateway",
      shortLabel: "SOAP",
      domain: "Fintech",
      prompt: "Checkout speaks charge(amount). The bank still speaks a SOAP envelope. Do not leak that into checkout.",
      participants: roles(
        "Checkout calls charge() and never builds a SOAP envelope.",
        "PaymentPort is the interface checkout owns.",
        "SoapBankAdapter and RestBankAdapter each translate charge().",
      ),
      client: actor("checkout", "Checkout", "client", ["charge()", "no SOAP"]),
      core: actor("port", "PaymentPort", "target", ["charge(amount)"]),
      a: actor("soap", "SoapBankAdapter", "adapter", ["charge()", "envelope"]),
      b: actor("rest", "RestBankAdapter", "adapter", ["charge()", "json"]),
      linkLabel: "adapts",
      beats: [
        beat("Envelope in checkout", "Checkout builds a SOAP body. A REST bank cannot reuse this method.", "post(envelope)", "The caller knows the bank's wire format."),
        beat("Call the port", "Checkout only calls charge(amount) on PaymentPort.", "charge(amount)", "The wire format is no longer checkout's job."),
        beat("SOAP adapter", "SoapBankAdapter wraps the amount in an envelope and posts it.", "post(envelope)", "One class speaks SOAP.", { id: "soap", lines: ["charge() → envelope"] }),
        beat("REST bank", "RestBankAdapter posts JSON. Checkout still calls charge().", "charge(amount)", "A second bank, same port.", { id: "port", lines: ["impl: RestBank"] }),
      ],
      snippet: `interface PaymentPort { charge(amount: number): string }

class SoapBankAdapter implements PaymentPort {
  charge(amount: number) {
    return this.client.post(envelope(amount))
  }
}`,
    }),
    fan({
      id: "slack-bridge",
      label: "Slack Log Bridge",
      shortLabel: "Slack",
      domain: "DevOps",
      prompt: "Services call log(level, message). Slack wants chat.postMessage. Keep that out of the services.",
      participants: roles(
        "BillingService calls log() and never imports Slack.",
        "Logger is the interface the service already uses.",
        "SlackAdapter and DatadogAdapter translate log().",
      ),
      client: actor("billing", "BillingService", "client", ["log()", "no Slack SDK"]),
      core: actor("logger", "Logger", "target", ["log(level, msg)"]),
      a: actor("slack", "SlackAdapter", "adapter", ["log()", "chat.post"]),
      b: actor("dog", "DatadogAdapter", "adapter", ["log()", "intake API"]),
      linkLabel: "adapts",
      beats: [
        beat("SDK in the service", "BillingService calls chat.postMessage. A vendor change edits the service.", "chat.postMessage()", "Logging is welded to Slack."),
        beat("Call Logger", "The service only calls log(error, message).", "log(error)", "Slack leaves the service."),
        beat("Slack adapter", "SlackAdapter turns the line into chat.postMessage.", "chat.postMessage()", "The SDK lives in the adapter.", { id: "slack", lines: ["log() → chat.post"] }),
        beat("Datadog instead", "DatadogAdapter implements Logger. BillingService does not change.", "log(error)", "A new sink, same call.", { id: "logger", lines: ["impl: Datadog"] }),
      ],
      snippet: `interface Logger { log(level: string, message: string): void }

class SlackAdapter implements Logger {
  log(level: string, message: string) {
    this.slack.chat.postMessage(level + ": " + message)
  }
}`,
    }),
  ];
}

export function bridgeScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "remote-control", label: "Remote Control", shortLabel: "Remote", domain: "IoT" }),
    fan({
      id: "renderer-bridge",
      label: "Renderer Bridge",
      shortLabel: "Renderer",
      domain: "Graphics",
      prompt: "A scene draws meshes. OpenGL and Metal must both work, without a subclass per mesh per API.",
      participants: roles(
        "Scene calls draw() and does not name OpenGL or Metal.",
        "Renderer is the implementor. Mesh holds a Renderer.",
        "GlRenderer and MetalRenderer are the two APIs.",
      ),
      client: actor("scene", "Scene", "client", ["draw()", "no GL calls"]),
      core: actor("mesh", "Mesh", "abstraction", ["draw()", "renderer: ?"]),
      a: actor("gl", "GlRenderer", "concrete", ["drawMesh()"]),
      b: actor("metal", "MetalRenderer", "concrete", ["drawMesh()"]),
      linkLabel: "implements",
      beats: [
        beat("API in the mesh", "Mesh calls glDrawArrays. A Metal build cannot reuse this class.", "glDrawArrays()", "Features and APIs are one hierarchy."),
        beat("Mesh holds a renderer", "Scene calls mesh.draw(). The mesh forwards to its Renderer.", "draw()", "The scene never names an API."),
        beat("OpenGL path", "GlRenderer.drawMesh() is the only OpenGL in the program.", "drawMesh()", "One implementor, many meshes.", { id: "mesh", lines: ["draw()", "renderer: GL"] }),
        beat("Metal path", "MetalRenderer swaps in. Mesh.draw() is untouched.", "draw()", "A new API, not a new Mesh subclass.", { id: "mesh", lines: ["draw()", "renderer: Metal"] }),
      ],
      snippet: `interface Renderer { drawMesh(): void }

class Mesh {
  constructor(private gpu: Renderer) {}
  draw() { this.gpu.drawMesh() }
}

new Mesh(new MetalRenderer()).draw()`,
    }),
    fan({
      id: "notify-bridge",
      label: "Notify Dispatcher",
      shortLabel: "Notify",
      domain: "Backend",
      prompt: "Urgent and standard messages both go out by SMS or email. Do not multiply classes for each pair.",
      participants: roles(
        "Alerts calls send() and does not pick a gateway.",
        "Message holds a Channel. UrgentMessage and StandardMessage are the refinements.",
        "SmsChannel and EmailChannel are the implementors.",
      ),
      client: actor("alerts", "Alerts", "client", ["send()", "no gateway"]),
      core: actor("message", "Message", "abstraction", ["send()", "channel: ?"]),
      a: actor("sms", "SmsChannel", "concrete", ["deliver()"]),
      b: actor("email", "EmailChannel", "concrete", ["deliver()"]),
      linkLabel: "implements",
      beats: [
        beat("One class per pair", "UrgentSms and StandardEmail are separate classes. A new channel doubles the set.", "new UrgentSms()", "Priority and transport are welded together."),
        beat("Message holds a channel", "Alerts calls send(). The message forwards to its Channel.", "send()", "Priority stays on the message."),
        beat("SMS delivery", "SmsChannel.deliver() is the only SMS code.", "deliver()", "Urgent and standard can both use it.", { id: "message", lines: ["send()", "channel: SMS"] }),
        beat("Email instead", "EmailChannel replaces SMS. UrgentMessage.send() does not change.", "send()", "A new transport, not a new priority class.", { id: "message", lines: ["send()", "channel: email"] }),
      ],
      snippet: `interface Channel { deliver(body: string): void }

class Message {
  constructor(private channel: Channel) {}
  send(body: string) { this.channel.deliver(body) }
}`,
    }),
  ];
}

export function compositeScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "file-system", label: "File System", shortLabel: "Files", domain: "Storage" }),
    fan({
      id: "payroll-tree",
      label: "Payroll Tree",
      shortLabel: "Payroll",
      domain: "Enterprise",
      prompt: "A department's payroll is the sum of its teams and people. The report should call cost() once.",
      participants: roles(
        "Payroll calls cost() and does not walk types.",
        "OrgUnit is both a department and the common interface.",
        "Employee is a leaf. Engineering is a department of leaves.",
      ),
      client: actor("payroll", "Payroll", "client", ["cost()", "no type checks"]),
      core: actor("eng", "Engineering", "composite", ["children: 2", "cost()"]),
      a: actor("ada", "Ada", "leaf", ["salary: 90"]),
      b: actor("ben", "Ben", "leaf", ["salary: 80"]),
      showAll: true,
      linkLabel: "contains",
      dashed: false,
      beats: [
        beat("A loop per type", "Payroll sums employees, then special-cases departments.", "if (isDept)", "Every new node kind edits the report."),
        beat("Ask the root", "Payroll calls Engineering.cost() and stops.", "cost()", "The tree walks itself."),
        beat("Ada adds salary", "A leaf returns its salary. No children.", "salary()", "Leaf and composite share cost().", { id: "ada", lines: ["salary: 90"] }),
        beat("Department sums", "Engineering adds Ada and Ben. Payroll still made one call.", "cost()", "Nesting does not change the client.", { id: "eng", lines: ["children: 2", "cost: 170"] }),
      ],
      snippet: `interface OrgUnit { cost(): number }

class Department implements OrgUnit {
  constructor(private team: OrgUnit[]) {}
  cost() { return this.team.reduce((sum, unit) => sum + unit.cost(), 0) }
}`,
    }),
    fan({
      id: "ui-tree",
      label: "UI Component Tree",
      shortLabel: "UI Tree",
      domain: "Frontend",
      prompt: "A panel contains buttons and nested panels. Layout should call measure() once on the root.",
      participants: roles(
        "Renderer calls measure() and does not switch on element type.",
        "Panel is a composite of nodes.",
        "Button and Text are leaves.",
      ),
      client: actor("view", "Renderer", "client", ["measure()", "no type switch"]),
      core: actor("panel", "Panel", "composite", ["children: 2", "measure()"]),
      a: actor("button", "Button", "leaf", ["w: 80"]),
      b: actor("text", "Text", "leaf", ["w: 40"]),
      showAll: true,
      linkLabel: "contains",
      dashed: false,
      beats: [
        beat("Switch on the node", "The renderer checks button versus panel before measuring.", "if (isPanel)", "A new element edits the renderer."),
        beat("Measure the root", "The renderer calls Panel.measure() only.", "measure()", "Children are the panel's problem."),
        beat("Button reports width", "A leaf returns its own width.", "width()", "Leaves have no children.", { id: "button", lines: ["w: 80"] }),
        beat("Panel sums children", "Panel adds Button and Text. The renderer still made one call.", "measure()", "A nested panel would answer the same way.", { id: "panel", lines: ["children: 2", "w: 120"] }),
      ],
      snippet: `interface Node { measure(): number }

class Panel implements Node {
  constructor(private children: Node[]) {}
  measure() { return this.children.reduce((w, node) => w + node.measure(), 0) }
}`,
    }),
  ];
}

export function decoratorScenarios(pattern: Pattern): Scenario[] {
  return [
    fan({
      id: "coffee-addons",
      label: "Coffee Add-ons",
      shortLabel: "Coffee",
      domain: "Classic",
      prompt: "Espresso can take milk, mocha, or both. Do not create a class for each combination.",
      participants: roles(
        "Cashier calls cost() and does not know the stack.",
        "Beverage is the component. Add-ons wrap it.",
        "Milk and Mocha each add a price and forward.",
      ),
      client: actor("till", "Cashier", "client", ["cost()", "no combo class"]),
      core: actor("milk", "Milk", "decorator", ["wraps next", "+0.40"]),
      a: actor("cup", "Espresso", "component", ["cost: 2.00"]),
      b: actor("mocha", "Mocha", "decorator", ["wraps next", "+0.60"]),
      showAll: true,
      linkLabel: "wraps",
      beats: [
        beat("A class per combo", "MilkMochaEspresso is its own class. The next topping doubles the set.", "new MilkMocha()", "Combinations explode."),
        beat("Wrap the cup", "The cashier holds a Beverage. Milk wraps Espresso.", "cost()", "The cashier still sees Beverage."),
        beat("Espresso base", "Espresso.cost() returns 2.00. It knows nothing about toppings.", "cost()", "The base stays small.", { id: "cup", lines: ["cost: 2.00"] }),
        beat("Stack mocha", "Mocha wraps Milk. cost() adds 0.60 then forwards. No new combo class.", "cost()", "Order is the wrap order.", { id: "milk", lines: ["wraps espresso", "cost: 2.40"] }),
      ],
      snippet: `interface Beverage { cost(): number }

class Milk implements Beverage {
  constructor(private next: Beverage) {}
  cost() { return 0.4 + this.next.cost() }
}`,
    }),
    fan({
      id: "http-middleware",
      label: "HTTP Middleware",
      shortLabel: "HTTP",
      domain: "Backend",
      prompt: "A handler should stay small. Auth, logging, and a rate limit wrap it in a chosen order.",
      participants: roles(
        "Server calls handle() on the outer wrapper.",
        "Handler is the component. Middleware wraps it.",
        "Auth and RateLimit each run, then forward.",
      ),
      client: actor("server", "Server", "client", ["handle()", "no pipeline copy"]),
      core: actor("auth", "Auth", "decorator", ["wraps next", "401?"]),
      a: actor("route", "Route", "component", ["handle()", "200"]),
      b: actor("limit", "RateLimit", "decorator", ["wraps next", "429?"]),
      showAll: true,
      linkLabel: "wraps",
      beats: [
        beat("Checks inside the route", "The route checks the token and the rate limit itself.", "if (!token)", "Every route copies the same checks."),
        beat("Wrap the route", "The server calls the outer handler. Auth wraps Route.", "handle()", "The route still only returns 200."),
        beat("Auth runs first", "Auth rejects a missing token before the route runs.", "handle()", "A 401 never reaches Route.", { id: "auth", lines: ["rejected", "401"] }),
        beat("Add a limiter", "RateLimit wraps Auth. The route method does not change.", "handle()", "A new concern is a new wrapper.", { id: "limit", lines: ["wraps auth", "budget: 100"] }),
      ],
      snippet: `interface Handler { handle(req: Request): Response }

class Auth implements Handler {
  constructor(private next: Handler) {}
  handle(req: Request) {
    if (!req.token) return new Response(401)
    return this.next.handle(req)
  }
}`,
    }),
    classicScenario(pattern, { id: "text-stream", label: "Text Stream", shortLabel: "Stream", domain: "Pipeline" }),
  ];
}

export function facadeScenarios(): Scenario[] {
  const home = fan({
    id: "home-theater",
    label: "Home Theater",
    shortLabel: "Theater",
    domain: "Hardware",
    prompt: "Watching a film means lights, a screen, and an amplifier. Guests keep turning them on in the wrong order.",
    participants: roles(
      "Guest calls watch() and never touches the devices.",
      "TheaterFacade orders the devices.",
      "Lights, Screen, and Amp are the subsystems.",
    ),
    client: actor("guest", "Guest", "client", ["watch()", "no device imports"]),
    core: actor("facade", "TheaterFacade", "facade", ["watch()", "order fixed"]),
    a: actor("lights", "Lights", "subsystem", ["dim()"]),
    b: actor("screen", "Screen", "subsystem", ["down()"]),
    c: actor("amp", "Amp", "subsystem", ["on()"]),
    showAll: true,
    linkLabel: "calls",
    dashed: false,
    beats: [
      beat("Devices one by one", "The guest dims lights, drops the screen, then forgets the amp.", "lights.dim()", "Every caller reinvents the order."),
      beat("One watch()", "The guest calls TheaterFacade.watch().", "watch()", "The order lives in one method."),
      beat("Lights then screen", "The facade dims the lights and lowers the screen.", "dim()", "Subsystems stay unaware of each other.", { id: "lights", lines: ["dimmed"] }),
      { ...beat("Amp last", "The facade powers the amp. The guest made one call.", "on()", "A new device edits the facade, not the guest.", { id: "amp", lines: ["on", "source: film"] }), from: "facade", to: "amp", kind: "call" },
    ],
    snippet: `class TheaterFacade {
  watch() {
    this.lights.dim()
    this.screen.down()
    this.amp.on()
  }
}`,
  });
  const cloud = fan({
    id: "cloud-deploy",
    label: "Cloud Deploy",
    shortLabel: "Deploy",
    domain: "DevOps",
    prompt: "A service needs a VPC, a VM, and DNS. Teams keep wiring those calls in different orders.",
    participants: roles(
      "Release calls deploy() and never imports the cloud SDK.",
      "DeployFacade orders VPC, compute, and DNS.",
      "Vpc, Instance, and Dns are the subsystems.",
    ),
    client: actor("release", "Release", "client", ["deploy()", "no SDK imports"]),
    core: actor("facade", "DeployFacade", "facade", ["deploy()", "order fixed"]),
    a: actor("vpc", "Vpc", "subsystem", ["create()"]),
    b: actor("vm", "Instance", "subsystem", ["run()"]),
    c: actor("dns", "Dns", "subsystem", ["point()"]),
    showAll: true,
    linkLabel: "calls",
    dashed: false,
    beats: [
      beat("SDK in the pipeline", "The pipeline creates a VM before the network exists.", "runInstances()", "Each repo invents an order."),
      beat("One deploy()", "Release calls DeployFacade.deploy().", "deploy()", "The cloud SDK stays inside the facade."),
      beat("Network first", "The facade creates the VPC, then the instance.", "create()", "The instance has a subnet.", { id: "vpc", lines: ["created"] }),
      { ...beat("DNS last", "The facade points the name at the instance. Release made one call.", "point()", "A new cloud edits the facade only.", { id: "dns", lines: ["api.example", "pointed"] }), from: "facade", to: "dns", kind: "call" },
    ],
    snippet: `class DeployFacade {
  deploy() {
    const net = this.vpc.create()
    const vm = this.instance.run(net)
    this.dns.point("api.example", vm)
  }
}`,
  });
  const video = fan({
    id: "video-convert",
    label: "Video Converter",
    shortLabel: "Video",
    domain: "Media",
    prompt: "Converting a clip means decode, resize, and encode. Callers keep skipping the resize.",
    participants: roles(
      "Uploader calls convert() and does not import codecs.",
      "ConverterFacade orders the pipeline.",
      "Decoder, Scaler, and Encoder are the subsystems.",
    ),
    client: actor("upload", "Uploader", "client", ["convert()", "no codecs"]),
    core: actor("facade", "ConverterFacade", "facade", ["convert()", "order fixed"]),
    a: actor("decode", "Decoder", "subsystem", ["read()"]),
    b: actor("scale", "Scaler", "subsystem", ["resize()"]),
    c: actor("encode", "Encoder", "subsystem", ["write()"]),
    showAll: true,
    linkLabel: "calls",
    dashed: false,
    beats: [
      beat("Codecs in the uploader", "The uploader calls the encoder and forgets to scale.", "encode()", "Every caller can skip a step."),
      beat("One convert()", "Uploader calls ConverterFacade.convert().", "convert()", "The pipeline order is fixed."),
      beat("Decode then scale", "The facade decodes the file, then resizes the frames.", "resize()", "The scaler never sees the uploader.", { id: "scale", lines: ["720p"] }),
      { ...beat("Encode last", "The facade writes the output. The uploader made one call.", "write()", "A new codec edits the facade only.", { id: "encode", lines: ["mp4", "written"] }), from: "facade", to: "encode", kind: "call" },
    ],
    snippet: `class ConverterFacade {
  convert(file: string) {
    const frames = this.decoder.read(file)
    const sized = this.scaler.resize(frames, 720)
    return this.encoder.write(sized)
  }
}`,
  });
  return [home, cloud, video];
}

export function flyweightScenarios(): Scenario[] {
  return [
    fan({
      id: "forest",
      label: "Forest Renderer",
      shortLabel: "Forest",
      domain: "Gaming",
      prompt: "A forest has thousands of oaks. The mesh must be shared. Only the position differs.",
      participants: roles(
        "Forest draws trees and must not copy the oak mesh per tree.",
        "Tree holds x, y and a shared TreeType.",
        "Oak is the flyweight: mesh and texture.",
      ),
      client: actor("forest", "Forest", "client", ["trees: 10000", "meshes: ?"]),
      core: actor("tree", "Tree", "context", ["x: 12", "type: ?"]),
      a: actor("oak", "Oak", "flyweight", ["mesh: 4mb", "shared: no"]),
      b: actor("pine", "Pine", "flyweight", ["mesh: 3mb", "shared: no"]),
      linkLabel: "shares",
      dashed: false,
      beats: [
        beat("A mesh per tree", "Each tree stores its own oak mesh. Memory climbs with the tree count.", "new Mesh()", "Ten thousand trees, ten thousand copies."),
        beat("Tree keeps position", "The forest asks a tree to draw. The tree holds only x and y.", "draw(x, y)", "Extrinsic state stays on the tree."),
        beat("Share the oak", "Every oak tree points at one Oak flyweight.", "draw()", "The mesh is loaded once.", { id: "oak", lines: ["mesh: 4mb", "shared: yes"] }),
        beat("Pine is another type", "Pines share one Pine. The forest does not grow a mesh per tree.", "draw()", "Species are few. Trees are many.", { id: "tree", lines: ["x: 40", "type: Pine"] }),
      ],
      snippet: `class TreeType {
  constructor(private mesh: Mesh) {}
  draw(x: number, y: number) { this.mesh.blit(x, y) }
}

const oak = new TreeType(oakMesh)
oak.draw(12, 4)`,
    }),
    fan({
      id: "glyphs",
      label: "Glyph Cache",
      shortLabel: "Glyphs",
      domain: "Desktop",
      prompt: "A document has thousands of letters. The glyph for 'a' must be shared. Only the position changes.",
      participants: roles(
        "Editor lays out a run of characters.",
        "Character holds the index and a shared Glyph.",
        "GlyphA is the cached outline.",
      ),
      client: actor("editor", "Editor", "client", ["chars: 8000", "outlines: ?"]),
      core: actor("char", "Character", "context", ["index: 3", "glyph: ?"]),
      a: actor("glyph", "GlyphA", "flyweight", ["outline: 2kb", "shared: no"]),
      b: actor("glyphb", "GlyphB", "flyweight", ["outline: 2kb", "shared: no"]),
      linkLabel: "shares",
      dashed: false,
      beats: [
        beat("An outline per letter", "Each 'a' owns a copy of the outline.", "new Glyph('a')", "A long document duplicates the same letter."),
        beat("Character keeps the index", "The editor stores a position. The outline is not on the character.", "draw(index)", "Position is extrinsic."),
        beat("Share glyph A", "Every 'a' points at one GlyphA.", "draw()", "The outline is loaded once.", { id: "glyph", lines: ["outline: 2kb", "shared: yes"] }),
        beat("B is another glyph", "The letter b shares GlyphB. The editor does not copy outlines.", "draw()", "The alphabet is small. The document is not.", { id: "char", lines: ["index: 9", "glyph: B"] }),
      ],
      snippet: `class Glyph {
  constructor(private outline: Outline) {}
  draw(x: number) { this.outline.blit(x) }
}

cache.get("a").draw(12)`,
    }),
    fan({
      id: "tickers",
      label: "Ticker Symbols",
      shortLabel: "Tickers",
      domain: "Fintech",
      prompt: "A tape prints AAPL thousands of times a second. The company name and logo must be shared.",
      participants: roles(
        "Tape renders quotes and must not copy static metadata per tick.",
        "Quote holds the price and a shared Symbol.",
        "Aapl is the flyweight: name and logo.",
      ),
      client: actor("tape", "Tape", "client", ["ticks: 50000", "logos: ?"]),
      core: actor("quote", "Quote", "context", ["price: 190", "symbol: ?"]),
      a: actor("aapl", "Aapl", "flyweight", ["logo: 8kb", "shared: no"]),
      b: actor("msft", "Msft", "flyweight", ["logo: 8kb", "shared: no"]),
      linkLabel: "shares",
      dashed: false,
      beats: [
        beat("Metadata per tick", "Each quote copies the company name and logo.", "new Symbol()", "The tape stores the same logo all day."),
        beat("Quote keeps the price", "The tape stores a price. The name is not on the quote.", "print(price)", "Price is extrinsic. The name is not."),
        beat("Share AAPL", "Every AAPL quote points at one Aapl flyweight.", "print()", "The logo is loaded once.", { id: "aapl", lines: ["logo: 8kb", "shared: yes"] }),
        beat("MSFT is another symbol", "Microsoft quotes share one Msft. The tape stays small.", "print()", "Symbols are few. Ticks are not.", { id: "quote", lines: ["price: 420", "symbol: MSFT"] }),
      ],
      snippet: `class Symbol {
  constructor(readonly name: string, private logo: Logo) {}
  print(price: number) { this.logo.blit(this.name, price) }
}

symbols.get("AAPL").print(190)`,
    }),
  ];
}

export function proxyScenarios(pattern: Pattern): Scenario[] {
  return [
    classicScenario(pattern, { id: "image-loader", label: "Image Loader", shortLabel: "Image", domain: "Frontend" }),
    fan({
      id: "cache-proxy",
      label: "Cache Proxy",
      shortLabel: "Cache",
      domain: "Cloud",
      prompt: "Product pages keep asking the catalog service for the same SKU. Cache that, without teaching the page.",
      participants: roles(
        "ProductPage calls get(sku) and does not know about the cache.",
        "Catalog is the subject. CacheProxy implements it.",
        "CatalogService is the expensive real object.",
      ),
      client: actor("page", "ProductPage", "client", ["get(sku)", "no cache code"]),
      core: actor("proxy", "CacheProxy", "proxy", ["hit: no", "ttl: 30s"]),
      a: actor("api", "CatalogService", "subject", ["get(sku)", "db query"]),
      b: actor("redis", "Cache", "resource", ["key: —", "empty"]),
      linkLabel: "guards",
      beats: [
        beat("A query per view", "The page calls the catalog on every render. The database repeats itself.", "get(sku)", "Callers cannot be trusted to cache."),
        beat("Page calls the proxy", "ProductPage still calls get(sku). The object is a CacheProxy.", "get(sku)", "The page depends on Catalog, not on Redis."),
        beat("Miss loads the service", "The proxy calls CatalogService, then stores the body.", "get(sku)", "The real service runs once.", { id: "proxy", lines: ["hit: miss", "stored sku"] }),
        beat("Hit skips the service", "The next get returns the cached body. The page code is the same.", "get(sku)", "A new page does not add a new cache.", { id: "proxy", lines: ["hit: yes", "ttl: 30s"] }),
      ],
      snippet: `interface Catalog { get(sku: string): Product }

class CacheProxy implements Catalog {
  get(sku: string) {
    return this.cache.get(sku) ?? this.store(this.real.get(sku))
  }
}`,
    }),
    fan({
      id: "access-proxy",
      label: "Access Firewall",
      shortLabel: "Firewall",
      domain: "Security",
      prompt: "Admin reports must refuse a guest. The report service should not grow a permission check in every method.",
      participants: roles(
        "Viewer calls read() and does not enforce the role.",
        "Report is the subject. GuardProxy implements it.",
        "RealReport holds the bytes. The proxy checks the role first.",
      ),
      client: actor("viewer", "Viewer", "client", ["role: guest", "read()"]),
      core: actor("guard", "GuardProxy", "proxy", ["role check", "loaded: no"]),
      a: actor("report", "RealReport", "subject", ["bytes: secret"]),
      b: actor("audit", "AuditLog", "resource", ["denied: 0"]),
      linkLabel: "guards",
      beats: [
        beat("Check in the caller", "Every screen tests the role, and one of them forgets.", "if (guest)", "The rule is copied, and it drifts."),
        beat("Viewer calls read", "The viewer calls read() on the Report interface.", "read()", "It might be talking to the proxy."),
        beat("Guest is refused", "GuardProxy rejects the guest and writes an audit line.", "deny()", "RealReport never runs.", { id: "guard", lines: ["denied guest", "loaded: no"] }),
        beat("Editor is allowed", "The same proxy forwards an editor. The report method is unchanged.", "read()", "A new rule edits the proxy only.", { id: "report", lines: ["bytes: opened"] }),
      ],
      snippet: `interface Report { read(): string }

class GuardProxy implements Report {
  read() {
    if (this.role === "guest") throw new Error("denied")
    return this.real.read()
  }
}`,
    }),
  ];
}
