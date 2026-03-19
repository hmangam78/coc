import { useEffect, useMemo, useState } from "react"
import { socket } from "./socket"
import type {
  CreateSessionResponseV1,
  EventsEnvelopeV1,
  JoinResponseV1,
  ListScenariosResponseV1,
  ScenarioListItemV1,
  StateUpdateV1,
  VisibleGameStateV1,
} from "@coc/protocol"

const API_BASE_URL = "http://localhost:3000"
const LAST_SESSION_ID_KEY = "coc:lastSessionId"

function tokenStorageKey(sessionId: string) {
  return `coc:playerToken:${sessionId}`
}

function App() {
  const [connected, setConnected] = useState<boolean>(socket.connected)

  const [scenarios, setScenarios] = useState<ScenarioListItemV1[]>([])
  const [scenariosError, setScenariosError] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [manualSessionId, setManualSessionId] = useState<string>("")

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleGameStateV1 | null>(null)
  const [view, setView] = useState<StateUpdateV1 | null>(null)
  const [events, setEvents] = useState<EventsEnvelopeV1[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validScenarios = useMemo(
    () => scenarios.filter((s) => s.valid),
    [scenarios],
  )

  // Load last session id + scenario list
  useEffect(() => {
    const lastSessionId = localStorage.getItem(LAST_SESSION_ID_KEY)
    if (lastSessionId) {
      setSessionId(lastSessionId)
      setManualSessionId(lastSessionId)
    }

    const abort = new AbortController()
    ;(async () => {
      try {
        setScenariosError(null)
        const res = await fetch(`${API_BASE_URL}/game/scenarios`, {
          signal: abort.signal,
        })
        const payload = (await res.json()) as ListScenariosResponseV1 & {
          message?: string
        }
        if (!res.ok) {
          throw new Error(payload?.message ?? `HTTP ${res.status}`)
        }
        setScenarios(payload?.scenarios ?? [])
      } catch (err: unknown) {
        if (abort.signal.aborted) return
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err)
        setScenariosError(message)
      }
    })()

    return () => abort.abort()
  }, [])

  // Socket listeners (once)
  useEffect(() => {
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onStateUpdate = (newView: StateUpdateV1) => {
      setView(newView)
      setState(newView.state)
      setBusy(false)
    }
    const onEvents = (payload: EventsEnvelopeV1) => {
      setEvents((prev) => [payload, ...prev].slice(0, 50))
    }
    const onConnectError = (err: unknown) => {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err)
      setError(message)
      setBusy(false)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("state_update", onStateUpdate)
    socket.on("events", onEvents)
    socket.on("connect_error", onConnectError)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("state_update", onStateUpdate)
      socket.off("events", onEvents)
      socket.off("connect_error", onConnectError)
    }
  }, [])

  const doJoin = (targetSessionId: string) => {
    if (!targetSessionId) return
    if (!socket.connected) {
      setError("Socket not connected")
      return
    }

    setBusy(true)
    setError(null)

    const storedToken = localStorage.getItem(tokenStorageKey(targetSessionId))

    socket
      .timeout(5000)
      .emit(
        "join",
        { sessionId: targetSessionId, playerToken: storedToken ?? undefined },
        (err: unknown, response: JoinResponseV1) => {
          if (err) {
            const message =
              err && typeof err === "object" && "message" in err
                ? String((err as { message: unknown }).message)
                : String(err)
            setError(message)
            setBusy(false)
            return
          }

          setSessionId(targetSessionId)
          setManualSessionId(targetSessionId)
          localStorage.setItem(LAST_SESSION_ID_KEY, targetSessionId)

          setPlayerId(response.playerId)
          setPlayerToken(response.playerToken)
          setCharacterId(response.characterId)
          setState(response.state)
          setView({ scene: response.scene, state: response.state })

          if (response?.playerToken) {
            localStorage.setItem(
              tokenStorageKey(targetSessionId),
              response.playerToken,
            )
          }

          setBusy(false)
        },
      )
  }

  const createSession = async (scenarioId: string) => {
    setBusy(true)
    setError(null)
    setEvents([])
    setPlayerId(null)
    setPlayerToken(null)
    setCharacterId(null)
    setState(null)
    setView(null)

    try {
      const res = await fetch(`${API_BASE_URL}/game/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      })
      const payload = (await res.json()) as CreateSessionResponseV1 & {
        message?: string
      }
      if (!res.ok) {
        throw new Error(payload?.message ?? `HTTP ${res.status}`)
      }

      const newSessionId = payload.sessionId as string
      if (!newSessionId) throw new Error("Missing sessionId")

      localStorage.setItem(LAST_SESSION_ID_KEY, newSessionId)
      setSessionId(newSessionId)
      setManualSessionId(newSessionId)

      doJoin(newSessionId)
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err)
      setError(message)
      setBusy(false)
    }
  }

  const handleAction = (actionId: string) => {
    if (!playerToken || !sessionId) return

    setBusy(true)
    socket.emit("action", {
      sessionId,
      actionId,
      playerToken,
    })
  }

  const narration = useMemo(() => {
    const messages: string[] = []
    for (const envelope of events) {
      const inner = envelope?.events
      if (!Array.isArray(inner)) continue
      for (const e of inner) {
        if (e?.type === "narration" && typeof e?.text === "string") {
          messages.push(e.text)
        }
      }
    }
    return messages.slice(0, 5)
  }, [events])

  return (
    <div style={{ padding: 20 }}>
      <h1>Call of Cthulhu - UI</h1>

      <div>
        <strong>Socket:</strong> {connected ? "connected" : "disconnected"}
        {busy ? " (busy)" : ""}
      </div>

      {error && (
        <div style={{ color: "crimson", marginTop: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <hr />

      <h2>Sesión</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {validScenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => createSession(s.id)}
            disabled={!connected || busy}
          >
            Create: {s.id}
          </button>
        ))}
      </div>

      {scenariosError && (
        <div style={{ marginTop: 8 }}>
          <strong>Scenarios error:</strong> {scenariosError}
        </div>
      )}

      {validScenarios.length === 0 && !scenariosError && (
        <div style={{ marginTop: 8 }}>
          No hay escenarios válidos disponibles.
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <label>
          <strong>SessionId:</strong>{" "}
          <input
            value={manualSessionId}
            onChange={(e) => setManualSessionId(e.target.value)}
            style={{ width: 360 }}
            placeholder="pega un sessionId existente o crea una sesión"
          />
        </label>{" "}
        <button
          onClick={() => doJoin(manualSessionId)}
          disabled={!connected || busy || !manualSessionId}
        >
          Join / Reconnect
        </button>
      </div>

      <div>
        <strong>Player:</strong> {playerId}
      </div>
      <div>
        <strong>Token:</strong> {playerToken}
      </div>

      <div>
        <strong>Character:</strong> {characterId}
      </div>

      <hr />

      <h2>Narrativa</h2>

      {view?.scene.text ? (
        <p style={{ marginBottom: 8 }}>{view.scene.text}</p>
      ) : (
        <p style={{ marginBottom: 8, opacity: 0.7 }}>
          (Sin texto en la escena)
        </p>
      )}

      {narration.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>Últimos mensajes:</strong>
          <ul style={{ marginTop: 6 }}>
            {narration.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      <h2>Estado (debug)</h2>

      <pre>{JSON.stringify(state, null, 2)}</pre>

      <hr />

      <h2>Escena: {view?.scene.id}</h2>

      <h3>Acciones</h3>

      {view?.scene.actions.map(action => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
          disabled={!playerToken || busy}
        >
          {action.label}
        </button>
      ))}

      <h2>Última tirada</h2>

      {state?.lastRoll && (
        <div>
          <div>Roll: {state.lastRoll.roll}</div>
          <div>Skill: {state.lastRoll.skill}</div>
          <div>Threshold: {state.lastRoll.threshold}</div>
          <div>Critical: {state.lastRoll.critical ? "yes" : "no"}</div>
          <div>Fumble: {state.lastRoll.fumble ? "yes" : "no"}</div>
          <div>
            Result:{" "}
            {state.lastRoll.success ? "SUCCESS" : "FAILURE"}
          </div>
        </div>
      )}

      <h2>Flags (debug)</h2>
      <ul>
        {state?.flags &&
          Object.entries(state.flags).map(([k, v]) => (
            <li key={k}>
              {k}: {String(v)}
            </li>
          ))}
      </ul>

      <h2>Vars (debug)</h2>
      <ul>
        {state?.vars &&
          Object.entries(state.vars).map(([k, v]) => (
            <li key={k}>
              {k}: {String(v)}
            </li>
          ))}
      </ul>

      <h2>Jugadores</h2>
      <ul>
        {state?.players?.map((p) => (
          <li key={p.playerId}>
            {p.playerId} → {p.characterId ?? "?"} ({p.connected ? "online" : "offline"})
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
