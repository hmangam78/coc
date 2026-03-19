import { z } from "zod"
import type { Condition, Effect } from "@coc/types"

export const ConditionSchema: z.ZodType<Condition> = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("flag"),
        flag: z.string().min(1),
        value: z.boolean()
    }),
    z.object({
        type: z.literal("has_item"),
        item: z.string().min(1),
        value: z.boolean()
    }),
    z.object({
        type: z.literal("var"),
        name: z.string().min(1),
        op: z.enum(["==", "!=", ">=", "<=", ">", "<"]),
        value: z.number()
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
    }),
    z.object({
        type: z.literal("set_flag"),
        flag: z.string().min(1),
        value: z.boolean()
    }),
    z.object({
        type: z.literal("remove_flag"),
        flag: z.string().min(1)
    }),
    z.object({
        type: z.literal("set_var"),
        name: z.string().min(1),
        value: z.number()
    }),
    z.object({
        type: z.literal("inc_var"),
        name: z.string().min(1),
        delta: z.number()
    }),
    z.object({
        type: z.literal("add_item"),
        item: z.string().min(1)
    }),
    z.object({
        type: z.literal("remove_item"),
        item: z.string().min(1)
    })
])
