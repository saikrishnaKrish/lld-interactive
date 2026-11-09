import type { Pattern } from "./types";

export const behavioral: Pattern[] = [
  {
    id: "chain-of-responsibility",
    name: "Chain of Responsibility",
    aka: "CoR",
    category: "behavioral",
    tagline: "Pass a request along a line of handlers until one takes it.",
    intent:
      "Avoid coupling the sender of a request to its receiver by giving more than one object a chance to handle it.",
    problem:
      "Expense approval is a ladder of ifs: under $1k the manager, under $10k the director, else the VP. Adding a finance bot means editing the ladder. The employee should not know the org chart.",
    solution:
      "Each handler has a limit and a next pointer. It approves or forwards. The employee submits to the head of the chain. A new approver is a new link, wired at setup. Middleware is the same idea: each stage handles or calls next().",
    participants: [
      { role: "Handler", does: "Handles the request or forwards it to the next handler." },
      { role: "Concrete handler", does: "Decides, using only its own rule." },
      { role: "Client", does: "Starts the request at the first handler. Does not pick the receiver." },
    ],
    useWhen: [
      "More than one object may handle a request, and the winner is not known up front.",
      "You want to assemble the pipeline at runtime.",
      "The set of handlers should grow without editing the sender.",
    ],
    checks: [
      "The sender does not name a concrete approver.",
      "A handler that cannot take it calls next, and does not throw a silent drop unless that is the design.",
      "Order of the chain is explicit at assembly time.",
    ],
    pros: ["Open/closed for new handlers.", "Each handler stays a single rule."],
    cons: ["A request can fall off the end.", "Harder to see who will handle a given input."],
    avoid: "A single known receiver does not need a chain. Call it.",
    related: ["command", "decorator", "composite"],
    prompt: "Design expense approval. Managers approve up to $1,000, directors up to $10,000, VPs above that. New roles will appear.",
    objects: [
      { id: "emp", name: "Employee", stereotype: "client", x: 14, y: 48, lines: ["amount: $4,000"] },
      { id: "mgr", name: "Manager", stereotype: "handler", x: 40, y: 48, lines: ["limit: $1,000", "next: director"] },
      { id: "dir", name: "Director", stereotype: "handler", x: 64, y: 48, lines: ["limit: $10,000", "next: vp"] },
      { id: "vp", name: "VP", stereotype: "handler", x: 86, y: 48, lines: ["limit: none", "next: —"] },
    ],
    links: [
      { from: "emp", to: "mgr", label: "submits" },
      { from: "mgr", to: "dir", label: "next" },
      { from: "dir", to: "vp", label: "next" },
    ],
    steps: [
      {
        title: "Ladder of ifs",
        blurb: "The employee method names every role. A new approver is a new branch in someone else's class.",
        call: "if (amount > 1000) …",
        note: "Sender is coupled to every receiver.",
        kind: "problem",
        from: "emp",
        to: "vp",
      },
      {
        title: "Enter at the head",
        blurb: "The employee only knows the first handler. Who eventually signs is not the employee's business.",
        call: "handle(4000)",
        note: "Chain assembled elsewhere: manager → director → vp.",
        kind: "call",
        from: "emp",
        to: "mgr",
      },
      {
        title: "Manager passes",
        blurb: "$4,000 is over the manager's limit, so the handler does not approve and does not reject. It forwards.",
        call: "next.handle(4000)",
        note: "A handler either handles or calls next. Not both.",
        kind: "call",
        from: "mgr",
        to: "dir",
      },
      {
        title: "Director approves",
        blurb: "$4,000 is inside the director's limit. The chain stops. The VP is not woken up.",
        call: "approve()",
        note: "First handler whose rule matches wins.",
        kind: "note",
        from: "dir",
        to: "dir",
        updates: [{ id: "dir", lines: ["limit: $10,000", "decision: approved"] }],
      },
      {
        title: "Result returns",
        blurb: "The decision travels back. Raising the manager's limit, or inserting finance between director and VP, does not touch Employee.",
        call: "return approved",
        note: "Unmatched requests should have an explicit tail, not a null crash.",
        kind: "return",
        from: "dir",
        to: "emp",
      },
    ],
    snippet: `abstract class Approver {
  constructor(private next: Approver | null = null) {}
  handle(amount: number): string {
    if (this.canApprove(amount)) return this.name() + " approved"
    if (this.next) return this.next.handle(amount)
    return "denied"
  }
  protected abstract canApprove(amount: number): boolean
  protected abstract name(): string
}`,
  },
  {
    id: "command",
    name: "Command",
    aka: "Action",
    category: "behavioral",
    tagline: "Turn a request into an object you can store and undo.",
    intent:
      "Encapsulate a request as an object, so you can queue it, log it, or undo it, and so the invoker is not tied to the receiver.",
    problem:
      "A toolbar button calls editor.cut() directly. There is nowhere to put undo, nowhere to replay the action, and the button cannot be reused for a menu item without copying the call.",
    solution:
      "CutCommand holds the editor and the text it removed. execute() performs the cut; undo() puts the text back. The button only calls execute(). A history stack stores commands, not editor snapshots it does not understand. The command object is the request.",
    participants: [
      { role: "Command", does: "Interface with execute() and, if needed, undo()." },
      { role: "Concrete command", does: "Binds a receiver and the arguments of one action." },
      { role: "Invoker", does: "Asks the command to run. Does not know the receiver." },
      { role: "Receiver", does: "The editor. Knows how to cut, not that a button exists." },
    ],
    useWhen: [
      "You need undo, redo, or an audit log of actions.",
      "You want to queue or schedule work.",
      "The thing that triggers an action should not know how it is done.",
    ],
    checks: [
      "Invoker has no editor.cut() call.",
      "Undo does not require the invoker to remember arguments.",
      "Commands are data: you can list them.",
    ],
    pros: ["Undo and macros fall out.", "Invoker and receiver stay decoupled."],
    cons: ["A class per action.", "Undo state can be subtle (selections, caret)."],
    avoid: "A one-off call with no undo and no queue does not need a command object.",
    related: ["memento", "strategy", "chain-of-responsibility"],
    prompt: "Design a text editor toolbar with undo. Buttons should not call editor methods directly.",
    objects: [
      { id: "button", name: "Cut button", stereotype: "invoker", x: 16, y: 32, lines: ["holds: Command", "knows editor? no"] },
      { id: "cmd", name: "CutCommand", stereotype: "command", x: 48, y: 32, lines: ["backup: —", "execute / undo"] },
      { id: "editor", name: "Editor", stereotype: "receiver", x: 80, y: 32, lines: ["text: Hello", "sel: lo"] },
      { id: "history", name: "History", stereotype: "stack", x: 48, y: 76, lines: ["depth: 0"] },
    ],
    links: [
      { from: "button", to: "cmd", label: "invokes" },
      { from: "cmd", to: "editor", label: "receives" },
      { from: "cmd", to: "history", label: "logged" },
    ],
    steps: [
      {
        title: "Direct call",
        blurb: "The button knows the editor and calls cut(). Undo would have to live in the button, which is absurd, or in the editor as a special case.",
        call: "editor.cut()",
        note: "Invoker coupled to one receiver method.",
        kind: "problem",
        from: "button",
        to: "editor",
      },
      {
        title: "Button invokes a command",
        blurb: "The button's only job is execute(). It can be bound to cut, paste, or a macro without changing the button class.",
        call: "execute()",
        note: "Request is now an object.",
        kind: "call",
        from: "button",
        to: "cmd",
        reveal: ["cmd"],
      },
      {
        title: "Command hits the editor",
        blurb: "CutCommand remembers the selection 'lo', then asks the editor to delete it. The backup is what makes undo possible.",
        call: "delete('lo')",
        note: "Receiver stays UI-agnostic.",
        kind: "call",
        from: "cmd",
        to: "editor",
        updates: [
          { id: "editor", lines: ["text: Hel", "sel: —"] },
          { id: "cmd", lines: ["backup: lo", "execute / undo"] },
        ],
      },
      {
        title: "Push on the history",
        blurb: "History stores the command object, not a stringly description. Redo is the same stack walked the other way.",
        call: "push(cmd)",
        note: "Commands are loggable values.",
        kind: "call",
        from: "cmd",
        to: "history",
        updates: [{ id: "history", lines: ["depth: 1", "top: Cut"] }],
      },
      {
        title: "Undo replays inverse",
        blurb: "History calls undo() on the command. The command tells the editor to insert 'lo' again. The button is not involved.",
        call: "undo()",
        note: "Inverse lives with the action that captured the backup.",
        kind: "return",
        from: "history",
        to: "cmd",
        updates: [
          { id: "editor", lines: ["text: Hello", "sel: lo"] },
          { id: "history", lines: ["depth: 0"] },
        ],
      },
    ],
    snippet: `interface Command { execute(): void; undo(): void }

class CutCommand implements Command {
  private backup = ""
  constructor(private editor: Editor) {}
  execute() {
    this.backup = this.editor.selection()
    this.editor.deleteSelection()
  }
  undo() { this.editor.insert(this.backup) }
}`,
  },
  {
    id: "iterator",
    frequency: "high",
    name: "Iterator",
    aka: "Cursor",
    category: "behavioral",
    tagline: "Walk a collection without exposing how it is stored.",
    intent:
      "Provide a way to access elements of an aggregate sequentially without exposing its representation.",
    problem:
      "A playlist UI indexes into songs[], so it knows the storage is an array. A shuffle mode means either mutating that array or teaching the UI a second traversal.",
    solution:
      "Playlist.iterator() returns a cursor with hasNext() and next(). A ShuffleIterator is a different cursor over the same songs. The UI only knows the iterator interface, so storage can become a linked list or a database page without a UI edit.",
    participants: [
      { role: "Iterator", does: "Traversal interface: hasNext, next." },
      { role: "Concrete iterator", does: "Holds the cursor position for one walk." },
      { role: "Aggregate", does: "Creates iterators. Hides its storage." },
    ],
    useWhen: [
      "Clients should not depend on array vs tree vs pages.",
      "You need several simultaneous traversals, or several orders.",
      "The collection is expensive and should be walked lazily.",
    ],
    checks: [
      "No public songs array.",
      "Two iterators can walk the same playlist independently.",
      "Shuffle does not require a UI change.",
    ],
    pros: ["Storage and traversal vary independently.", "One loop structure for every collection."],
    cons: ["A small type for what a for-of loop already does, in simple cases.", "Invalidation if the collection mutates mid-walk."],
    avoid: "If the language's iterable protocol already is your API, do not invent a second cursor type for show.",
    related: ["composite", "visitor", "memento"],
    prompt: "Design a playlist the UI can walk in order or shuffled, without the UI knowing whether songs live in an array.",
    objects: [
      { id: "ui", name: "Player UI", stereotype: "client", x: 16, y: 48, lines: ["for each track", "no songs[]"] },
      { id: "list", name: "Playlist", stereotype: "aggregate", x: 46, y: 30, lines: ["songs: hidden", "iterator()"] },
      { id: "it", name: "Cursor", stereotype: "iterator", x: 46, y: 74, lines: ["index: 0", "order: sequential"] },
      { id: "song", name: "Track 2", stereotype: "element", x: 80, y: 48, lines: ["title: Breathe"] },
    ],
    links: [
      { from: "ui", to: "list", label: "asks" },
      { from: "list", to: "it", label: "creates", dashed: true },
      { from: "it", to: "song", label: "yields" },
    ],
    steps: [
      {
        title: "Index into the array",
        blurb: "The UI loops songs[i]. Shuffle means either swapping the array (a side effect) or a second loop in the UI.",
        call: "songs[i]",
        note: "Representation leaked.",
        kind: "problem",
        from: "ui",
        to: "list",
      },
      {
        title: "Ask for a cursor",
        blurb: "The playlist creates an iterator positioned at the start. The UI never receives the collection.",
        call: "iterator()",
        note: "Aggregate chooses the iterator type.",
        kind: "create",
        from: "ui",
        to: "list",
      },
      {
        title: "Cursor object",
        blurb: "A separate cursor means two UI components can walk the same playlist at different positions.",
        call: "new Cursor()",
        note: "Traversal state is not stored on the playlist.",
        kind: "create",
        from: "list",
        to: "it",
        reveal: ["it"],
      },
      {
        title: "Next element",
        blurb: "next() returns the current track and advances. The UI's loop is hasNext/next regardless of storage.",
        call: "next()",
        note: "Sequential order. Shuffle would be a different iterator class.",
        kind: "call",
        from: "ui",
        to: "it",
        updates: [{ id: "it", lines: ["index: 1", "order: sequential"] }],
      },
      {
        title: "Element, not storage",
        blurb: "The cursor yields Track 2. Replacing the array with pages from disk changes the iterator, not the player UI.",
        call: "yield Track 2",
        note: "Client depends on the element type and the iterator interface.",
        kind: "return",
        from: "it",
        to: "song",
      },
    ],
    snippet: `interface Iter<T> { hasNext(): boolean; next(): T }

class Playlist {
  constructor(private songs: Song[]) {}
  iterator(): Iter<Song> {
    let i = 0
    const songs = this.songs
    return {
      hasNext: () => i < songs.length,
      next: () => songs[i++],
    }
  }
}`,
  },
  {
    id: "mediator",
    name: "Mediator",
    aka: "Intermediary",
    category: "behavioral",
    tagline: "Stop objects from calling each other. Give them a hub.",
    intent:
      "Define an object that encapsulates how a set of colleagues interact, so they do not refer to each other explicitly.",
    problem:
      "In a chat room, Alice's client holds Bob and Charlie and calls them directly. Every new member is a new edge. Presence, mute, and delivery policy are smeared across clients.",
    solution:
      "Members know the room, not each other. Alice sends to the room; the room fans the message out and applies the rules (mute, block, history). Colleagues become reusable because they are not wired together. Mediator centralizes; Observer distributes. A chat room is often both: the room mediates, members observe it.",
    participants: [
      { role: "Mediator", does: "The hub. Knows the colleagues and the rules of interaction." },
      { role: "Colleague", does: "Talks only to the mediator." },
    ],
    useWhen: [
      "A set of objects has a messy many-to-many call graph.",
      "Interaction rules change more often than the objects do.",
      "You want to reuse a colleague somewhere else.",
    ],
    checks: [
      "No colleague field points at another colleague.",
      "A new interaction rule is an edit in the mediator only.",
      "The mediator is not a dumping ground for unrelated work.",
    ],
    pros: ["Cuts N×N dependencies down to N.", "Interaction policy has a home."],
    cons: ["The mediator can become a god object.", "It is a single place that must stay coherent."],
    avoid: "Two objects that simply call each other do not need a hub.",
    related: ["observer", "facade", "command"],
    prompt: "Design a chat room. Users send messages, but no user object should hold references to other users.",
    objects: [
      { id: "room", name: "ChatRoom", stereotype: "mediator", x: 50, y: 48, lines: ["members: 2", "fanout()"] },
      { id: "alice", name: "Alice", stereotype: "colleague", x: 16, y: 32, lines: ["knows: room", "inbox: —"] },
      { id: "bob", name: "Bob", stereotype: "colleague", x: 84, y: 32, lines: ["knows: room", "inbox: —"] },
    ],
    links: [
      { from: "alice", to: "room", label: "sends" },
      { from: "bob", to: "room", label: "sends" },
    ],
    steps: [
      {
        title: "Direct mesh",
        blurb: "Alice calls Bob.send directly. Adding Charlie means Alice, Bob, and Charlie all grow a new reference. Delivery rules have nowhere to live.",
        call: "bob.receive('hi')",
        note: "Colleagues know each other's concrete types.",
        kind: "problem",
        from: "alice",
        to: "bob",
      },
      {
        title: "Send to the room",
        blurb: "Alice's only dependency is the room. She does not know who is online.",
        call: "send('hi')",
        note: "Colleague → mediator.",
        kind: "call",
        from: "alice",
        to: "room",
      },
      {
        title: "Room delivers",
        blurb: "The room applies policy (skip the sender, skip muted users) and delivers to Bob.",
        call: "notify('hi')",
        note: "Who receives is a mediator decision.",
        kind: "call",
        from: "room",
        to: "bob",
        updates: [{ id: "bob", lines: ["knows: room", "inbox: hi"] }],
      },
      {
        title: "Reply the same way",
        blurb: "Bob also does not hold an Alice reference. He replies to the room.",
        call: "send('hey')",
        note: "Symmetric. Every colleague looks the same.",
        kind: "call",
        from: "bob",
        to: "room",
      },
      {
        title: "Fan-out back",
        blurb: "Alice receives the reply from the room. A third member joins by registering with the room — no edits to Alice or Bob.",
        call: "notify('hey')",
        note: "New colleague = one registration, not a new mesh.",
        kind: "return",
        from: "room",
        to: "alice",
        updates: [{ id: "alice", lines: ["knows: room", "inbox: hey"] }],
      },
    ],
    snippet: `class ChatRoom {
  private members: User[] = []
  join(user: User) { this.members.push(user) }
  send(from: User, text: string) {
    for (const user of this.members) {
      if (user !== from) user.receive(from.name, text)
    }
  }
}

class User {
  constructor(readonly name: string, private room: ChatRoom) {}
  say(text: string) { this.room.send(this, text) }
  receive(from: string, text: string) { /* inbox */ }
}`,
  },
  {
    id: "memento",
    name: "Memento",
    aka: "Snapshot",
    category: "behavioral",
    tagline: "Save and restore state without exposing it.",
    intent:
      "Capture an object's internal state so it can be restored later, without violating encapsulation.",
    problem:
      "An editor wants undo. Exporting every field so a history object can store them means the history class is welded to the editor's private layout — and any caller can poke those fields.",
    solution:
      "The editor (originator) creates an opaque Memento of its own state. History (caretaker) stores mementos but cannot read them. restore(memento) is the only way back. Command undo often uses a memento internally when the inverse is hard to compute.",
    participants: [
      { role: "Originator", does: "Creates and consumes mementos. The only type that can see inside." },
      { role: "Memento", does: "Immutable snapshot. Narrow interface for everyone else." },
      { role: "Caretaker", does: "Decides when to snapshot and restore. Never inspects the payload." },
    ],
    useWhen: [
      "You need checkpoints or undo.",
      "The state must stay private.",
      "Snapshots are infrequent enough to store.",
    ],
    checks: [
      "Caretaker has no field access on the editor.",
      "Memento is immutable from the outside.",
      "Restore puts back a full consistent state, not a partial one.",
    ],
    pros: ["Encapsulation holds.", "Originator stays in charge of its invariant."],
    cons: ["Snapshots can be large.", "Hidden state makes debugging the history opaque — which is the point, and the cost."],
    avoid: "If undo is a simple inverse (insert the text you just cut), a command backup is enough. You may not need a full snapshot.",
    related: ["command", "prototype", "state"],
    prompt: "Design undo for a document editor. The history stack must not read or write the editor's private fields.",
    objects: [
      { id: "editor", name: "Editor", stereotype: "originator", x: 20, y: 48, lines: ["text: Hello", "caret: 5"] },
      { id: "memo", name: "Memento", stereotype: "snapshot", x: 52, y: 28, lines: ["sealed", "text: Hello"] },
      { id: "history", name: "History", stereotype: "caretaker", x: 78, y: 58, lines: ["stack: 0", "cannot read text"] },
    ],
    links: [
      { from: "editor", to: "memo", label: "creates", dashed: true },
      { from: "history", to: "memo", label: "stores" },
      { from: "history", to: "editor", label: "restore" },
    ],
    steps: [
      {
        title: "State leaks",
        blurb: "History reads editor.text and editor.caret directly so it can save them. Any future private field has to be taught to History too.",
        call: "read editor.text",
        note: "Caretaker violates encapsulation.",
        kind: "problem",
        from: "history",
        to: "editor",
      },
      {
        title: "Originator snapshots itself",
        blurb: "save() builds a memento from the inside. The payload is sealed; only Editor can open it.",
        call: "save()",
        note: "Snapshot is opaque to everyone else.",
        kind: "create",
        from: "editor",
        to: "memo",
        reveal: ["memo"],
        updates: [{ id: "memo", lines: ["sealed", "text: Hello"] }],
      },
      {
        title: "Caretaker stores it",
        blurb: "History pushes the memento. It can count snapshots. It cannot print the text, because it has no accessor.",
        call: "push(memento)",
        note: "When to snapshot is the caretaker's decision.",
        kind: "call",
        from: "editor",
        to: "history",
        updates: [{ id: "history", lines: ["stack: 1", "cannot read text"] }],
      },
      {
        title: "User keeps typing",
        blurb: "The live editor moves on to 'Hello!'. The memento still says 'Hello'. They are different states.",
        call: "type('!')",
        note: "Originator mutates. Snapshot does not.",
        kind: "note",
        from: "editor",
        to: "editor",
        updates: [{ id: "editor", lines: ["text: Hello!", "caret: 6"] }],
      },
      {
        title: "Restore",
        blurb: "History hands the memento back. Editor.open() writes its private fields. History still never saw them.",
        call: "restore(memento)",
        note: "Only the originator interprets the snapshot.",
        kind: "call",
        from: "history",
        to: "editor",
        updates: [{ id: "editor", lines: ["text: Hello", "caret: 5"] }],
      },
    ],
    snippet: `class Editor {
  constructor(private text = "", private caret = 0) {}
  save(): Memento { return new Memento(this.text, this.caret) }
  restore(m: Memento) {
    this.text = m.text
    this.caret = m.caret
  }
}

class Memento {
  constructor(readonly text: string, readonly caret: number) {}
}`,
  },
  {
    id: "observer",
    frequency: "high",
    name: "Observer",
    aka: "Pub / sub",
    category: "behavioral",
    tagline: "Notify dependents when state changes, without naming them.",
    intent:
      "Define a one-to-many dependency so when one object changes, every dependent is notified automatically.",
    problem:
      "When an order is placed, Store calls Email, Push, and Analytics by name. A new SMS channel is an edit inside Store, and Store will not compile without those classes.",
    solution:
      "Store keeps a list of listeners and calls onOrder() on each. Channels subscribe and unsubscribe from the outside. Store depends on a Listener interface, not on Email. Observer fans out; Mediator coordinates a protocol between colleagues.",
    participants: [
      { role: "Subject", does: "Holds subscribers and notifies them on change." },
      { role: "Observer", does: "Interface with the callback the subject invokes." },
      { role: "Concrete observers", does: "Subscribe. React in their own way. Do not know about each other." },
    ],
    useWhen: [
      "A change should trigger an open-ended set of reactions.",
      "The publisher should not depend on the reactors.",
      "Reactors come and go at runtime.",
    ],
    checks: [
      "Store has no import of Email or Push.",
      "A new channel is a new subscriber, wired outside Store.",
      "Unsubscribe actually removes the callback (no leaked listeners).",
    ],
    pros: ["Open/closed for new reactions.", "Runtime subscribe and unsubscribe."],
    cons: ["Notification order can become a hidden dependency.", "Hard to trace who reacts. Watch for update storms."],
    avoid: "If there is exactly one known reaction, call it. A subscriber list is ceremony.",
    related: ["mediator", "command", "chain-of-responsibility"],
    prompt: "Design order placement so email, push, and future channels react, without OrderService naming those channels.",
    objects: [
      { id: "store", name: "Store", stereotype: "subject", x: 28, y: 48, lines: ["listeners: 0", "place(order)"] },
      { id: "email", name: "Email", stereotype: "observer", x: 74, y: 22, lines: ["subscribed: no"] },
      { id: "push", name: "Push", stereotype: "observer", x: 74, y: 50, lines: ["subscribed: no"] },
      { id: "stats", name: "Analytics", stereotype: "observer", x: 74, y: 78, lines: ["subscribed: no"] },
    ],
    links: [
      { from: "email", to: "store", label: "subscribes", dashed: true },
      { from: "push", to: "store", label: "subscribes", dashed: true },
      { from: "stats", to: "store", label: "subscribes", dashed: true },
    ],
    steps: [
      {
        title: "Named callees",
        blurb: "place() calls email.send and push.send directly. Analytics is a third edit waiting to happen, and tests must construct channels they do not care about.",
        call: "email.send(order)",
        note: "Subject depends on concrete observers.",
        kind: "problem",
        from: "store",
        to: "email",
      },
      {
        title: "Email subscribes",
        blurb: "The composition root wires Email to the store. Store only sees a Listener.",
        call: "subscribe(email)",
        note: "Dependency flipped: observer knows the subject.",
        kind: "call",
        from: "email",
        to: "store",
        updates: [
          { id: "email", lines: ["subscribed: yes"] },
          { id: "store", lines: ["listeners: 1", "place(order)"] },
        ],
      },
      {
        title: "Push subscribes",
        blurb: "A second listener, same interface. Store's place() method did not change.",
        call: "subscribe(push)",
        note: "Open-ended list.",
        kind: "call",
        from: "push",
        to: "store",
        updates: [
          { id: "push", lines: ["subscribed: yes"] },
          { id: "store", lines: ["listeners: 2", "place(order)"] },
        ],
      },
      {
        title: "Notify on place",
        blurb: "The order is committed, then every listener gets onOrder. Email does not know Push exists.",
        call: "onOrder(#18)",
        note: "Fan-out. This frame shows Email; Push receives the same call.",
        kind: "call",
        from: "store",
        to: "email",
        updates: [{ id: "email", lines: ["subscribed: yes", "sent #18"] }],
      },
      {
        title: "Someone leaves",
        blurb: "Analytics can subscribe later and unsubscribe without a Store deploy. Forgotten unsubscribes are how this pattern leaks memory — design the removal.",
        call: "onOrder(#18)",
        note: "Same event, next listener. No branch on channel type.",
        kind: "call",
        from: "store",
        to: "push",
        updates: [{ id: "push", lines: ["subscribed: yes", "sent #18"] }],
      },
    ],
    snippet: `interface OrderListener { onOrder(order: Order): void }

class Store {
  private listeners: OrderListener[] = []
  subscribe(l: OrderListener) { this.listeners.push(l) }
  place(order: Order) {
    this.save(order)
    for (const l of this.listeners) l.onOrder(order)
  }
  private save(_order: Order) {}
}`,
  },
  {
    id: "state",
    name: "State",
    aka: "Objects for states",
    category: "behavioral",
    tagline: "Replace status ifs with objects that know the transitions.",
    intent:
      "Let an object alter its behavior when its internal state changes. The object appears to change its class.",
    problem:
      "Order.ship() starts with if (status === 'paid'). pay(), cancel(), and refund() each repeat the ladder. A new status means touching every method, and illegal transitions hide in branches.",
    solution:
      "Extract Draft, Paid, and Shipped objects that implement OrderState. Order delegates ship() to the current state. Draft.ship() throws; Paid.ship() switches the order to Shipped. Transitions live next to the state that allows them. The client does not set status strings. State changes itself; Strategy is chosen by the client.",
    participants: [
      { role: "Context", does: "Holds the current state object and forwards calls." },
      { role: "State", does: "Interface of the actions that depend on status." },
      { role: "Concrete states", does: "Implement actions and decide the next state." },
    ],
    useWhen: [
      "Behavior is a large conditional on a status field.",
      "Transitions are the actual business rules.",
      "States are few and their behavior really differs.",
    ],
    checks: [
      "No status string compared in Order methods.",
      "Illegal transitions fail inside the state that forbids them.",
      "The context is the only one that stores 'current state'.",
    ],
    pros: ["Each state's rules are local.", "New status is a new class, not N new branches."],
    cons: ["More classes than a small enum switch.", "Transitions that many states share can scatter."],
    avoid: "A status that only changes a label, with no behavior change, is data. Do not objectify it.",
    related: ["strategy", "command", "singleton"],
    prompt: "Design an order lifecycle: draft, paid, shipped. pay, ship, and cancel behave differently in each, and illegal moves must fail clearly.",
    objects: [
      { id: "client", name: "Checkout", stereotype: "client", x: 14, y: 48, lines: ["calls: pay, ship", "no status checks"] },
      { id: "order", name: "Order", stereotype: "context", x: 44, y: 48, lines: ["state: draft"] },
      { id: "draft", name: "Draft", stereotype: "state", x: 78, y: 20, lines: ["pay → Paid", "ship: illegal"] },
      { id: "paid", name: "Paid", stereotype: "state", x: 78, y: 50, lines: ["ship → Shipped"] },
      { id: "shipped", name: "Shipped", stereotype: "state", x: 78, y: 80, lines: ["pay: illegal"] },
    ],
    links: [
      { from: "client", to: "order", label: "uses" },
      { from: "order", to: "draft", label: "delegates", dashed: true },
      { from: "order", to: "paid", label: "delegates", dashed: true },
      { from: "order", to: "shipped", label: "delegates", dashed: true },
    ],
    steps: [
      {
        title: "Status conditionals",
        blurb: "ship() switches on a string. cancel() switches again. The allowed transitions are not written down anywhere once.",
        call: "if (status == paid)",
        note: "Behavior and transition table are smeared across methods.",
        kind: "problem",
        from: "client",
        to: "order",
      },
      {
        title: "Delegate to Draft",
        blurb: "Order.pay() forwards to the current state object. The context does not know the rule.",
        call: "pay()",
        note: "Context holds a State, not a string.",
        kind: "call",
        from: "order",
        to: "draft",
        reveal: ["draft"],
      },
      {
        title: "Draft transitions",
        blurb: "Draft allows pay. It tells the order to become Paid. Draft.ship() would throw — that rule sits in Draft, not in a shared switch.",
        call: "become(Paid)",
        note: "The state object chooses the successor.",
        kind: "create",
        from: "draft",
        to: "paid",
        reveal: ["paid"],
        updates: [{ id: "order", lines: ["state: paid"] }],
      },
      {
        title: "Paid ships",
        blurb: "The same Order.ship() call now hits Paid, because the context's reference moved. Client code did not branch.",
        call: "ship()",
        note: "Same method, different behavior. That is the pattern.",
        kind: "call",
        from: "order",
        to: "paid",
      },
      {
        title: "Terminal state",
        blurb: "Paid moves the order to Shipped. A later pay() hits Shipped.pay() and fails. No string compares remain on Order.",
        call: "become(Shipped)",
        note: "Illegal calls are the new state's job.",
        kind: "create",
        from: "paid",
        to: "shipped",
        reveal: ["shipped"],
        updates: [{ id: "order", lines: ["state: shipped"] }],
      },
    ],
    snippet: `interface OrderState {
  pay(order: Order): void
  ship(order: Order): void
}

class Draft implements OrderState {
  pay(order: Order) { order.setState(new Paid()) }
  ship(_order: Order): void { throw new Error("pay first") }
}

class Order {
  private state: OrderState = new Draft()
  pay() { this.state.pay(this) }
  ship() { this.state.ship(this) }
  setState(state: OrderState) { this.state = state }
}`,
  },
  {
    id: "strategy",
    frequency: "high",
    name: "Strategy",
    aka: "Policy",
    category: "behavioral",
    tagline: "Swap an algorithm without a conditional in the client.",
    intent:
      "Define a family of algorithms, put each one in its own object, and make them interchangeable.",
    problem:
      "Checkout.cost() switches on carrier: ground, air, bike. Every new carrier edits Checkout, and the pricing formulas cannot be unit-tested without an order.",
    solution:
      "ShippingStrategy.cost(order) is the interface. Ground and Air implement it. Checkout holds a strategy and asks it for a number. The client picks the strategy (config, user choice). That is the split from State, where the object changes its own mode. It is also composition, where Template Method would use a subclass hook.",
    participants: [
      { role: "Context", does: "Configured with a strategy. Delegates the varying step." },
      { role: "Strategy", does: "Common algorithm interface." },
      { role: "Concrete strategies", does: "One algorithm each. No reference back unless they need data passed in." },
    ],
    useWhen: [
      "A conditional picks among algorithms that are the whole point of the change.",
      "You want to test algorithms in isolation.",
      "The choice should be runtime data, not a recompile.",
    ],
    checks: [
      "Checkout has no switch on carrier.",
      "A new carrier is a new class plus wiring.",
      "Strategies receive what they need as arguments; they do not scrape the context's privates.",
    ],
    pros: ["Open/closed for algorithms.", "Eliminates a conditional that would only grow."],
    cons: ["Clients must understand the strategies enough to pick one.", "Awkward if strategies differ in the data they require."],
    avoid: "Two one-line formulas do not deserve two classes. A function value is the same pattern with less furniture.",
    related: ["state", "template-method", "bridge"],
    prompt: "Design shipping cost. Ground, air, and bike each price an order differently, and a new carrier should not edit checkout.",
    objects: [
      { id: "checkout", name: "Checkout", stereotype: "context", x: 18, y: 48, lines: ["strategy: ground", "total: —"] },
      { id: "strategy", name: "Strategy", stereotype: "interface", x: 50, y: 48, lines: ["cost(order)", "no carrier switch"] },
      { id: "ground", name: "Ground", stereotype: "strategy", x: 82, y: 26, lines: ["$8 flat"] },
      { id: "air", name: "Air", stereotype: "strategy", x: 82, y: 74, lines: ["$22 flat"] },
    ],
    links: [
      { from: "checkout", to: "strategy", label: "holds" },
      { from: "ground", to: "strategy", label: "implements", dashed: true },
      { from: "air", to: "strategy", label: "implements", dashed: true },
    ],
    steps: [
      {
        title: "Switch on carrier",
        blurb: "cost() knows every formula. Bike shipping next month is a Checkout edit plus a regression in unrelated branches.",
        call: "switch (carrier)",
        note: "Algorithm selection and checkout flow are one function.",
        kind: "problem",
        from: "checkout",
        to: "ground",
      },
      {
        title: "Delegate",
        blurb: "Checkout asks whatever strategy it was given. It could not name Ground even if it wanted to — its field type is the interface.",
        call: "cost(order)",
        note: "Context is closed. Strategies are open.",
        kind: "call",
        from: "checkout",
        to: "strategy",
      },
      {
        title: "Ground prices it",
        blurb: "The ground algorithm returns 8. It can be tested with a fake order and no checkout.",
        call: "cost → $8",
        note: "One class, one formula.",
        kind: "return",
        from: "ground",
        to: "strategy",
        updates: [{ id: "checkout", lines: ["strategy: ground", "total: $8"] }],
      },
      {
        title: "Client swaps policy",
        blurb: "The user picks air. Checkout replaces its strategy reference. This is client-chosen, which is what makes it Strategy and not State.",
        call: "setStrategy(air)",
        note: "Runtime configuration.",
        kind: "call",
        from: "checkout",
        to: "strategy",
        reveal: ["air"],
        updates: [{ id: "checkout", lines: ["strategy: air", "total: $8"] }],
      },
      {
        title: "Same call, new number",
        blurb: "cost(order) is the same line and now returns 22. Adding bike is a new strategy class wired from configuration.",
        call: "cost → $22",
        note: "No switch was extended.",
        kind: "return",
        from: "air",
        to: "strategy",
        updates: [{ id: "checkout", lines: ["strategy: air", "total: $22"] }],
      },
    ],
    snippet: `interface Shipping {
  cost(order: Order): number
}

class Ground implements Shipping {
  cost() { return 8 }
}
class Air implements Shipping {
  cost(order: Order) { return 22 + order.weight }
}

class Checkout {
  constructor(private shipping: Shipping) {}
  total(order: Order) {
    return order.subtotal + this.shipping.cost(order)
  }
}`,
  },
  {
    id: "template-method",
    name: "Template Method",
    aka: "Skeleton",
    category: "behavioral",
    tagline: "Fix the steps in a base class. Let subclasses fill the gaps.",
    intent:
      "Define the skeleton of an algorithm in a base class and let subclasses override specific steps without changing the skeleton's structure.",
    problem:
      "PDF and CSV miners both open a file, pull records, parse them, and close. The copies have drifted: CSV forgot to close the handle. The steps are the same; one step differs.",
    solution:
      "DataMiner.mine() is final in spirit: open, extract, parse, close. extract() is abstract. PDFMiner and CSVMiner override only that hook. A hook with an empty default (afterParse) lets a subclass opt in. Template Method varies steps by subclass; Strategy varies the whole algorithm by composition. Prefer Strategy when you need to swap at runtime.",
    participants: [
      { role: "Abstract class", does: "The template method plus default or abstract steps." },
      { role: "Concrete class", does: "Overrides the steps that differ." },
    ],
    useWhen: [
      "Several classes share an algorithm with a few different steps.",
      "You want to stop copy-paste drift in the invariant steps.",
      "The skeleton should be hard to reorder.",
    ],
    checks: [
      "The skeleton method is not overridden.",
      "Subclasses cannot skip close().",
      "Hooks are optional and empty by default, not abstract noise.",
    ],
    pros: ["Invariant steps live once.", "Frameworks expose extension points cleanly."],
    cons: ["Inheritance is a stiff extension model.", "A deep base class becomes a junk drawer of hooks."],
    avoid: "If callers must swap behavior per instance at runtime, pass a Strategy instead of subclassing.",
    related: ["strategy", "factory-method"],
    prompt: "Design a file miner for PDF and CSV. The pipeline is identical except how bytes become raw records.",
    objects: [
      { id: "client", name: "Job", stereotype: "client", x: 16, y: 48, lines: ["calls: mine()"] },
      { id: "miner", name: "DataMiner", stereotype: "template", x: 48, y: 46, lines: ["mine() skeleton", "extract() hook"] },
      { id: "pdf", name: "PdfMiner", stereotype: "subclass", x: 82, y: 26, lines: ["extract: pages"] },
      { id: "csv", name: "CsvMiner", stereotype: "subclass", x: 82, y: 74, lines: ["extract: rows"] },
    ],
    links: [
      { from: "client", to: "miner", label: "calls" },
      { from: "pdf", to: "miner", label: "extends", dashed: true },
      { from: "csv", to: "miner", label: "extends", dashed: true },
    ],
    steps: [
      {
        title: "Copied pipeline",
        blurb: "PdfMiner.mine and CsvMiner.mine were pasted. One of them no longer closes the file. The bug is divergence of steps that were supposed to be identical.",
        call: "mine() copy",
        note: "Invariant and variant steps are mixed in each subclass.",
        kind: "problem",
        from: "client",
        to: "pdf",
      },
      {
        title: "Skeleton in the base",
        blurb: "The job calls mine() on the base type. The method runs open → extract → parse → close, and subclasses are not invited to replace it.",
        call: "mine()",
        note: "Template method. Hollywood principle: the base calls the subclass.",
        kind: "call",
        from: "client",
        to: "miner",
      },
      {
        title: "PDF hook",
        blurb: "extract() is abstract. PdfMiner reads pages. It cannot forget close(); it does not own that step.",
        call: "extract()",
        note: "Only the varying step is overridden.",
        kind: "call",
        from: "miner",
        to: "pdf",
        updates: [{ id: "miner", lines: ["step: extract", "impl: PdfMiner"] }],
      },
      {
        title: "CSV hook",
        blurb: "The same skeleton runs against CsvMiner. open, parse, and close are literally the same code.",
        call: "extract()",
        note: "Second subclass, same template.",
        kind: "call",
        from: "miner",
        to: "csv",
        updates: [{ id: "miner", lines: ["step: extract", "impl: CsvMiner"] }],
      },
      {
        title: "Records come back",
        blurb: "mine() returns parsed records either way. A hook afterParse() could let CSV drop a header row without touching the skeleton.",
        call: "return records",
        note: "Reorder the pipeline in one method, both formats follow.",
        kind: "return",
        from: "miner",
        to: "client",
      },
    ],
    snippet: `abstract class DataMiner {
  mine(path: string): Row[] {
    const raw = this.open(path)
    const text = this.extract(raw)
    const rows = this.parse(text)
    this.close(raw)
    return rows
  }
  protected abstract extract(raw: string): string
  protected open(path: string) { return readFile(path) }
  protected parse(text: string): Row[] { return parseRows(text) }
  protected close(_raw: string) {}
}`,
  },
  {
    id: "visitor",
    name: "Visitor",
    aka: "Double dispatch",
    category: "behavioral",
    tagline: "Add operations over a type hierarchy without editing the types.",
    intent:
      "Represent an operation to be performed on elements of an object structure, and add new operations without changing the element classes.",
    problem:
      "Shapes already exist. You need SVG export, then area, then hit-testing. Each one adds a method to Circle and Rectangle. The shapes become a junk drawer of unrelated operations, and you may not own them.",
    solution:
      "Shapes accept a Visitor. accept() calls visitor.visitCircle(this) — the shape picks the overload, so the visitor gets the concrete type back. ExportVisitor and AreaVisitor are new operations. Adding a shape, though, touches every visitor. Visitor is for stable types and frequently new operations. If you add types more often, you do not want it.",
    participants: [
      { role: "Visitor", does: "A visit method per concrete element." },
      { role: "Concrete visitor", does: "One operation, implemented for every element type." },
      { role: "Element", does: "accept(visitor) calls the matching visit method. Double dispatch." },
    ],
    useWhen: [
      "The element types are stable.",
      "Operations over those types keep appearing.",
      "Those operations do not belong on the elements.",
    ],
    checks: [
      "Circle has accept, and does not have exportSvg or area.",
      "A new operation is a new visitor, no shape edits.",
      "You can say what happens when a new shape is added (every visitor changes).",
    ],
    pros: ["Operations gather related logic in one class.", "Elements stay a stable structure."],
    cons: ["A new element type is expensive.", "Visitors often need friend-like access to element internals."],
    avoid: "If you add types more often than operations, ordinary methods win.",
    related: ["composite", "iterator", "strategy"],
    prompt: "Shapes are done. You keep needing new operations (export, area, bounding box). Design so Circle and Rectangle stop changing.",
    objects: [
      { id: "client", name: "Tool", stereotype: "client", x: 14, y: 48, lines: ["picks a visitor"] },
      { id: "circle", name: "Circle", stereotype: "element", x: 46, y: 26, lines: ["r: 4", "accept(v)"] },
      { id: "rect", name: "Rect", stereotype: "element", x: 46, y: 74, lines: ["w: 3 h: 5", "accept(v)"] },
      { id: "svg", name: "Export", stereotype: "visitor", x: 80, y: 26, lines: ["visitCircle", "visitRect"] },
      { id: "area", name: "Area", stereotype: "visitor", x: 80, y: 74, lines: ["visitCircle", "visitRect"] },
    ],
    links: [
      { from: "client", to: "circle", label: "accept" },
      { from: "client", to: "rect", label: "accept" },
      { from: "circle", to: "svg", label: "visit", dashed: true },
      { from: "rect", to: "area", label: "visit", dashed: true },
    ],
    steps: [
      {
        title: "Methods pile onto shapes",
        blurb: "exportSvg() lands on Circle, then area(), then json(). Rectangle needs the same set. The type is now every feature that ever touched a shape.",
        call: "circle.exportSvg()",
        note: "New operation = edit every element.",
        kind: "problem",
        from: "client",
        to: "circle",
      },
      {
        title: "Element accepts a visitor",
        blurb: "The tool calls circle.accept(export). Circle does not know what export does.",
        call: "accept(export)",
        note: "First dispatch: the element's method.",
        kind: "call",
        from: "client",
        to: "circle",
      },
      {
        title: "Double dispatch",
        blurb: "Circle calls visitor.visitCircle(this). The visitor now has the concrete type and can read r without a cast.",
        call: "visitCircle(this)",
        note: "Second dispatch: the visitor's overload.",
        kind: "call",
        from: "circle",
        to: "svg",
        updates: [{ id: "svg", lines: ["out: <circle r=4>"] }],
      },
      {
        title: "A second operation",
        blurb: "Area is a new visitor. Rectangles gain area without a new method on Rect. Shapes were not edited.",
        call: "accept(area)",
        note: "New operation, old elements.",
        kind: "call",
        from: "client",
        to: "rect",
      },
      {
        title: "Visitor computes",
        blurb: "visitRect uses w and h. The trade is explicit: a Triangle would force visitTriangle onto both Export and Area.",
        call: "visitRect(this)",
        note: "Stable hierarchy, unstable operations. That is when Visitor pays.",
        kind: "return",
        from: "rect",
        to: "area",
        updates: [{ id: "area", lines: ["area: 15"] }],
      },
    ],
    snippet: `interface ShapeVisitor {
  visitCircle(c: Circle): void
  visitRect(r: Rect): void
}

class Circle {
  constructor(readonly r: number) {}
  accept(v: ShapeVisitor) { v.visitCircle(this) }
}

class Area implements ShapeVisitor {
  total = 0
  visitCircle(c: Circle) { this.total += Math.PI * c.r * c.r }
  visitRect(r: Rect) { this.total += r.w * r.h }
}`,
  },
  {
    id: "interpreter",
    name: "Interpreter",
    aka: "Grammar as objects",
    category: "behavioral",
    tagline: "Represent a small language as a tree of objects that evaluate themselves.",
    intent:
      "Given a simple grammar, define a class per rule and interpret sentences by walking the tree.",
    problem:
      "Alert rules are hand-written ifs: ticker is AAPL and price is over 100. Traders want to compose rules. Each new combination edits the evaluator.",
    solution:
      "TickerIs and PriceGt are terminal expressions. And and Or are nonterminals that hold child expressions. interpret(ctx) recursively evaluates the tree against a row. A new rule is a new tree, often built by a parser, not a new branch. Keep the grammar small — this pattern makes a bad home for a full programming language.",
    participants: [
      { role: "Abstract expression", does: "interpret(context)." },
      { role: "Terminal", does: "A leaf rule. Looks at the context directly." },
      { role: "Nonterminal", does: "A composite rule. Interprets its children." },
      { role: "Context", does: "The row or input the sentence is evaluated against." },
    ],
    useWhen: [
      "The grammar is small and stable.",
      "You need to compose rules as data.",
      "Evaluation is a tree walk, not a performance-critical loop.",
    ],
    checks: [
      "A compound rule is data (an And node), not a new function.",
      "Expressions do not depend on how they were parsed.",
      "You can explain why you would not use this for a general scripting language.",
    ],
    pros: ["Easy to extend the grammar with a class.", "The tree can be printed, saved, and rearranged."],
    cons: ["A class per rule gets loud fast.", "Complex grammars want a real parser toolkit, not a pile of classes."],
    avoid: "If the 'language' is three fixed filters, ordinary functions are clearer.",
    related: ["composite", "visitor", "strategy"],
    prompt: "Design user-defined alert rules: ticker equals X, price greater than Y, combined with AND and OR, without a new deploy per rule.",
    objects: [
      { id: "client", name: "Alerts", stereotype: "client", x: 16, y: 48, lines: ["row: AAPL @ 120", "no if ladder"] },
      { id: "and", name: "And", stereotype: "nonterminal", x: 48, y: 48, lines: ["left, right", "interpret()"] },
      { id: "ticker", name: "TickerIs", stereotype: "terminal", x: 80, y: 26, lines: ["symbol: AAPL"] },
      { id: "price", name: "PriceGt", stereotype: "terminal", x: 80, y: 74, lines: ["min: 100"] },
    ],
    links: [
      { from: "client", to: "and", label: "evaluates" },
      { from: "and", to: "ticker", label: "left" },
      { from: "and", to: "price", label: "right" },
    ],
    steps: [
      {
        title: "Hard-coded predicate",
        blurb: "The alert service ifs on ticker and price. A trader's new rule is a code change. Combinations multiply the branches.",
        call: "if (ticker && price)",
        note: "Grammar is buried in control flow.",
        kind: "problem",
        from: "client",
        to: "and",
      },
      {
        title: "Evaluate the root",
        blurb: "The rule is a tree built earlier: And(TickerIs('AAPL'), PriceGt(100)). Alerts only calls interpret(row).",
        call: "interpret(row)",
        note: "Sentence = object tree. Context = the market row.",
        kind: "call",
        from: "client",
        to: "and",
      },
      {
        title: "Left terminal",
        blurb: "And asks its left child. TickerIs compares the row's ticker to AAPL and returns true. Leaves do not recurse.",
        call: "interpret → true",
        note: "Terminal expression.",
        kind: "call",
        from: "and",
        to: "ticker",
        updates: [{ id: "ticker", lines: ["symbol: AAPL", "match: true"] }],
      },
      {
        title: "Right terminal",
        blurb: "PriceGt checks 120 > 100. A new comparison (volume greater than) would be a new terminal class, then available to every And and Or.",
        call: "interpret → true",
        note: "Extend the grammar by adding a class.",
        kind: "call",
        from: "and",
        to: "price",
        updates: [{ id: "price", lines: ["min: 100", "match: true"] }],
      },
      {
        title: "Nonterminal combines",
        blurb: "And returns true && true. Or would be a sibling class with the same interface. The client never grows a switch.",
        call: "return true",
        note: "Nonterminal = composite expression.",
        kind: "return",
        from: "and",
        to: "client",
        updates: [{ id: "and", lines: ["left: true", "right: true", "result: true"] }],
      },
    ],
    snippet: `interface Expr { interpret(row: Row): boolean }

class TickerIs implements Expr {
  constructor(private symbol: string) {}
  interpret(row: Row) { return row.ticker === this.symbol }
}

class And implements Expr {
  constructor(private left: Expr, private right: Expr) {}
  interpret(row: Row) {
    return this.left.interpret(row) && this.right.interpret(row)
  }
}`,
  },
];
