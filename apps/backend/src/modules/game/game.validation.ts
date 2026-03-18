import { BadRequestException } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import { z } from "zod"

export const CreateSessionRequestSchema = z.object({
    scenarioId: z.string().min(1).optional()
})

export const JoinRequestSchema = z.object({
    sessionId: z.string().min(1),
    playerToken: z.string().min(1).optional()
})

export const ActionRequestSchema = z.object({
    sessionId: z.string().min(1),
    actionId: z.string().min(1),
    playerToken: z.string().min(1)
})

export const ActionRestRequestSchema = z.object({
    playerToken: z.string().min(1),
    actionId: z.string().min(1)
})

export function parseWs<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value)
    if (parsed.success) return parsed.data
    throw new WsException(`Invalid payload:\n${formatZodError(parsed.error)}`)
}

export function parseHttp<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value)
    if (parsed.success) return parsed.data
    throw new BadRequestException(formatZodError(parsed.error))
}

function formatZodError(error: z.ZodError) {
    return error.issues
        .map((issue) => {
            const p = issue.path.length ? issue.path.join(".") : "(root)"
            return `- ${p}: ${issue.message}`
        })
        .join("\n")
}

