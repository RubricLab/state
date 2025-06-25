# @rubriclab/state

A lightweight, real-time state management library for Next.js applications with WebSocket support.

## Get started

### Installation

```sh
bun add @rubriclab/state
```

> @rubriclab scope packages are not built, they are all raw TypeScript. If using in a Next.js app, make sure to transpile.

```ts next.config.ts
import type { NextConfig } from  'next'

export default {
	transpilePackages: ['@rubriclab/state']
} satisfies  NextConfig
```

> If using inside the monorepo (@rubric), simply add `{"@rubriclab/state": "*"}` to dependencies and then run `bun i`

### Define shape

To get started, define a few objects.

```ts
import { z } from 'zod'

export const schema = z.object({
  todos: z.record(z.string(), z.object({
    title: z.string(),
    completed: z.boolean()
  })).default({})
})
```

### Wrap your app in the provider

The provider handles fetching initial data for first-paint (SSR)

```tsx
import { RealtimeProvider } from '@rubriclab/state'

export default function Layout({ children }) {
  return (
    <RealtimeProvider websocketUrl="ws://localhost:3001">
      {children}
    </RealtimeProvider>
  )
}
```

### Create a hook

Pass your schema into the hook creator to get typesafe states.

```tsx
import { createLiveState } from '@rubriclab/state/client'

const { useLiveState } = createLiveState(schema)

export function MyComponent() {
  const [todos, setTodos] = useLiveState('todos')
  
  const addTodo = () => {
    setTodos(prev => ({
      ...prev,
      [crypto.randomUUID()]: { title: 'New todo', completed: false }
    }))
  }

  return (
    <div>
      <button onClick={addTodo} type="button">
        Add Todo
      </button>
      <ul>
        {Object.entries(todos).map(([id, todo]) => (
          <li key={id}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => 
                setTodos(prev => ({
                  ...prev,
                  [id]: { ...todo, completed: !todo.completed }
                }))
              }
            />
            {todo.title}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Use it as you would `useState`.

### Start the server

Run `bun run rubriclab-state-start` to start the server.

The server can be deployed eg. on Railway by setting this as the custom start command.

### Redis Persistence (Optional)

To enable state persistence across server restarts, set the `REDIS_URL` environment variable:

```sh
REDIS_URL=redis://localhost:6379 bun run rubriclab-state-start
```

When Redis is configured:
- State is automatically persisted to Redis on every update
- State is loaded from Redis when a channel is accessed
- State persists across server restarts and deployments
- Each channel's state is stored with the key pattern `state:{channelId}`

This is particularly useful for production deployments where you want state to survive server restarts.

### Test it

Open your Next.js app in two browser windows. Values should be synced between the two.

Try disabling JS in one browser:

`⌘+⇧+i` > `⌘+⇧+p` > `disable j...` > `⏎`

then refreshing - the page should still reflect fresh data.

## Features

- 🔄 Real-time state synchronization
- 🔒 Type-safe with Zod schemas
- 🚀 Built with Bun.js for performance
- ⚡️ Minimal API surface
- 🔌 WebSocket-based communication
- 💾 Optional Redis persistence for production deployments

## Development

Start the WebSocket server:

```sh
bun dev
```

## License

[MIT](/LICENSE)
