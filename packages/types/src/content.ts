import { SkillCheck, Character } from "./game"

export type Condition =
    | {
        type: "flag"
        flag: string
        value: boolean
      }
    | {
        type: "has_item"
        item: string
        value: boolean
      }
    | {
        type: "var"
        name: string
        op: "==" | "!=" | ">=" | "<=" | ">" | "<"
        value: number
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
    | {
        type: "set_flag"
        flag: string
        value: boolean
    }
    | {
        type: "remove_flag"
        flag: string
    }
    | {
        type: "set_var"
        name: string
        value: number
    }
    | {
        type: "inc_var"
        name: string
        delta: number
    }
    | {
        type: "add_item"
        item: string
    }
    | {
        type: "remove_item"
        item: string
    }

export type Action = {
    id: string
    label?: string
    /**
     * Narrative text that is emitted when this action is resolved.
     */
    text?: string
    /**
     * Conditions to make this action available (hidden if not satisfied).
     * All conditions must pass.
     */
    availableWhen?: Condition[]
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
    /**
     * Actions available from any scene (subject to `availableWhen`).
     */
    globalActions?: Action[]
}
