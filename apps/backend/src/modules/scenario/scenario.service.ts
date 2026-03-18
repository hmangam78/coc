import { Injectable } from "@nestjs/common"
import { BadRequestException } from "@nestjs/common"
import type { Scenario } from "@coc/types"
import { ScenarioSchema } from "schemas"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as fssync from "node:fs"
import { z } from "zod"

@Injectable()
export class ScenarioService {
    async listScenarios() {
        const dir = this.findScenarioDir()
        if (!dir) return []

        const entries = await fs.readdir(dir, { withFileTypes: true })
        const scenarios: { id: string; valid: boolean; error?: string }[] = []

        for (const entry of entries) {
            if (!entry.isFile()) continue
            if (!entry.name.endsWith(".json")) continue

            const id = entry.name.replace(/\.json$/, "")
            if (!isValidScenarioId(id)) continue

            const filePath = path.resolve(dir, entry.name)
            const stat = await fs.stat(filePath)
            if (stat.size === 0) continue

            try {
                const file = await fs.readFile(filePath, "utf8")
                const raw = JSON.parse(file) as unknown
                const parsed = ScenarioSchema.safeParse(raw)
                if (!parsed.success) {
                    scenarios.push({
                        id,
                        valid: false,
                        error: formatZodError(parsed.error)
                    })
                } else {
                    scenarios.push({ id, valid: true })
                }
            } catch (err) {
                scenarios.push({ id, valid: false, error: stringifyError(err) })
            }
        }

        scenarios.sort((a, b) => a.id.localeCompare(b.id))
        return scenarios
    }

    async loadScenarioById(scenarioId: string): Promise<Scenario> {
        if (!isValidScenarioId(scenarioId)) {
            throw new BadRequestException(
                "Invalid scenarioId format (allowed: letters, numbers, _, -, optional .json)"
            )
        }
        const filePath = this.resolveScenarioPath(scenarioId)

        let raw: unknown
        try {
            const file = await fs.readFile(filePath, "utf8")
            raw = JSON.parse(file)
        } catch (err) {
            throw new BadRequestException(
                `Unable to read scenario '${scenarioId}': ${stringifyError(err)}`
            )
        }

        const parsed = ScenarioSchema.safeParse(raw)
        if (!parsed.success) {
            throw new BadRequestException(
                `Invalid scenario '${scenarioId}':\n${formatZodError(parsed.error)}`
            )
        }

        return parsed.data
    }

    private resolveScenarioPath(scenarioId: string) {
        const scenarioFileName = scenarioId.endsWith(".json")
            ? scenarioId
            : `${scenarioId}.json`

        const envDir = process.env.SCENARIOS_DIR
        const candidates = [
            envDir ? path.resolve(envDir) : null,
            path.resolve(process.cwd(), "scenarios"),
            path.resolve(process.cwd(), "..", "scenarios"),
            path.resolve(process.cwd(), "..", "..", "scenarios")
        ].filter(Boolean) as string[]

        for (const dir of candidates) {
            const filePath = path.resolve(dir, scenarioFileName)
            if (fssync.existsSync(filePath)) return filePath
        }

        // Default to first candidate for error message
        const assumedDir = candidates[0] ?? path.resolve(process.cwd(), "scenarios")
        return path.resolve(assumedDir, scenarioFileName)
    }

    private findScenarioDir() {
        const envDir = process.env.SCENARIOS_DIR
        const candidates = [
            envDir ? path.resolve(envDir) : null,
            path.resolve(process.cwd(), "scenarios"),
            path.resolve(process.cwd(), "..", "scenarios"),
            path.resolve(process.cwd(), "..", "..", "scenarios")
        ].filter(Boolean) as string[]

        for (const dir of candidates) {
            try {
                if (fssync.existsSync(dir) && fssync.statSync(dir).isDirectory()) {
                    return dir
                }
            } catch {
                // ignore
            }
        }
        return null
    }
}

function formatZodError(error: z.ZodError) {
    return error.issues
        .map((issue) => {
            const p = issue.path.length ? issue.path.join(".") : "(root)"
            return `- ${p}: ${issue.message}`
        })
        .join("\n")
}

function stringifyError(err: unknown) {
    if (err instanceof Error) return err.message
    try {
        return JSON.stringify(err)
    } catch {
        return String(err)
    }
}

function isValidScenarioId(scenarioId: string) {
    return /^[a-zA-Z0-9_-]+(\.json)?$/.test(scenarioId)
}
