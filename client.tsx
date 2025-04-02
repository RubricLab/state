'use client'

import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { z } from 'zod'

type GenericSchema = z.AnyZodObject

type RealtimeContextType<T extends GenericSchema = GenericSchema> = {
	getValue: <Key extends keyof z.infer<T>>(key: Key) => z.infer<T>[Key] | undefined
	setValue: <Key extends keyof z.infer<T>>(
		key: Key,
		updater: z.infer<T>[Key] | ((prev: z.infer<T>[Key] | undefined) => z.infer<T>[Key])
	) => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

let socket: WebSocket | null = null

type Subscriber<T extends GenericSchema = GenericSchema> = <Key extends keyof z.infer<T>>(
	key: Key,
	value: z.infer<T>[Key]
) => void

const subscribers = new Set<Subscriber>()

function createSocket<T extends z.AnyZodObject>({
	websocketUrl,
	eventSchema,
	channelId
}: { websocketUrl: string; eventSchema: T; channelId: string }) {
	socket = new WebSocket(`${websocketUrl.replace('http', 'ws')}?channelId=${channelId}`)

	socket.addEventListener('message', event => {
		const payload = JSON.parse(event.data)

		for (const [key, value] of Object.entries(payload)) {
			const parsed = eventSchema.parse({ key, value })
			for (const callback of subscribers) {
				callback(parsed.key, parsed.value)
			}
		}
	})
}

export function ProviderClient<T extends GenericSchema>({
	children,
	initialState,
	channelId,
	websocketUrl
}: {
	children: ReactNode
	initialState: z.infer<T>
	channelId: string
	websocketUrl: string
}) {
	const [state, setState] = useState<z.infer<T>>(initialState)

	const eventSchema = z.object({
		key: z.string(),
		value: z.any()
	})

	useEffect(() => {
		if (channelId && typeof document !== 'undefined') {
			const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toUTCString() // 30 days
			document.cookie = `channelId=${channelId}; path=/; secure; samesite=none; expires=${expiry}`
		}
	}, [channelId])

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (!socket) createSocket({ websocketUrl, eventSchema, channelId })

		function subscriber<Key extends keyof z.infer<T>>(key: Key, value: z.infer<T>[Key]) {
			setState(prev => ({ ...prev, [key]: value }))
		}

		subscribers.add(subscriber)

		return () => {
			subscribers.delete(subscriber)

			if (subscribers.size === 0 && socket) {
				socket.close()
				socket = null
			}
		}
	}, [])

	const getValue = <Key extends keyof z.infer<T>>(key: Key): z.infer<T>[Key] | undefined => {
		return state[key]
	}

	type Updater = (prev: T | undefined) => T

	const setValue = <Key extends keyof z.infer<T>>(key: Key, updater: z.infer<T>[Key] | Updater) => {
		setState(prev => {
			const newValue = typeof updater === 'function' ? (updater as Updater)(prev[key]) : updater
			return { ...prev, [key]: newValue }
		})
		const valueToSend = typeof updater === 'function' ? (updater as Updater)(state[key]) : updater
		socket?.send(JSON.stringify({ [key as string]: valueToSend }))
	}

	return (
		<RealtimeContext.Provider value={{ getValue, setValue }}>{children}</RealtimeContext.Provider>
	)
}

export const createLiveState = <T extends GenericSchema>(_: T) => {
	return {
		useLiveState: <Key extends keyof z.infer<T>>(key: Key) => {
			const context = useContext(RealtimeContext)

			if (!context) throw new Error('useLiveState must be used within a RealtimeProvider')

			return [context.getValue(key), value => context.setValue(key, value)] as [
				z.infer<T>[Key],
				(updater: z.infer<T>[Key] | ((prev: z.infer<T>[Key] | undefined) => z.infer<T>[Key])) => void
			]
		}
	}
}
