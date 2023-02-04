import { useEffect, useState } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import { invoke } from "@tauri-apps/api/tauri";
import "./app.css";
import { documentDir } from '@tauri-apps/api/path';
import { signal, effect, computed, useSignal, useSignalEffect, useComputed } from "@preact/signals";

type Actor = {
  name: string;
}

class ActorResolver {
  static async resolve(name: string): Promise<Actor> {
    return { name };
  }
}

export function App<FC>() {
  const name = useSignal("")
  const greetMsg = useSignal("")
  const actor = useSignal<Actor|undefined>(undefined)
  useSignalEffect(() => {
    Promise
    .all([name.value])
    .then(async ([actorName]) => {
      const resolved = await ActorResolver.resolve(actorName)
      actor.value = resolved
    })
  })
  const greet = async () => {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg.value = (await invoke("greet", { name: name.value }));
  };

  return (
    <div class="container">
      <h1>Welcome to Tauri!</h1>
      <div class="row">
        <a href="https://vitejs.dev" target="_blank">
          <img src="/vite.svg" class="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://preactjs.com" target="_blank">
          <img src={preactLogo} class="logo preact" alt="Preact logo" />
        </a>
      </div>

      <p>Click on the Tauri, Vite, and Preact logos to learn more.</p>

      {actor.value && <div>
        <pre>{JSON.stringify(actor.value, undefined, 2)}</pre>
      </div>}

      <div class="row">
        <div>
          <input
            id="greet-input"
            onChange={(e) => name.value = (e.currentTarget.value)}
            placeholder="Enter a name..."
          />
          <button type="button" onClick={() => greet()}>
            Greet
          </button>
        </div>
      </div>
      <p>{greetMsg}</p>
    </div>
  );
}
