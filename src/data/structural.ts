import type { Pattern } from "./types";

export const structural: Pattern[] = [
  {
    id: "adapter",
    frequency: "high",
    name: "Adapter",
    aka: "Wrapper",
    category: "structural",
    tagline: "Make an incompatible interface look like the one you need.",
    intent: "Convert one object's interface into the interface a client already expects, so they can collaborate without either one changing.",
    problem:
      "Checkout speaks `charge(money)`. The Stripe SDK speaks `createCharge({ cents, currency })`. Editing Checkout for every vendor, or editing the SDK you do not own, both lose.",
    solution:
      "An adapter implements the gateway interface Checkout wants and translates each call into Stripe's shape. Razorpay is a second adapter. Checkout never notices. Adapter is retrofitted compatibility; Bridge is a split you design up front.",
    participants: [
      { role: "Target", does: "The interface the client already codes against." },
      { role: "Adapter", does: "Implements Target and holds the incompatible object." },
      { role: "Adaptee", does: "The existing class with the wrong interface." },
    ],
    useWhen: [
      "You must use an existing class whose interface does not match.",
      "You cannot, or should not, change the client or the vendor SDK.",
      "You want vendor swap without a rewrite of business logic.",
    ],
    checks: [
      "Client types mention only the target interface.",
      "Translation (dollars ↔ cents, errors ↔ your error type) lives in the adapter.",
      "A second vendor is a second adapter.",
    ],
    pros: ["Isolates third-party churn.", "Single responsibility: translation is not business logic."],
    cons: ["Another type in the path.", "A leaky abstraction if the target cannot express the vendor."],
    avoid: "Do not wrap a class you can change. Just change it.",
    related: ["bridge", "facade", "decorator"],
    prompt: "Checkout must charge cards. Today it is Stripe. Next quarter it might be Razorpay. Design so Checkout does not change.",
    objects: [
      { id: "checkout", name: "Checkout", stereotype: "client", x: 16, y: 48, lines: ["calls: Gateway", "vendor: unknown"] },
      { id: "gateway", name: "Gateway", stereotype: "target", x: 46, y: 30, lines: ["charge(money)", "refund(id)"] },
      { id: "adapter", name: "StripeAdapter", stereotype: "adapter", x: 46, y: 74, lines: ["implements Gateway", "holds: StripeSDK"] },
      { id: "stripe", name: "StripeSDK", stereotype: "adaptee", x: 82, y: 48, lines: ["createCharge()", "cents, currency"] },
    ],
    links: [
      { from: "checkout", to: "gateway", label: "depends" },
      { from: "adapter", to: "gateway", label: "implements", dashed: true },
      { from: "adapter", to: "stripe", label: "translates" },
    ],
    steps: [
      {
        title: "Client speaks SDK",
        blurb: "Checkout calls Stripe by name and passes cents. Swapping vendors means editing the payment flow.",
        call: "createCharge({cents})",
        note: "Vendor types leaked into Checkout.",
        kind: "problem",
        from: "checkout",
        to: "stripe",
      },
      {
        title: "Target interface",
        blurb: "Checkout is rewritten once, against Gateway.charge(money). It is done changing.",
        call: "charge(money)",
        note: "Target is the interface you wish the SDK had.",
        kind: "call",
        from: "checkout",
        to: "gateway",
      },
      {
        title: "Adapter in the middle",
        blurb: "At runtime the Gateway reference is a StripeAdapter. Checkout cannot tell.",
        call: "charge($42.00)",
        note: "Object adapter: composition, not a subclass of the SDK.",
        kind: "call",
        from: "checkout",
        to: "adapter",
        reveal: ["adapter"],
      },
      {
        title: "Translate the call",
        blurb: "The adapter converts dollars to cents, maps your idempotency key, and calls the SDK.",
        call: "createCharge({cents:4200})",
        note: "All impedance mismatch lives here.",
        kind: "call",
        from: "adapter",
        to: "stripe",
      },
      {
        title: "Normalize the return",
        blurb: "Stripe's charge id comes back as your Receipt. A RazorpayAdapter would return the same type.",
        call: "return Receipt",
        note: "Client stays on the target interface.",
        kind: "return",
        from: "adapter",
        to: "checkout",
        updates: [{ id: "checkout", lines: ["calls: Gateway", "vendor: stripe via adapter"] }],
      },
    ],
    snippet: `interface Gateway {
  charge(money: Money): Receipt
}

class StripeAdapter implements Gateway {
  constructor(private stripe: StripeSDK) {}
  charge(money: Money): Receipt {
    const raw = this.stripe.createCharge({
      cents: money.cents,
      currency: money.currency,
    })
    return { id: raw.chargeId, status: "paid" }
  }
}`,
  },
  {
    id: "bridge",
    name: "Bridge",
    aka: "Handle & body",
    category: "structural",
    tagline: "Split abstraction from implementation so they vary independently.",
    intent:
      "Decouple an abstraction from its implementation so the two hierarchies can grow without a class for every combination.",
    problem:
      "Basic and advanced remotes, each for TV and for radio, want four classes now and a new one for every future pair. The cartesian product is the design.",
    solution:
      "Put variation of the remote (abstraction) in one hierarchy and variation of the device (implementation) in another. Remote holds a Device and forwards volumeUp to setVolume. AdvancedRemote.mute reuses the same Device. A projector is a new Device, not four new remotes. You choose this split up front; Adapter patches a mismatch after the fact.",
    participants: [
      { role: "Abstraction", does: "The high-level control surface. Holds a reference to the implementor." },
      { role: "Refined abstraction", does: "Extends the control surface (mute, presets) without touching devices." },
      { role: "Implementor", does: "The low-level interface devices actually fulfill." },
    ],
    useWhen: [
      "Two dimensions vary, and a class per pair would explode.",
      "You want to switch the implementation at runtime.",
      "Abstraction and implementation should be tested and shipped separately.",
    ],
    checks: [
      "Abstraction has no subclass named after an implementor.",
      "New device: one class. New remote feature: one class. Not both.",
      "The link between them is composition.",
    ],
    pros: ["Kills the N×M class grid.", "Runtime swap of the implementor."],
    cons: ["More types on day one, before the explosion hurts.", "Indirection when a simple class would do."],
    avoid: "If only one dimension varies, you do not need a bridge.",
    related: ["adapter", "strategy", "abstract-factory"],
    prompt: "Design remotes for TVs and speakers. Basic and advanced remotes must both work with every device, including ones you have not shipped.",
    objects: [
      { id: "basic", name: "Remote", stereotype: "abstraction", x: 16, y: 28, lines: ["volumeUp()", "device: Device"] },
      { id: "advanced", name: "Advanced", stereotype: "refined", x: 16, y: 74, lines: ["mute()", "extends Remote"] },
      { id: "device", name: "Device", stereotype: "implementor", x: 50, y: 48, lines: ["setVolume(n)", "getVolume()"] },
      { id: "tv", name: "Tv", stereotype: "concrete", x: 82, y: 28, lines: ["volume: 10"] },
      { id: "radio", name: "Radio", stereotype: "concrete", x: 82, y: 74, lines: ["volume: 4"] },
    ],
    links: [
      { from: "basic", to: "device", label: "holds" },
      { from: "advanced", to: "device", label: "holds" },
      { from: "tv", to: "device", label: "implements", dashed: true },
      { from: "radio", to: "device", label: "implements", dashed: true },
    ],
    steps: [
      {
        title: "Class per pair",
        blurb: "TVRemote.volumeUp talks to a TV directly. RadioAdvancedRemote is a near-copy. A projector means four more types.",
        call: "TVRemote.volumeUp()",
        note: "Abstraction and implementation are welded in the class name.",
        kind: "problem",
        from: "basic",
        to: "tv",
      },
      {
        title: "Forward through Device",
        blurb: "Remote no longer knows Tv. It asks the Device interface to change volume.",
        call: "volumeUp()",
        note: "Composition: remote has-a device.",
        kind: "call",
        from: "basic",
        to: "device",
      },
      {
        title: "TV implements Device",
        blurb: "The TV side of the bridge applies +1. The remote code did not mention TV.",
        call: "setVolume(11)",
        note: "Implementor hierarchy, axis two.",
        kind: "call",
        from: "device",
        to: "tv",
        updates: [{ id: "tv", lines: ["volume: 11"] }],
      },
      {
        title: "Refine the abstraction",
        blurb: "AdvancedRemote adds mute without a TV or radio subclass. It reuses the device reference it inherited.",
        call: "mute()",
        note: "New remote feature = one class, every device.",
        kind: "call",
        from: "advanced",
        to: "device",
      },
      {
        title: "Other implementor",
        blurb: "The same mute lands on a radio because radio is just another Device. A projector slots in beside it later.",
        call: "setVolume(0)",
        note: "N + M classes, not N × M.",
        kind: "call",
        from: "device",
        to: "radio",
        updates: [{ id: "radio", lines: ["volume: 0"] }],
      },
    ],
    snippet: `interface Device {
  getVolume(): number
  setVolume(level: number): void
}

class Remote {
  constructor(protected device: Device) {}
  volumeUp() {
    this.device.setVolume(this.device.getVolume() + 1)
  }
}

class AdvancedRemote extends Remote {
  mute() { this.device.setVolume(0) }
}`,
  },
  {
    id: "composite",
    name: "Composite",
    aka: "Object tree",
    category: "structural",
    tagline: "Treat a single item and a group of items the same way.",
    intent:
      "Compose objects into a tree and let clients talk to leaves and branches through one interface.",
    problem:
      "A disk report special-cases files and folders. Every new operation (size, search, zip) grows another `if (isFolder)` and forgets a nested directory.",
    solution:
      "File and Folder both implement Node.size(). A folder's size is the sum of its children. The client calls root.size() and never asks what it is holding. The tree can nest arbitrarily.",
    participants: [
      { role: "Component", does: "Common interface for leaves and composites." },
      { role: "Leaf", does: "Does the real work. No children." },
      { role: "Composite", does: "Stores children and delegates, then combines results." },
    ],
    useWhen: [
      "You have a part-whole tree (files, UI, org chart, menu).",
      "Clients should ignore the difference between a node and a group.",
      "Nesting depth is not fixed.",
    ],
    checks: [
      "Client has no instanceof / isFolder branch.",
      "Composite implements the same interface as the leaf.",
      "A new operation is one method on the interface, implemented in both places — or a Visitor if operations churn.",
    ],
    pros: ["Open-ended nesting.", "Client code stays flat."],
    cons: ["Hard to restrict what may be a child.", "A wide interface if leaves and folders differ a lot."],
    avoid: "If folders and files share almost no operations, a common interface is a lie. Keep them separate.",
    related: ["decorator", "visitor", "iterator"],
    prompt: "Design a file system API where computing the size of a file or of any folder, however nested, is one call.",
    objects: [
      { id: "client", name: "Report", stereotype: "client", x: 16, y: 48, lines: ["calls: Node.size", "no type checks"] },
      { id: "folder", name: "Folder /docs", stereotype: "composite", x: 50, y: 46, lines: ["children: 2", "size: ?"] },
      { id: "a", name: "readme.md", stereotype: "leaf", x: 82, y: 28, lines: ["bytes: 12kb"] },
      { id: "b", name: "notes.txt", stereotype: "leaf", x: 82, y: 74, lines: ["bytes: 8kb"] },
    ],
    links: [
      { from: "client", to: "folder", label: "uses Node" },
      { from: "folder", to: "a", label: "child" },
      { from: "folder", to: "b", label: "child" },
    ],
    steps: [
      {
        title: "Special cases",
        blurb: "The report asks a file for its size, then has a second code path that walks folders. Nested folders need recursion the client should not own.",
        call: "if (isFolder) …",
        note: "Part vs whole is the client's problem.",
        kind: "problem",
        from: "client",
        to: "a",
      },
      {
        title: "One call on the root",
        blurb: "The client now holds a Node. It asks the folder for size and does not know there are children.",
        call: "size()",
        note: "Uniform interface.",
        kind: "call",
        from: "client",
        to: "folder",
      },
      {
        title: "Leaf answers",
        blurb: "A file returns its byte length. Leaves terminate the recursion.",
        call: "size() → 12kb",
        note: "Leaf does not forward.",
        kind: "call",
        from: "folder",
        to: "a",
      },
      {
        title: "Second leaf",
        blurb: "The folder asks every child. Adding a subfolder would just be another child whose size() is itself a sum.",
        call: "size() → 8kb",
        note: "Composite delegates, then combines.",
        kind: "call",
        from: "folder",
        to: "b",
      },
      {
        title: "Combined result",
        blurb: "The folder returns 20kb. The client still made one call. That scales to a tree of any depth.",
        call: "return 20kb",
        note: "Sum of children. Client stays type-blind.",
        kind: "return",
        from: "folder",
        to: "client",
        updates: [{ id: "folder", lines: ["children: 2", "size: 20kb"] }],
      },
    ],
    snippet: `interface Node { size(): number }

class FileNode implements Node {
  constructor(private bytes: number) {}
  size() { return this.bytes }
}

class Folder implements Node {
  constructor(private children: Node[]) {}
  size() {
    return this.children.reduce((n, c) => n + c.size(), 0)
  }
}`,
  },
  {
    id: "decorator",
    frequency: "high",
    name: "Decorator",
    aka: "Wrapper",
    category: "structural",
    tagline: "Add behavior by wrapping, not by subclassing.",
    intent:
      "Attach responsibilities to an object dynamically by placing it inside a wrapper that implements the same interface.",
    problem:
      "A file store needs encryption, compression, or both, in either order. Subclassing FileStore, EncryptedFileStore, CompressedEncryptedFileStore explodes, and you cannot change the mix at runtime.",
    solution:
      "DataSource is the shared interface. EncryptionDecorator and CompressionDecorator each hold a DataSource, do their extra work, then forward. Stack them: compress, then encrypt, then hit the file. Order is the order of wrapping. A decorator adds behavior; a proxy controls access. Same shape, different intent.",
    participants: [
      { role: "Component", does: "The interface both the core object and the wrappers share." },
      { role: "Concrete component", does: "The original object. Does not know it is wrapped." },
      { role: "Decorator", does: "Implements the interface, holds a component, adds work around the forward." },
    ],
    useWhen: [
      "You need mix-and-match behavior, including order.",
      "Subclassing every combination is unacceptable.",
      "The extra behavior should be invisible to the caller.",
    ],
    checks: [
      "Wrapper and wrapped share an interface.",
      "The core class has no encryption or compression code.",
      "Order of wrapping matches the required pipeline.",
    ],
    pros: ["Combine behaviors at runtime.", "Open/closed: new wrapper, no edits."],
    cons: ["Many small objects.", "Hard to tell a decorator apart from the object it wraps when debugging."],
    avoid: "If the combination is fixed forever, a single class is simpler.",
    related: ["proxy", "composite", "adapter"],
    prompt: "Design a file writer that can encrypt, compress, or both, in a chosen order, without a subclass per combination.",
    objects: [
      { id: "client", name: "Exporter", stereotype: "client", x: 14, y: 48, lines: ["sees: DataSource"] },
      { id: "enc", name: "Encrypt", stereotype: "decorator", x: 40, y: 48, lines: ["wraps next", "algo: aes"] },
      { id: "zip", name: "Compress", stereotype: "decorator", x: 64, y: 48, lines: ["wraps next", "algo: gzip"] },
      { id: "file", name: "FileStore", stereotype: "component", x: 86, y: 48, lines: ["write(bytes)", "disk"] },
    ],
    links: [
      { from: "client", to: "enc", label: "calls" },
      { from: "enc", to: "zip", label: "wraps" },
      { from: "zip", to: "file", label: "wraps" },
    ],
    steps: [
      {
        title: "One class, one behavior",
        blurb: "Exporter writes straight to disk. Encryption would mean editing FileStore or spawning a subclass lattice.",
        call: "write(raw)",
        note: "No extension point that is not a subclass.",
        kind: "problem",
        from: "client",
        to: "file",
      },
      {
        title: "Wrap with compression",
        blurb: "A decorator implements DataSource, compresses, then forwards. FileStore stays dumb.",
        call: "write(raw)",
        note: "Same interface as the thing it wraps.",
        kind: "call",
        from: "client",
        to: "zip",
        reveal: ["zip"],
      },
      {
        title: "Forward inward",
        blurb: "Compress calls the next DataSource with gzip bytes. The next one happens to be the file.",
        call: "write(gzip)",
        note: "Decorator does not know it is the outer layer.",
        kind: "call",
        from: "zip",
        to: "file",
      },
      {
        title: "Stack encryption outside",
        blurb: "Encrypt wraps the compressor. The client is handed the outermost object and still types it as DataSource.",
        call: "write(raw)",
        note: "New behavior, zero edits to FileStore or Compress.",
        kind: "call",
        from: "client",
        to: "enc",
        reveal: ["enc"],
      },
      {
        title: "Pipeline order",
        blurb: "Encrypt runs first, then compress, then disk. Reverse the wrappers and you reverse the pipeline. That flexibility is what subclasses could not give you.",
        call: "write(gzip)",
        note: "Outer → inner. Encrypt then Compress then File.",
        kind: "call",
        from: "enc",
        to: "zip",
      },
    ],
    snippet: `interface DataSource { write(data: Uint8Array): void }

class Encrypt implements DataSource {
  constructor(private next: DataSource) {}
  write(data: Uint8Array) {
    this.next.write(aes(data))
  }
}

const store = new Encrypt(new Compress(new FileStore(path)))
store.write(raw)`,
  },
  {
    id: "facade",
    frequency: "high",
    name: "Facade",
    aka: "Front door",
    category: "structural",
    tagline: "One simple entry to a tangle of subsystems.",
    intent: "Offer a single, higher-level interface that makes a subsystem easier to use.",
    problem:
      "Placing an order means reserving stock, charging a card, and creating a shipment, in that order, with matching rollbacks. Every client reimplements the sequence and gets it slightly wrong.",
    solution:
      "OrderFacade.place() runs the sequence and returns one result. Clients stop orchestrating. The subsystems stay public for the rare caller who needs them — a facade simplifies, it does not imprison. It is not an adapter: nothing is being made to fit a foreign interface.",
    participants: [
      { role: "Facade", does: "Knows which subsystem calls to make, and in what order." },
      { role: "Subsystem classes", does: "Do the actual work. Do not know about the facade." },
      { role: "Client", does: "Talks to the facade for the common case." },
    ],
    useWhen: [
      "A common workflow is a fragile sequence of many calls.",
      "You want to decouple clients from subsystem churn.",
      "You are drawing a boundary around a module.",
    ],
    checks: [
      "The happy path is one method on the facade.",
      "Subsystem classes do not depend on the facade.",
      "Rollback or compensation has a home, and it is not the client.",
    ],
    pros: ["Clients get the simple path.", "Subsystem refactors move less far."],
    cons: ["A god facade if every operation gets shoved into it.", "Can hide too much when debugging."],
    avoid: "Do not hide a single class behind a facade. There is nothing to simplify.",
    related: ["adapter", "mediator", "singleton"],
    prompt: "Design order placement. Stock, payment, and shipping already exist. Clients keep wiring them in the wrong order.",
    objects: [
      { id: "client", name: "Api", stereotype: "client", x: 16, y: 48, lines: ["place(order)", "no subsystem imports"] },
      { id: "facade", name: "OrderFacade", stereotype: "facade", x: 48, y: 48, lines: ["place()", "compensates"] },
      { id: "stock", name: "Stock", stereotype: "subsystem", x: 82, y: 20, lines: ["reserve(sku)"] },
      { id: "pay", name: "Payments", stereotype: "subsystem", x: 82, y: 48, lines: ["charge(money)"] },
      { id: "ship", name: "Shipping", stereotype: "subsystem", x: 82, y: 76, lines: ["dispatch(id)"] },
    ],
    links: [
      { from: "client", to: "facade", label: "uses" },
      { from: "facade", to: "stock", label: "orchestrates" },
      { from: "facade", to: "pay", label: "orchestrates" },
      { from: "facade", to: "ship", label: "orchestrates" },
    ],
    steps: [
      {
        title: "Client orchestrates",
        blurb: "The API handler charges the card first, then finds the warehouse is empty. Every caller has its own order of operations.",
        call: "charge()",
        note: "Workflow knowledge is copy-pasted.",
        kind: "problem",
        from: "client",
        to: "pay",
      },
      {
        title: "Then stock, maybe",
        blurb: "A second call, easy to forget, easy to reorder. Rollback is an afterthought in each client.",
        call: "reserve()",
        note: "Subsystem details leak outward.",
        kind: "problem",
        from: "client",
        to: "stock",
      },
      {
        title: "One front door",
        blurb: "The handler calls place() and stops importing Payments. The facade owns the recipe: reserve, then charge, then dispatch.",
        call: "place(order)",
        note: "Coarse interface over a fine subsystem.",
        kind: "call",
        from: "client",
        to: "facade",
        reveal: ["facade"],
      },
      {
        title: "Facade charges",
        blurb: "Only after stock is reserved does the facade charge. On failure it releases the reservation — clients no longer invent compensation.",
        call: "charge(money)",
        note: "Order of calls is an invariant of the facade.",
        kind: "call",
        from: "facade",
        to: "pay",
      },
      {
        title: "Facade ships",
        blurb: "Dispatch is the last step. Subsystems still do not know about each other or about the facade.",
        call: "dispatch(id)",
        note: "Clients that need a rare stock API can still call Stock directly.",
        kind: "call",
        from: "facade",
        to: "ship",
      },
    ],
    snippet: `class OrderFacade {
  constructor(
    private stock: Stock,
    private pay: Payments,
    private ship: Shipping,
  ) {}

  place(order: Order): Receipt {
    const hold = this.stock.reserve(order.lines)
    try {
      const receipt = this.pay.charge(order.total)
      this.ship.dispatch(order.id)
      return receipt
    } catch (err) {
      this.stock.release(hold)
      throw err
    }
  }
}`,
  },
  {
    id: "flyweight",
    name: "Flyweight",
    aka: "Cache of shared state",
    category: "structural",
    tagline: "Share the heavy intrinsic state. Keep the rest outside.",
    intent:
      "Support a huge number of fine-grained objects by sharing the state that does not vary per instance.",
    problem:
      "A map draws 100,000 cafe pins. Each pin object stores a copy of the same 40KB icon, name style, and color. The heap is icons, not coordinates.",
    solution:
      "Split intrinsic state (the icon, shared and immutable) from extrinsic state (lat, lng, which the map passes in at draw time). An IconFactory caches one CafeIcon. Pins store a reference plus coordinates. Identity of the icon is shared; identity of the pin is not.",
    participants: [
      { role: "Flyweight", does: "Immutable shared state. Operations receive extrinsic context as arguments." },
      { role: "Factory", does: "Returns a cached flyweight for a given key." },
      { role: "Context", does: "The many small objects. Hold extrinsic state and a flyweight reference." },
    ],
    useWhen: [
      "You would allocate a very large number of similar objects.",
      "A big slice of their state is identical and immutable.",
      "You can pass the unique part in from outside.",
    ],
    checks: [
      "Intrinsic state is never mutated per pin.",
      "Extrinsic state is not stored inside the shared icon.",
      "The factory returns the same reference for the same key.",
    ],
    pros: ["Memory drops from O(objects × payload) toward O(types + objects).", "Shared state has one update path."],
    cons: ["You must be ruthless about what is truly shared.", "Calling draw(x, y) is less obvious than pin.draw()."],
    avoid: "Useless when there are dozens of objects, or when most fields differ.",
    related: ["composite", "singleton", "factory-method"],
    prompt: "Design map markers for 100,000 places across a handful of categories. Memory, not correctness, is the bug.",
    objects: [
      { id: "map", name: "Map", stereotype: "client", x: 16, y: 48, lines: ["pins: 100000", "icons: ?"] },
      { id: "a", name: "Pin A", stereotype: "context", x: 48, y: 26, lines: ["lat: 12.9", "icon: ?"] },
      { id: "b", name: "Pin B", stereotype: "context", x: 48, y: 74, lines: ["lat: 28.6", "icon: ?"] },
      { id: "icon", name: "CafeIcon", stereotype: "flyweight", x: 82, y: 48, lines: ["bytes: 40kb", "shared: no"] },
    ],
    links: [
      { from: "map", to: "a", label: "owns" },
      { from: "map", to: "b", label: "owns" },
      { from: "a", to: "icon", label: "ref" },
      { from: "b", to: "icon", label: "ref" },
    ],
    steps: [
      {
        title: "Icon copied per pin",
        blurb: "Each pin embeds the cafe artwork. 100,000 pins means 100,000 copies of the same bytes.",
        call: "new Pin(iconBytes)",
        note: "Intrinsic state stored extrinsically. Heap explodes.",
        kind: "problem",
        from: "map",
        to: "a",
        updates: [
          { id: "a", lines: ["lat: 12.9", "icon bytes: 40kb"] },
          { id: "icon", lines: ["bytes: 40kb", "copies: 100000"] },
        ],
      },
      {
        title: "Factory caches the icon",
        blurb: "IconFactory keys artwork by category. The first cafe request builds CafeIcon. Every later request returns it.",
        call: "iconFor('cafe')",
        note: "Flyweight factory. Same key, same reference.",
        kind: "create",
        from: "map",
        to: "icon",
        updates: [{ id: "icon", lines: ["bytes: 40kb", "shared: yes", "key: cafe"] }],
      },
      {
        title: "Pin stores the reference",
        blurb: "Pin A keeps coordinates (extrinsic) and a pointer to the shared icon (intrinsic). It does not own the bytes.",
        call: "draw(lat, lng)",
        note: "Context passes extrinsic state into the flyweight.",
        kind: "call",
        from: "a",
        to: "icon",
        updates: [{ id: "a", lines: ["lat: 12.9", "icon: CafeIcon"] }],
      },
      {
        title: "Second pin, same icon",
        blurb: "Pin B is a different object with different coordinates and the same CafeIcon reference.",
        call: "draw(lat, lng)",
        note: "a.icon === b.icon. Coordinates differ.",
        kind: "call",
        from: "b",
        to: "icon",
        reveal: ["b"],
        updates: [{ id: "b", lines: ["lat: 28.6", "icon: CafeIcon"] }],
      },
      {
        title: "Memory",
        blurb: "Icons scale with categories, not with pins. Mutating CafeIcon would mutate every cafe — so the flyweight stays immutable.",
        call: "1 icon, N pins",
        note: "Share what is invariant. Keep coordinates outside.",
        kind: "note",
        from: "map",
        to: "icon",
        updates: [{ id: "map", lines: ["pins: 100000", "icons: 1 cafe"] }],
      },
    ],
    snippet: `class CafeIcon {
  constructor(readonly bytes: Uint8Array) {}
  draw(ctx: Ctx, lat: number, lng: number) {
    ctx.blit(this.bytes, project(lat, lng))
  }
}

class IconFactory {
  private cache = new Map<string, CafeIcon>()
  cafe(): CafeIcon {
    const hit = this.cache.get("cafe")
    if (hit) return hit
    const made = new CafeIcon(load("cafe.png"))
    this.cache.set("cafe", made)
    return made
  }
}`,
  },
  {
    id: "proxy",
    name: "Proxy",
    aka: "Surrogate",
    category: "structural",
    tagline: "Stand in for an object to control access to it.",
    intent:
      "Provide a placeholder with the same interface that controls creation, access, or location of the real object.",
    problem:
      "Opening a document loads 40MB in the constructor, even when the user only sees the title in a list. And a viewer with role 'guest' should not get the bytes at all.",
    solution:
      "DocumentProxy implements Document. display() checks the role, then lazily constructs RealDocument on first allowed access and caches it. The client cannot tell proxy from real. A proxy controls access; a decorator adds behavior. Protection, virtual (lazy), and remote proxies are the usual three.",
    participants: [
      { role: "Subject", does: "Interface shared by proxy and real subject." },
      { role: "Proxy", does: "Checks, caches, or forwards. Does not do the heavy work itself." },
      { role: "Real subject", does: "The expensive or sensitive object." },
    ],
    useWhen: [
      "Creation is expensive and sometimes unused (virtual proxy).",
      "Access depends on permissions (protection proxy).",
      "The real object lives in another process (remote proxy).",
    ],
    checks: [
      "Client is typed to the subject interface.",
      "The real object is not constructed on the denied path.",
      "A second display() does not reload from disk.",
    ],
    pros: ["Lazy work.", "Security checks in one place, not in every caller."],
    cons: ["Extra hop.", "Surprises if the proxy's failure mode differs from the real object's."],
    avoid: "If you are adding features rather than controlling access, you want a decorator.",
    related: ["decorator", "adapter", "facade"],
    prompt: "Design a document list that shows titles instantly, loads file bytes only when opened, and refuses guests.",
    objects: [
      { id: "client", name: "Viewer", stereotype: "client", x: 16, y: 48, lines: ["role: editor", "sees: Document"] },
      { id: "proxy", name: "DocProxy", stereotype: "proxy", x: 48, y: 46, lines: ["loaded: no", "role check"] },
      { id: "real", name: "RealDoc", stereotype: "subject", x: 78, y: 28, lines: ["bytes: 40mb", "loaded: no"] },
      { id: "disk", name: "Disk", stereotype: "resource", x: 78, y: 74, lines: ["report.pdf", "cold"] },
    ],
    links: [
      { from: "client", to: "proxy", label: "uses" },
      { from: "proxy", to: "real", label: "lazy", dashed: true },
      { from: "real", to: "disk", label: "reads" },
    ],
    steps: [
      {
        title: "Eager load",
        blurb: "The list constructs every document up front. Titles were all the user needed; the disk pays anyway.",
        call: "read(40mb)",
        note: "Work happens in the constructor, before any display().",
        kind: "problem",
        from: "client",
        to: "disk",
      },
      {
        title: "Client hits the proxy",
        blurb: "The list holds DocProxy objects. Building the list allocates no file bytes.",
        call: "display()",
        note: "Virtual proxy. Same interface as RealDoc.",
        kind: "call",
        from: "client",
        to: "proxy",
        updates: [{ id: "proxy", lines: ["loaded: no", "check: editor ok"] }],
      },
      {
        title: "Lazy construct",
        blurb: "The role check passes, so the proxy finally constructs RealDoc, which reads the disk. A guest would have stopped here.",
        call: "load()",
        note: "Protection + virtual in one placeholder.",
        kind: "create",
        from: "proxy",
        to: "real",
        reveal: ["real"],
      },
      {
        title: "Disk pays once",
        blurb: "RealDoc pulls the bytes. The proxy keeps the reference.",
        call: "read(40mb)",
        note: "First access is the expensive one.",
        kind: "call",
        from: "real",
        to: "disk",
        updates: [
          { id: "real", lines: ["bytes: 40mb", "loaded: yes"] },
          { id: "proxy", lines: ["loaded: yes", "cached: RealDoc"] },
          { id: "disk", lines: ["report.pdf", "read once"] },
        ],
      },
      {
        title: "Second display is free",
        blurb: "display() again does not touch the disk. The proxy returns the cached subject. That cache is the difference between a proxy and doing the work inline.",
        call: "display()",
        note: "Cache hit. Disk stays cold.",
        kind: "return",
        from: "proxy",
        to: "client",
      },
    ],
    snippet: `interface Document { display(): string }

class DocProxy implements Document {
  private real: RealDoc | null = null
  constructor(private role: Role, private path: string) {}

  display(): string {
    if (this.role === "guest") throw new Error("forbidden")
    this.real ??= new RealDoc(this.path)
    return this.real.display()
  }
}`,
  },
];
