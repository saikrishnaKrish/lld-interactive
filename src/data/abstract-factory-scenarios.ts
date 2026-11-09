import type { ComplexityImpact, Pattern, Scenario } from "./types";

const cloudImpact: ComplexityImpact = {
  timeOrScaleMetric: {
    antiPattern: "O(N) resource constructions, each new picking its own cloud",
    withPattern: "O(1): provisionStack() stays the same for a new provider",
  },
  coupling: {
    antiPattern: "The provisioner imports EC2, S3, Compute Engine, and GCS",
    withPattern: "The provisioner imports only CloudResourceFactory",
  },
  blastRadius: {
    filesModifiedToAddVariant: "The provisioner, for every cloud (high risk) vs 1 new factory file (the AWS kit untouched)",
  },
  keyWin: "Adding GCP never pairs an EC2 instance with a GCS bucket.",
};

const exporterImpact: ComplexityImpact = {
  timeOrScaleMetric: {
    antiPattern: "O(N) part constructions that mix PDF and Markdown",
    withPattern: "O(1): generate() stays the same for a new format",
  },
  coupling: {
    antiPattern: "The generator imports PDFHeader, PDFTable, MarkdownHeader, and MarkdownTable",
    withPattern: "The generator imports only DocumentFactory",
  },
  blastRadius: {
    filesModifiedToAddVariant: "The generator, for every format (high risk) vs 1 new document factory (PDF untouched)",
  },
  keyWin: "A Markdown export cannot attach a PDF table.",
};

const cloud: Scenario = {
  id: "cloud-kit",
  label: "Multi-Cloud Resource Kit",
  shortLabel: "Cloud",
  domain: "Cloud",
  prompt:
    "A stack needs compute and storage from the same provider. An EC2 instance paired with a GCS bucket will not provision.",
  participants: [
    { role: "Client", does: "InfrastructureProvisioner calls provisionStack() and never names EC2, S3, Compute Engine, or GCS." },
    { role: "Abstract factory", does: "CloudResourceFactory declares createCompute() and createBucket()." },
    { role: "Concrete factory", does: "AWSFactory returns EC2Instance plus S3Bucket. GCPFactory returns ComputeEngine plus GCSBucket." },
    { role: "Product", does: "ComputeInstance and StorageBucket. Each factory keeps the pair on one cloud." },
  ],
  complexityImpact: cloudImpact,
  objects: [
    { id: "provisioner", name: "InfrastructureProvisioner", stereotype: "client", x: 16, y: 48, lines: ["provisionStack()", "never: new EC2"] },
    { id: "factory", name: "CloudResourceFactory", stereotype: "abstract factory", x: 50, y: 46, lines: ["createCompute()", "createBucket()"] },
    { id: "compute", name: "ComputeInstance", stereotype: "product", x: 82, y: 28, lines: ["EC2Instance", "start()"] },
    { id: "bucket", name: "StorageBucket", stereotype: "product", x: 82, y: 72, lines: ["S3Bucket", "put()"] },
  ],
  links: [
    { from: "provisioner", to: "factory", label: "uses" },
    { from: "factory", to: "compute", label: "creates", dashed: true },
    { from: "factory", to: "bucket", label: "creates", dashed: true },
  ],
  steps: [
    {
      title: "Mixed providers",
      blurb: "The provisioner constructs resources one by one. Nothing stops EC2 from sitting next to a GCS bucket.",
      call: "new GCSBucket()",
      note: "Each new picks its own cloud. The family invariant is unenforced.",
      kind: "problem",
      from: "provisioner",
      to: "bucket",
      updates: [
        { id: "compute", lines: ["EC2Instance", "start()"] },
        { id: "bucket", lines: ["GCSBucket", "put()"] },
      ],
    },
    {
      title: "Provision the stack",
      blurb: "InfrastructureProvisioner calls provisionStack() and hands the work to one CloudResourceFactory.",
      call: "provisionStack()",
      note: "AWSFactory stands for the whole provider kit.",
      kind: "call",
      from: "provisioner",
      to: "factory",
      updates: [{ id: "factory", lines: ["kit: AWSFactory", "createCompute()", "createBucket()"] }],
    },
    {
      title: "Matched compute",
      blurb: "The factory builds compute for its own cloud.",
      call: "createCompute()",
      note: "AWSFactory returns EC2Instance.",
      kind: "create",
      from: "factory",
      to: "compute",
      updates: [{ id: "compute", lines: ["EC2Instance", "start()"] }],
    },
    {
      title: "Matched storage",
      blurb: "The same factory builds the bucket. Compute and storage now share a provider because they share a factory.",
      call: "createBucket()",
      note: "AWSFactory returns S3Bucket.",
      kind: "create",
      from: "factory",
      to: "bucket",
      updates: [{ id: "bucket", lines: ["S3Bucket", "put()"] }],
    },
    {
      title: "Swap the cloud",
      blurb: "Replacing AWSFactory with GCPFactory rebuilds the stack. provisionStack() does not change.",
      call: "provisionStack()",
      note: "ComputeEngine and GCSBucket arrive together.",
      kind: "note",
      from: "provisioner",
      to: "factory",
      updates: [
        { id: "factory", lines: ["kit: GCPFactory", "createCompute()", "createBucket()"] },
        { id: "compute", lines: ["ComputeEngine", "start()"] },
        { id: "bucket", lines: ["GCSBucket", "put()"] },
      ],
    },
  ],
  snippet: `interface CloudResourceFactory {
  createCompute(): ComputeInstance
  createBucket(): StorageBucket
}

class AWSFactory implements CloudResourceFactory {
  createCompute() { return new EC2Instance() }
  createBucket() { return new S3Bucket() }
}

class GCPFactory implements CloudResourceFactory {
  createCompute() { return new ComputeEngine() }
  createBucket() { return new GCSBucket() }
}

class InfrastructureProvisioner {
  provisionStack(cloud: CloudResourceFactory) {
    const compute = cloud.createCompute()
    const bucket = cloud.createBucket()
    compute.start()
    bucket.put("assets")
  }
}`,
};

const exporter: Scenario = {
  id: "exporter",
  label: "Document Exporter",
  shortLabel: "Exporter",
  domain: "Backend",
  prompt:
    "A report is entirely PDF or entirely Markdown. A PDF header above a Markdown table is a broken export.",
  participants: [
    { role: "Client", does: "ReportGenerator calls generate() and never names PDF or Markdown classes." },
    { role: "Abstract factory", does: "DocumentFactory declares createHeader() and createTable()." },
    { role: "Concrete factory", does: "PDFDocumentFactory returns PDFHeader plus PDFTable. MarkdownDocumentFactory returns MarkdownHeader plus MarkdownTable." },
    { role: "Product", does: "DocHeader and DocTable. Each factory keeps the pair in one format." },
  ],
  complexityImpact: exporterImpact,
  objects: [
    { id: "generator", name: "ReportGenerator", stereotype: "client", x: 16, y: 48, lines: ["generate()", "never: new PDF"] },
    { id: "factory", name: "DocumentFactory", stereotype: "abstract factory", x: 50, y: 46, lines: ["createHeader()", "createTable()"] },
    { id: "header", name: "DocHeader", stereotype: "product", x: 82, y: 28, lines: ["PDFHeader", "render()"] },
    { id: "table", name: "DocTable", stereotype: "product", x: 82, y: 72, lines: ["PDFTable", "render()"] },
  ],
  links: [
    { from: "generator", to: "factory", label: "uses" },
    { from: "factory", to: "header", label: "creates", dashed: true },
    { from: "factory", to: "table", label: "creates", dashed: true },
  ],
  steps: [
    {
      title: "Mixed formats",
      blurb: "The generator constructs parts one by one. Nothing stops a PDF header from sitting on a Markdown table.",
      call: "new MarkdownTable()",
      note: "Each new picks its own format. The family invariant is unenforced.",
      kind: "problem",
      from: "generator",
      to: "table",
      updates: [
        { id: "header", lines: ["PDFHeader", "render()"] },
        { id: "table", lines: ["MarkdownTable", "render()"] },
      ],
    },
    {
      title: "Generate the report",
      blurb: "ReportGenerator calls generate() and hands the work to one DocumentFactory.",
      call: "generate()",
      note: "PDFDocumentFactory stands for the whole export kit.",
      kind: "call",
      from: "generator",
      to: "factory",
      updates: [{ id: "factory", lines: ["kit: PDFFactory", "createHeader()", "createTable()"] }],
    },
    {
      title: "Matched header",
      blurb: "The factory builds a header in its own format.",
      call: "createHeader()",
      note: "PDFDocumentFactory returns PDFHeader.",
      kind: "create",
      from: "factory",
      to: "header",
      updates: [{ id: "header", lines: ["PDFHeader", "render()"] }],
    },
    {
      title: "Matched table",
      blurb: "The same factory builds the table. Header and table now share a format because they share a factory.",
      call: "createTable()",
      note: "PDFDocumentFactory returns PDFTable.",
      kind: "create",
      from: "factory",
      to: "table",
      updates: [{ id: "table", lines: ["PDFTable", "render()"] }],
    },
    {
      title: "Swap the format",
      blurb: "Replacing PDFDocumentFactory with MarkdownDocumentFactory rebuilds the report. generate() does not change.",
      call: "generate()",
      note: "MarkdownHeader and MarkdownTable arrive together.",
      kind: "note",
      from: "generator",
      to: "factory",
      updates: [
        { id: "factory", lines: ["kit: Markdown", "createHeader()", "createTable()"] },
        { id: "header", lines: ["MarkdownHeader", "render()"] },
        { id: "table", lines: ["MarkdownTable", "render()"] },
      ],
    },
  ],
  snippet: `interface DocumentFactory {
  createHeader(): DocHeader
  createTable(): DocTable
}

class PDFDocumentFactory implements DocumentFactory {
  createHeader() { return new PDFHeader() }
  createTable() { return new PDFTable() }
}

class MarkdownDocumentFactory implements DocumentFactory {
  createHeader() { return new MarkdownHeader() }
  createTable() { return new MarkdownTable() }
}

class ReportGenerator {
  generate(docs: DocumentFactory) {
    const header = docs.createHeader()
    const table = docs.createTable()
    return header.render() + table.render()
  }
}`,
};

export function abstractFactoryScenarios(pattern: Pattern): Scenario[] {
  return [
    {
      id: "ui-kit",
      label: "Classic UI Kit",
      shortLabel: "UI Kit",
      domain: "Interface",
      participants: pattern.participants,
      prompt: pattern.prompt,
      objects: pattern.objects,
      links: pattern.links,
      steps: pattern.steps,
      snippet: pattern.snippet,
    },
    cloud,
    exporter,
  ];
}
