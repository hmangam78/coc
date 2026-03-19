import { z } from "zod"
import type { Scenario, Character } from "@coc/types"
import { SceneSchema } from "./scene.schema"
import { ActionSchema } from "./action.schema"

const CharacterSchema: z.ZodType<Character> = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    attributes: z.record(z.string(), z.number()).optional(),
    skills: z.record(z.string(), z.number()),
    inventory: z.array(z.string()).optional()
})

export const ScenarioSchema: z.ZodType<Scenario> = z
    .object({
        characters: z.array(CharacterSchema).min(1),
        scenes: z.array(SceneSchema).min(1),
        globalActions: z.array(ActionSchema).optional()
    })
    .superRefine((scenario, ctx) => {
        const sceneIds = new Set(scenario.scenes.map(s => s.id))
        const duplicateSceneIds = findDuplicates(scenario.scenes.map(s => s.id))
        for (const dup of duplicateSceneIds) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Duplicate scene id: ${dup}`,
                path: ["scenes"]
            })
        }

        const duplicateCharacterIds = findDuplicates(scenario.characters.map(c => c.id))
        for (const dup of duplicateCharacterIds) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Duplicate character id: ${dup}`,
                path: ["characters"]
            })
        }

        // Prevent global action id collisions with scene actions.
        const sceneActionIds = new Set<string>()
        for (const scene of scenario.scenes) {
            for (const action of scene.actions) sceneActionIds.add(action.id)
        }
        if (scenario.globalActions) {
            const duplicates = scenario.globalActions
                .map(a => a.id)
                .filter(id => sceneActionIds.has(id))
            for (const id of duplicates) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Global action id collides with scene action id: ${id}`,
                    path: ["globalActions"]
                })
            }
        }

        // Validate scene transitions in both scene actions and global actions.
        const actionsToCheck = [
            ...scenario.scenes.flatMap(s => s.actions.map(a => ({ sceneId: s.id, action: a }))),
            ...(scenario.globalActions ?? []).map(a => ({ sceneId: "(global)", action: a }))
        ]
        for (const entry of actionsToCheck) {
            const action = entry.action
            if (!action.next) continue
            for (const next of action.next) {
                if (!sceneIds.has(next.sceneId)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `Invalid next.sceneId '${next.sceneId}' referenced from scene '${entry.sceneId}' action '${action.id}'`,
                        path: entry.sceneId === "(global)" ? ["globalActions"] : ["scenes"]
                    })
                }
            }
        }
    })

function findDuplicates(values: string[]) {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const v of values) {
        if (seen.has(v)) duplicates.add(v)
        seen.add(v)
    }
    return [...duplicates]
}
