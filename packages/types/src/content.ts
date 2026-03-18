import { SkillCheck, Character } from "./game"

export type Condition =
    | {
        type: "flag"
        flag: string
        value: boolean
      }
    | {
        type: "roll_success"
      }
    | {
        type: "roll_failure"
      }

export type Effect =
    | {
        type: "add_flag"
        flag: string
    }

export type Action = {
    id: string
    label?: string
    /**
     * Narrative text that is emitted when this action is resolved.
     */
    text?: string
    effects?: Effect[]
    next?: {
        condition?: Condition
        sceneId: string
        /**
         * Narrative text emitted if this transition is taken.
         */
        text?: string
    }[]
    skillCheck?: SkillCheck
}

export type Scene = {
    id: string
    text?: string
    actions: Action[]
}

export type Scenario = {
    characters: Character[]
    scenes: Scene[]
}
