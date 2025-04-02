import type { z } from 'zod'

class State<T extends z.AnyZodObject> {
	private state: z.infer<T>

	constructor(initialState?: z.infer<T>) {
		this.state = initialState || {}
	}

	get<K extends keyof z.infer<T>>(key: K): z.infer<T>[K] | undefined {
		return this.state?.[key]
	}

	getAll(): z.infer<T> {
		return this.state
	}

	async set<K extends keyof z.infer<T>>(key: K, value: z.infer<T>[K]): Promise<z.infer<T>[K]> {
		this.state[key] = value
		return value
	}
}

export class StateManager {
	private MAX_CHANNELS = 100_000
	private stateMap: Map<string, State<z.AnyZodObject>>

	constructor() {
		this.stateMap = new Map()
	}

	get(channelId: string): State<z.AnyZodObject> {
		const existingState = this.stateMap.get(channelId)

		if (existingState) return existingState

		if (this.stateMap.size >= this.MAX_CHANNELS) {
			throw new Error(`Max of ${this.MAX_CHANNELS} channels reached`)
		}

		const state = new State()
		this.stateMap.set(channelId, state)
		return state
	}

	delete(channelId: string): void {
		this.stateMap.delete(channelId)
	}

	getCount(): number {
		return this.stateMap.size
	}
}
