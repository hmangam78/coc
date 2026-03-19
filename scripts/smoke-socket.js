#!/usr/bin/env node

const { io } = require("socket.io-client")

function parseArgs(argv) {
  const args = {
    url: "http://localhost:3000",
    scenario: "test",
    action: "enter_house",
    players: 2,
    timeoutMs: 8000,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--url") args.url = String(argv[++i] ?? "")
    else if (a === "--scenario") args.scenario = String(argv[++i] ?? "")
    else if (a === "--action") args.action = String(argv[++i] ?? "")
    else if (a === "--players") args.players = Number(argv[++i] ?? 2)
    else if (a === "--timeout") args.timeoutMs = Number(argv[++i] ?? 8000)
    else if (a === "--help" || a === "-h") {
      printHelp()
      process.exit(0)
    }
  }

  if (!args.url) throw new Error("Missing --url")
  if (!args.scenario) throw new Error("Missing --scenario")
  if (!args.action) throw new Error("Missing --action")
  if (!Number.isFinite(args.players) || args.players < 1 || args.players > 4) {
    throw new Error("--players must be 1..4")
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1000) {
    throw new Error("--timeout must be >= 1000")
  }

  return args
}

function printHelp() {
  console.log(`
Usage:
  node scripts/smoke-socket.js [--url http://localhost:3000] [--scenario test] [--action enter_house] [--players 2] [--timeout 8000]

Example:
  node scripts/smoke-socket.js --scenario test --action enter_house --players 2
`.trim())
}

async function createSession(baseUrl, scenarioId) {
  const res = await fetch(`${baseUrl}/game/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload?.message ?? `HTTP ${res.status}`)
  }
  if (!payload?.sessionId) throw new Error("Missing sessionId in response")
  return payload.sessionId
}

function onceWithTimeout(emitter, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for '${eventName}'`))
    }, timeoutMs)

    function handler(payload) {
      cleanup()
      resolve(payload)
    }

    function cleanup() {
      clearTimeout(t)
      emitter.off(eventName, handler)
    }

    emitter.on(eventName, handler)
  })
}

function join(client, sessionId, playerToken, timeoutMs) {
  return new Promise((resolve, reject) => {
    client
      .timeout(timeoutMs)
      .emit("join", { sessionId, playerToken }, (err, response) => {
        if (err) return reject(new Error(err?.message ?? String(err)))
        resolve(response)
      })
  })
}

function action(client, sessionId, playerToken, actionId, timeoutMs) {
  return new Promise((resolve, reject) => {
    client
      .timeout(timeoutMs)
      .emit("action", { sessionId, playerToken, actionId }, (err, response) => {
        if (err) return reject(new Error(err?.message ?? String(err)))
        resolve(response)
      })
  })
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(`[smoke] url=${args.url} scenario=${args.scenario} action=${args.action} players=${args.players}`)

  const sessionId = await createSession(args.url, args.scenario)
  console.log(`[smoke] sessionId=${sessionId}`)

  const clients = []
  try {
    for (let idx = 0; idx < args.players; idx++) {
      const client = io(args.url, { transports: ["websocket"] })
      clients.push(client)

      await onceWithTimeout(client, "connect", args.timeoutMs)
      console.log(`[smoke] client${idx + 1} connected`)

      client.on("events", (payload) => {
        const types = Array.isArray(payload?.events)
          ? payload.events.map((e) => e?.type).filter(Boolean)
          : []
        console.log(`[events client${idx + 1}] seq=${payload?.seq ?? "?"} types=${types.join(",")}`)
      })

      client.on("state_update", (payload) => {
        console.log(`[state_update client${idx + 1}] scene=${payload?.scene?.id ?? "?"}`)
      })

      client.on("connect_error", (err) => {
        console.error(`[smoke] client${idx + 1} connect_error:`, err?.message ?? String(err))
      })
    }

    const joinResponses = []
    for (let idx = 0; idx < clients.length; idx++) {
      const resp = await join(clients[idx], sessionId, undefined, args.timeoutMs)
      joinResponses.push(resp)
      console.log(
        `[smoke] client${idx + 1} joined playerId=${resp?.playerId} characterId=${resp?.characterId} scene=${resp?.scene?.id}`,
      )
    }

    const actorIndex = Math.min(1, clients.length - 1)
    const actor = joinResponses[actorIndex]
    if (!actor?.playerToken) throw new Error("Missing playerToken from join response")

    console.log(`[smoke] sending action '${args.action}' from client${actorIndex + 1}`)

    await action(
      clients[actorIndex],
      sessionId,
      actor.playerToken,
      args.action,
      args.timeoutMs,
    )

    // Give the server a moment to broadcast state_update + events to both clients.
    await new Promise((r) => setTimeout(r, 500))

    console.log("[smoke] ok")
  } finally {
    for (const c of clients) {
      try {
        c.disconnect()
      } catch {
        // ignore
      }
    }
  }
}

main().catch((err) => {
  console.error("[smoke] failed:", err?.message ?? String(err))
  process.exit(1)
})

