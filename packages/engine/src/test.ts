import scenarioJson from "../../../scenarios/test.json"
import { Scenario } from "@coc/types"
import { GameEngine } from "./engine"

const scenario = scenarioJson as Scenario

const engine = new GameEngine(scenario)

console.log("Initial", engine.getState())

engine.dispatch("inspect")

console.log("After action:", engine.getState())