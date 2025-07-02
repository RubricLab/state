#!/usr/bin/env bun

import { serve } from 'bun'
import { StateManager } from './state'
import type { Channel } from './types'
import { eventSchema, generateId, THIRTY_DAYS } from './utils'

const stateManager = new StateManager()

const server = serve<Channel, { '/': Response; '/**': Response }>({
	port: 3001,
	routes: {
		'/': async req => {
			const cookies = req.cookies
			const { searchParams } = new URL(req.url)
			const channelId = searchParams.get('channelId') || generateId()
			const state = await stateManager.get(channelId)

			cookies.set('channelId', channelId, {
				httpOnly: false,
				maxAge: THIRTY_DAYS,
				path: '/',
				sameSite: 'lax' as const,
				secure: false
			})

			const headers = new Headers({
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': '*',
				'Set-Cookie': cookies.toSetCookieHeaders().join('; ')
			})

			if (server.upgrade<Channel>(req, { data: { channelId }, headers }))
				return new Response('ok', { headers, status: 101 })

			return Response.json(state?.getAll(), { headers })
		},
		'/**': () => new Response('try /', { status: 404 })
	},
	websocket: {
		close(ws) {
			const { channelId } = ws.data
			ws.unsubscribe(channelId)
		},
		message: async (ws, message) => {
			const payload = JSON.parse(message.toString())
			const [key, value] = Object.entries(payload)[0] as [string, string]
			const { channelId } = ws.data
			const parsed = eventSchema.parse({ key, value })

			const state = await stateManager.get(channelId)
			if (!state) return

			const newVal = await state.set(parsed.key, parsed.value)

			ws.publish(channelId, JSON.stringify({ [key]: newVal }))
		},
		open(ws) {
			const { channelId } = ws.data
			ws.subscribe(channelId)
		},
		publishToSelf: false
	}
})

console.log(`Server running on port ${server.port}`)

process.on('SIGINT', async () => {
	console.log('Shutting down server...')
	await stateManager.close()
	process.exit(0)
})

process.on('SIGTERM', async () => {
	console.log('Shutting down server...')
	await stateManager.close()
	process.exit(0)
})
