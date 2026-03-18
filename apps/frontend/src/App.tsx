import { useEffect, useState } from "react"
import { socket } from "./socket"
import type { GameState, View } from "./types"

const SESSION_ID = "00e8877f-bc5e-4b45-b7f8-094d1e107ee4"

function App() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [playerToken, setPlayerToken] = useState<string | null>(null)
  const [characterId, setCharacterId] = useState<string | null>(null)
  const [state, setState] = useState<GameState | null>(null)
  const [view, setView] = useState<View | null>(null)

  // 🔹 conectar y hacer join
  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected")

      socket.emit("join", { sessionId: SESSION_ID }, (response: any) => {
        console.log("JOIN RESPONSE", response)

        setPlayerId(response.playerId)
        setPlayerToken(response.playerToken)
        setCharacterId(response.characterId)
        setState(response.state)
        setView(response)
      })
    })

    socket.on("state_update", (newView) => {
      setView(newView)
      setState(newView.state)
    })

    return () => {
      socket.off("connect")
      socket.off("state_update")
    }
  }, [])

  // 🔹 ejecutar acción
  const handleAction = (actionId: string) => {
    if (!playerToken) return

    socket.emit("action", {
      sessionId: SESSION_ID,
      actionId,
      playerToken
    })
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Call of Cthulhu - Test UI</h1>

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

      <h2>Estado</h2>

      <pre>{JSON.stringify(state, null, 2)}</pre>

      <hr />

      <h2>Escena: {view?.scene.id}</h2>

      <h3>Acciones</h3>

      {view?.scene.actions.map(action => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
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
          <div>
            Result:{" "}
            {state.lastRoll.success ? "SUCCESS" : "FAILURE"}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
