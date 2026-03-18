import { z } from "zod"
import type { Scene } from "@coc/types"
import { ActionSchema } from "./action.schema"

export const SceneSchema: z.ZodType<Scene> = z.object({
    id: z.string().min(1),
    text: z.string().min(1).optional(),
    actions: z.array(ActionSchema)
})
