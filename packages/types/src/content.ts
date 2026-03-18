export type Condition =
    | {
        type: "flag"
        flag: string
        value: boolean
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
}

export type Scene = {
    id: string
    actions: Action[]
}

export type Scenario = {
    scenes: Scene[]
}
