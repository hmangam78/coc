import { z } from "zod"
import type { Scenario, Character } from "@coc/types"
import { SceneSchema } from "./scene.schema"

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
        scenes: z.array(SceneSchema).min(1)
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

        for (const scene of scenario.scenes) {
            for (const action of scene.actions) {
                if (!action.next) continue
                for (const next of action.next) {
                    if (!sceneIds.has(next.sceneId)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Invalid next.sceneId '${next.sceneId}' referenced from scene '${scene.id}' action '${action.id}'`,
                            path: ["scenes"]
                        })
                    }
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
