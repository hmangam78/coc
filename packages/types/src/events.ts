import type { Effect } from "./content"
import type { GameState, RollResult, SkillName } from "./game"

export type GameEvent =
    | {
          type: "action_resolved"
          actionId: string
          characterId: string
          sceneId: string
      }
    | {
          type: "roll_performed"
          characterId: string
          skill: SkillName
          difficulty: "normal" | "hard" | "extreme"
          result: RollResult
      }
    | {
          type: "narration"
          text: string
      }
    | {
          type: "effect_applied"
          effect: Effect
      }
    | {
          type: "scene_changed"
          fromSceneId: string
          toSceneId: string
          actionId: string
      }

export type DispatchResult = {
    state: GameState
    events: GameEvent[]
}
