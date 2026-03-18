import { z } from "zod"
import type { Scene } from "@coc/types"
import { ActionSchema } from "./action.schema"

export const SceneSchema: z.ZodType<Scene> = z.object({
    id: z.string().min(1),
    actions: z.array(ActionSchema)
})
