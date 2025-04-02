import { serve } from 'bun'
import { StateManager } from './state'
import type { Channel } from './types'
import { z } from 'zod'
import { generateId } from './utils'

const eventSchema = z.object({
	key: z.string(),
	value: z.any()
})

const stateManager = new StateManager()

const server = serve({
	port: 3001,
	routes: {
		'/': req => {
			const cookies = req.cookies
			const { searchParams } = new URL(req.url)
			const channelId = searchParams.get('channelId') || generateId()
			const state = stateManager.get(channelId)

			cookies.set('channelId', channelId, {
				httpOnly: false,
				secure: true,
				sameSite: 'none' as const,
				path: '/',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			})

			const headers = new Headers({
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Credentials': 'true',
				'Set-Cookie': cookies.toSetCookieHeaders().join('; ')
			})

			if (server.upgrade(req, { data: { channelId }, headers }))
				return new Response('ok', { status: 101, headers })

			return Response.json(state?.getAll(), { headers })
		},
		'/**': () => new Response('try /', { status: 404 })
	},
	websocket: {
		message: async (ws, message) => {
			const payload = JSON.parse(message.toString())
			const [key, value] = Object.entries(payload)[0] as [string, string]
			const { channelId } = ws.data as unknown as Channel
			const parsed = eventSchema.parse({ key, value })

			const state = stateManager.get(channelId)
			if (!state) return

			const newVal = await state.set(parsed.key, parsed.value)

			server.publish(channelId, JSON.stringify({ [key]: newVal }))
		},
		open(ws) {
			const { channelId } = ws.data as unknown as Channel
			ws.subscribe(channelId)

			const state = stateManager.get(channelId)
			if (!state) return

			ws.send(JSON.stringify(state.getAll()))
		},
		close(ws) {
			const { channelId } = ws.data as unknown as Channel
			ws.unsubscribe(channelId)
		}
	}
})

console.log(`Server running on port ${server.port}`)
