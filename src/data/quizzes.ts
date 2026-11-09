import type { PatternQuiz } from "./types";

const QUIZZES: Record<string, PatternQuiz[]> = {
  "factory-method": [
    {
      question:
        "Checkout charges cards through Stripe today. Next quarter the same order flow must charge through Razorpay in India. The steps after construction stay the same. Only the concrete class changes.",
      options: ["Strategy", "Factory Method", "Singleton"],
      correctAnswer: "Factory Method",
      explanation:
        "You already know how to charge. You do not know which gateway exists until a subclass supplies it, and the charge workflow stays in the creator. Strategy would fit if the charging steps themselves were different algorithms. Singleton only limits how many objects exist.",
    },
    {
      question:
        "A dialog renders the same way on Windows and on the web. App keeps calling render(). Only the button class changes per platform.",
      options: ["Factory Method", "Abstract Factory", "Prototype"],
      correctAnswer: "Factory Method",
      explanation:
        "One product type varies, and a subclass decides which button to construct. Abstract Factory would matter if the dialog also had to mint a matching checkbox and menu from the same kit. Prototype copies a button you already built. It does not choose a class by platform.",
    },
  ],
  "abstract-factory": [
    {
      question:
        "A screen must be entirely light or entirely dark. A light button next to a dark checkbox is a bug. Switching theme should swap the whole kit, not each widget one by one.",
      options: ["Factory Method", "Abstract Factory", "Builder"],
      correctAnswer: "Abstract Factory",
      explanation:
        "The widgets are a family that must agree. One factory returns both the button and the checkbox for a single theme. Factory Method picks one product. Builder assembles one object in steps. It does not keep two products from different families apart.",
    },
    {
      question:
        "A provisioner must create compute and storage from the same cloud. An EC2 instance paired with a GCS bucket will not deploy. Adding a cloud should not edit the provisioner.",
      options: ["Abstract Factory", "Builder", "Factory Method"],
      correctAnswer: "Abstract Factory",
      explanation:
        "Two products have to come from one kit. The AWS factory returns EC2 and S3 together. The GCP factory returns Compute Engine and GCS together. Builder would fit if you were filling in one stack object field by field. Factory Method would choose only the compute class and leave storage to chance.",
    },
  ],
  builder: [
    {
      question:
        "A monthly report may include a cover, any number of charts, and an optional footer. Callers want to read the recipe, not pass twelve nullable constructor arguments.",
      options: ["Builder", "Factory Method", "Abstract Factory"],
      correctAnswer: "Builder",
      explanation:
        "The product is one report assembled in steps, and some steps are optional. Factory Method returns a finished product in a single method, so the recipe disappears. Abstract Factory would matter if you also had to mint a matching family of other documents.",
    },
    {
      question:
        "A query collects a select list, optional filters, and a limit, in an order the caller can read. The finished statement should be immutable.",
      options: ["Builder", "Factory Method", "Prototype"],
      correctAnswer: "Builder",
      explanation:
        "Construction has ordered, optional steps, and then one finished statement. Factory Method would hide those steps inside a single create call. Prototype copies a query you already have. It does not assemble new clauses.",
    },
  ],
};

export function quizzesFor(patternId: string): PatternQuiz[] {
  return QUIZZES[patternId] ?? [];
}

export function quizFor(patternId: string): PatternQuiz | undefined {
  return QUIZZES[patternId]?.[0];
}
