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

```ts
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

```ts
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
}
```

Use it as you would `useState`.

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

## Development

Start the WebSocket server:

```sh
bun dev
```

## License

[MIT](/LICENSE)
