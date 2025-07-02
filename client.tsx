'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { z } from 'zod/v4'
import { eventSchema, THIRTY_DAYS } from './utils'

type GenericSchema = z.ZodDefault<z.ZodObject<Record<string, z.ZodTypeAny>>>

type Updater<T extends GenericSchema = GenericSchema> = (
	prev: z.infer<T>[keyof z.infer<T>] | undefined
) => z.infer<T>[keyof z.infer<T>]

type RealtimeContextType<T extends GenericSchema = GenericSchema> = {
	getValue: <Key extends keyof z.infer<T>>(key: Key) => z.infer<T>[Key] | undefined
	setValue: <Key extends keyof z.infer<T>>(key: Key, updater: z.infer<T>[Key] | Updater<T>) => void
}

const RealtimeContext = createContext<RealtimeContextType | null>(null)

let socket: WebSocket | null = null

type Subscriber<T extends GenericSchema = GenericSchema> = <Key extends keyof z.infer<T>>(
	key: Key,
	value: z.infer<T>[Key]
) => void

const subscribers = new Set<Subscriber>()

function createSocket({ websocketUrl, channelId }: { websocketUrl: string; channelId: string }) {
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

	useEffect(() => {
		if (channelId && typeof document !== 'undefined') {
			const expiry = new Date(Date.now() + THIRTY_DAYS).toUTCString()
			// biome-ignore lint/suspicious/noDocumentCookie: not sure why we need this actually
			document.cookie = `channelId=${channelId}; path=/; secure; samesite=none; expires=${expiry}`
		}
	}, [channelId])

	// biome-ignore lint/correctness/useExhaustiveDependencies: we need to create the socket on mount
	useEffect(() => {
		if (!socket) createSocket({ channelId, websocketUrl })

		function subscriber<Key extends keyof z.infer<T>>(key: Key, value: z.infer<T>[Key]): void {
			setState(prev => ({ ...prev, [key]: value }))
		}

		subscribers.add(subscriber as typeof subscriber extends Subscriber<T> ? typeof subscriber : never)

		return () => {
			subscribers.delete(
				subscriber as typeof subscriber extends Subscriber<T> ? typeof subscriber : never
			)

			if (subscribers.size === 0 && socket) {
				socket.close()
				socket = null
			}
		}
	}, [])

	const getValue = <Key extends keyof z.infer<T>>(key: Key): z.infer<T>[Key] | undefined => {
		return state[key]
	}

	const setValue = <Key extends keyof z.infer<T>>(key: Key, updater: z.infer<T>[Key] | Updater) => {
		setState(prev => {
			const newValue = typeof updater === 'function' ? (updater as Updater)(prev[key]) : updater
			return { ...prev, [key]: newValue }
		})
		const valueToSend = typeof updater === 'function' ? (updater as Updater)(state[key]) : updater
		socket?.send(JSON.stringify({ [key as string]: valueToSend }))
	}

	return (
		<RealtimeContext.Provider
			value={{
				getValue,
				setValue: setValue as <Key extends keyof z.infer<T>>(key: Key, updater: unknown) => void
			}}
		>
			{children}
		</RealtimeContext.Provider>
	)
}

export const createLiveState = <T extends GenericSchema>(_: T) => {
	return {
		useLiveState: <Key extends keyof z.infer<T>>(key: Key) => {
			const context = useContext(RealtimeContext)

			if (!context) throw new Error('useLiveState must be used within a RealtimeProvider')

			return [context.getValue(key as string), value => context.setValue(key as string, value)] as [
				z.infer<T>[Key],
				(updater: z.infer<T>[Key] | ((prev: z.infer<T>[Key] | undefined) => z.infer<T>[Key])) => void
			]
		}
	}
}
