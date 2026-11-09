import type { ComplexityImpact, Pattern, Scenario } from "./types";

const paymentImpact: ComplexityImpact = {
  timeOrScaleMetric: {
    antiPattern: "O(N) switch edits in every checkout that names Stripe",
    withPattern: "O(1): CheckoutService still calls processOrder()",
  },
  coupling: {
    antiPattern: "Checkout imports StripeGateway and RazorpayGateway",
    withPattern: "Checkout imports only PaymentProcessor",
  },
  blastRadius: {
    filesModifiedToAddVariant: "3–5 call sites (high risk) vs 1 new processor file (zero risk to Stripe)",
  },
  keyWin: "Adding Razorpay never risks breaking existing Stripe logic.",
};

const storageImpact: ComplexityImpact = {
  timeOrScaleMetric: {
    antiPattern: "O(N) upload sites that construct S3Driver by name",
    withPattern: "O(1): MediaUploadService still calls uploadFile()",
  },
  coupling: {
    antiPattern: "The upload service imports S3Driver and LocalDiskDriver",
    withPattern: "The upload service imports only StorageManager",
  },
  blastRadius: {
    filesModifiedToAddVariant: "Every environment branch (high risk) vs 1 new manager subclass (the S3 path untouched)",
  },
  keyWin: "A local-disk driver never risks the production S3 path.",
};

const payment: Scenario = {
  id: "payments",
  label: "Payment Gateway",
  shortLabel: "Payments",
  domain: "Backend",
  prompt:
    "Checkout must charge a card today through Stripe and tomorrow through Razorpay. The order workflow stays the same; only the gateway changes.",
  participants: [
    { role: "Client", does: "CheckoutService starts processOrder() and never names Stripe or Razorpay." },
    { role: "Creator", does: "PaymentProcessor declares createGateway() and owns the charge workflow." },
    { role: "Concrete creator", does: "StripeProcessor and RazorpayProcessor each return their own gateway." },
    { role: "Product", does: "PaymentGateway exposes charge(amount). The processor programs only against that." },
  ],
  complexityImpact: paymentImpact,
  objects: [
    { id: "checkout", name: "CheckoutService", stereotype: "client", x: 18, y: 48, lines: ["processOrder()", "never: new Gateway"] },
    { id: "processor", name: "PaymentProcessor", stereotype: "creator", x: 50, y: 42, lines: ["processOrder()", "createGateway()"] },
    { id: "stripe", name: "StripeGateway", stereotype: "product", x: 82, y: 26, lines: ["charge(amount)", "provider: stripe"] },
    { id: "razor", name: "RazorpayGateway", stereotype: "product", x: 82, y: 72, lines: ["charge(amount)", "provider: razorpay"] },
  ],
  links: [
    { from: "checkout", to: "processor", label: "uses" },
    { from: "processor", to: "stripe", label: "creates", dashed: true },
    { from: "processor", to: "razor", label: "creates", dashed: true },
  ],
  steps: [
    {
      title: "Hard-wired gateway",
      blurb: "Checkout constructs Stripe by name. India cannot reuse this method without an edit.",
      call: "new StripeGateway()",
      note: "Concrete new inside the caller. Every provider forks this line.",
      kind: "problem",
      from: "checkout",
      to: "stripe",
    },
    {
      title: "Processor owns the flow",
      blurb: "Checkout only calls processOrder(). Choosing a provider is no longer the caller's job.",
      call: "processOrder()",
      note: "Shared charge workflow moves into the creator.",
      kind: "call",
      from: "checkout",
      to: "processor",
    },
    {
      title: "Factory method",
      blurb: "PaymentProcessor asks createGateway() for a gateway, then charges whatever comes back.",
      call: "createGateway()",
      note: "StripeProcessor overrides and returns StripeGateway.",
      kind: "create",
      from: "processor",
      to: "stripe",
      updates: [{ id: "processor", lines: ["subclass: Stripe", "product: StripeGateway"] }],
    },
    {
      title: "Swap the provider",
      blurb: "RazorpayProcessor overrides the same method. processOrder() is untouched.",
      call: "createGateway()",
      note: "A new creator subclass, not a new switch in Checkout.",
      kind: "create",
      from: "processor",
      to: "razor",
      reveal: ["razor"],
      updates: [{ id: "processor", lines: ["subclass: Razorpay", "product: RazorpayGateway"] }],
    },
    {
      title: "Charge through the product",
      blurb: "The processor calls charge(amount) on the PaymentGateway interface. Checkout still does not know the provider.",
      call: "charge(amount)",
      note: "Dependency points at the processor, not at Stripe.",
      kind: "call",
      from: "processor",
      to: "stripe",
    },
  ],
  snippet: `interface PaymentGateway { charge(amount: number): string }

abstract class PaymentProcessor {
  protected abstract createGateway(): PaymentGateway
  processOrder(amount: number): string {
    const gateway = this.createGateway()
    return gateway.charge(amount)
  }
}

class RazorpayProcessor extends PaymentProcessor {
  protected createGateway(): PaymentGateway {
    return new RazorpayGateway()
  }
}`,
};

const storage: Scenario = {
  id: "storage",
  label: "Storage Dispatcher",
  shortLabel: "Storage",
  domain: "Cloud",
  prompt:
    "Uploads persist to S3 in production and to local disk in development. The upload workflow is shared; only the driver changes.",
  participants: [
    { role: "Client", does: "MediaUploadService calls uploadFile() and never names a disk or a bucket." },
    { role: "Creator", does: "StorageManager declares createDriver() and owns the persist workflow." },
    { role: "Concrete creator", does: "S3StorageManager and LocalStorageManager each return their own driver." },
    { role: "Product", does: "StorageDriver exposes persist(bytes). The manager programs only against that." },
  ],
  complexityImpact: storageImpact,
  objects: [
    { id: "media", name: "MediaUploadService", stereotype: "client", x: 18, y: 48, lines: ["uploadFile()", "never: new Driver"] },
    { id: "manager", name: "StorageManager", stereotype: "creator", x: 50, y: 42, lines: ["uploadFile()", "createDriver()"] },
    { id: "s3", name: "S3Driver", stereotype: "product", x: 82, y: 26, lines: ["persist(bytes)", "target: bucket"] },
    { id: "disk", name: "LocalDiskDriver", stereotype: "product", x: 82, y: 72, lines: ["persist(bytes)", "target: disk"] },
  ],
  links: [
    { from: "media", to: "manager", label: "uses" },
    { from: "manager", to: "s3", label: "creates", dashed: true },
    { from: "manager", to: "disk", label: "creates", dashed: true },
  ],
  steps: [
    {
      title: "Hard-wired driver",
      blurb: "The upload service constructs S3 by name. A laptop build cannot reuse this path without an edit.",
      call: "new S3Driver()",
      note: "Concrete new inside the caller. Every environment forks this line.",
      kind: "problem",
      from: "media",
      to: "s3",
    },
    {
      title: "Manager owns the flow",
      blurb: "MediaUploadService only calls uploadFile(). Choosing storage is no longer the caller's job.",
      call: "uploadFile()",
      note: "Shared persist workflow moves into the creator.",
      kind: "call",
      from: "media",
      to: "manager",
    },
    {
      title: "Factory method",
      blurb: "StorageManager asks createDriver() for a driver, then persists whatever comes back.",
      call: "createDriver()",
      note: "S3StorageManager overrides and returns S3Driver.",
      kind: "create",
      from: "manager",
      to: "s3",
      updates: [{ id: "manager", lines: ["subclass: S3", "product: S3Driver"] }],
    },
    {
      title: "Swap the environment",
      blurb: "LocalStorageManager overrides the same method. uploadFile() is untouched.",
      call: "createDriver()",
      note: "A new creator subclass, not a new switch in the upload service.",
      kind: "create",
      from: "manager",
      to: "disk",
      reveal: ["disk"],
      updates: [{ id: "manager", lines: ["subclass: Local", "product: LocalDiskDriver"] }],
    },
    {
      title: "Persist through the product",
      blurb: "The manager calls persist(bytes) on the StorageDriver interface. The upload service still does not know the target.",
      call: "persist(bytes)",
      note: "Dependency points at the manager, not at the bucket.",
      kind: "call",
      from: "manager",
      to: "s3",
    },
  ],
  snippet: `interface StorageDriver { persist(bytes: Uint8Array): string }

abstract class StorageManager {
  protected abstract createDriver(): StorageDriver
  uploadFile(bytes: Uint8Array): string {
    const driver = this.createDriver()
    return driver.persist(bytes)
  }
}

class LocalStorageManager extends StorageManager {
  protected createDriver(): StorageDriver {
    return new LocalDiskDriver()
  }
}`,
};

export function factoryScenarios(pattern: Pattern): Scenario[] {
  return [
    {
      id: "classic-ui",
      label: "Classic UI",
      shortLabel: "Classic UI",
      domain: "Interface",
      participants: pattern.participants,
      prompt: pattern.prompt,
      objects: pattern.objects,
      links: pattern.links,
      steps: pattern.steps,
      snippet: pattern.snippet,
    },
    payment,
    storage,
  ];
}
