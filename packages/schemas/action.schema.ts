import { z } from "zod"
import type { Action } from "@coc/types"
import { EffectSchema } from "./condition.schema"
import { ConditionSchema } from "./condition.schema"

export const SkillCheckSchema = z.object({
    skill: z.string().min(1),
    difficulty: z.enum(["normal", "hard", "extreme"]).optional()
})

export const NextSchema = z.object({
    sceneId: z.string().min(1),
    condition: ConditionSchema.optional()
})

export const ActionSchema: z.ZodType<Action> = z.object({
    id: z.string().min(1),
    effects: z.array(EffectSchema).optional(),
    next: z.array(NextSchema).optional(),
    skillCheck: SkillCheckSchema.optional()
})
