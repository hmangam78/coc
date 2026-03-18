import { SkillCheck } from "./game"

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
    effects?: Effect[]
    next?: {
        condition?: Condition
        sceneId: string
    }[]
    skillCheck?: SkillCheck
}

export type Scene = {
    id: string
    actions: Action[]
}

export type Scenario = {
    scenes: Scene[]
}
