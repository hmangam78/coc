import { z } from "zod"
import type { Condition, Effect } from "@coc/types"

export const ConditionSchema: z.ZodType<Condition> = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("flag"),
        flag: z.string().min(1),
        value: z.boolean()
    }),
    z.object({
        type: z.literal("roll_success")
    }),
    z.object({
        type: z.literal("roll_failure")
    })
])

export const EffectSchema: z.ZodType<Effect> = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("add_flag"),
        flag: z.string().min(1)
    })
])
