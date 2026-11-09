import type { Pattern, Scenario } from "../types";
import {
  chainScenarios,
  commandScenarios,
  interpreterScenarios,
  iteratorScenarios,
  mediatorScenarios,
  mementoScenarios,
  observerScenarios,
  stateScenarios,
  strategyScenarios,
  templateScenarios,
  visitorScenarios,
} from "./behavioral";
import { builderScenarios, prototypeScenarios, singletonScenarios } from "./creational";
import {
  adapterScenarios,
  bridgeScenarios,
  compositeScenarios,
  decoratorScenarios,
  facadeScenarios,
  flyweightScenarios,
  proxyScenarios,
} from "./structural";

const builders: Record<string, (pattern: Pattern) => Scenario[]> = {
  builder: builderScenarios,
  prototype: () => prototypeScenarios(),
  singleton: () => singletonScenarios(),
  adapter: () => adapterScenarios(),
  bridge: bridgeScenarios,
  composite: compositeScenarios,
  decorator: decoratorScenarios,
  facade: () => facadeScenarios(),
  flyweight: () => flyweightScenarios(),
  proxy: proxyScenarios,
  "chain-of-responsibility": () => chainScenarios(),
  command: commandScenarios,
  iterator: iteratorScenarios,
  mediator: mediatorScenarios,
  memento: () => mementoScenarios(),
  observer: () => observerScenarios(),
  state: stateScenarios,
  strategy: strategyScenarios,
  "template-method": templateScenarios,
  visitor: () => visitorScenarios(),
  interpreter: () => interpreterScenarios(),
};

export function scenariosFor(pattern: Pattern): Scenario[] | undefined {
  return builders[pattern.id]?.(pattern);
}
