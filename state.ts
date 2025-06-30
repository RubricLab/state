import Redis from 'ioredis'
import type { z } from 'zod'

// Initialize Redis client if REDIS_URL is provided
const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null

if (redis) {
	console.log('Redis connected')
} else {
	console.log('Redis not connected')
}

class State<T extends z.AnyZodObject> {
	private state: z.infer<T> | undefined
	private channelId: string

	constructor(channelId: string, initialState?: z.infer<T>) {
		this.channelId = channelId
		this.state = initialState
	}

	async loadFromRedis(): Promise<void> {
		if (!redis) return

		try {
			const data = await redis.get(`state:${this.channelId}`)
			if (data) {
				this.state = JSON.parse(data)
			}
		} catch (error) {
			console.error({ channelId: this.channelId, error }, 'Failed to load state from Redis')
		}
	}

	private async saveToRedis(): Promise<void> {
		if (!redis || !this.state) return

		try {
			await redis.set(`state:${this.channelId}`, JSON.stringify(this.state))
		} catch (error) {
			console.error({ channelId: this.channelId, error }, 'Failed to save state to Redis')
		}
	}

	get<K extends keyof z.infer<T>>(key: K): z.infer<T>[K] | undefined {
		return this.state?.[key]
	}

	getAll(): z.infer<T> | undefined {
		return this.state
	}

	async set<K extends keyof z.infer<T>>(key: K, value: z.infer<T>[K]): Promise<z.infer<T>[K]> {
		if (!this.state) this.state = {} as z.infer<T>
		this.state[key] = value

		// Persist to Redis if available
		await this.saveToRedis()

		return value
	}

	async deleteFromRedis(): Promise<void> {
		if (!redis) return

		try {
			await redis.del(`state:${this.channelId}`)
		} catch (error) {
			console.error({ channelId: this.channelId, error }, 'Failed to delete state from Redis')
		}
	}
}

export class StateManager {
	private MAX_CHANNELS = 100_000
	private stateMap: Map<string, State<z.AnyZodObject>>

	constructor() {
		this.stateMap = new Map()
	}

	async get(channelId: string): Promise<State<z.AnyZodObject>> {
		const existingState = this.stateMap.get(channelId)

		if (existingState) return existingState

		if (this.stateMap.size >= this.MAX_CHANNELS) {
			throw new Error(`Max of ${this.MAX_CHANNELS} channels reached`)
		}

		const state = new State(channelId)

		// Load state from Redis if available
		await state.loadFromRedis()

		this.stateMap.set(channelId, state)
		return state
	}

	async delete(channelId: string): Promise<void> {
		const state = this.stateMap.get(channelId)
		if (state) {
			await state.deleteFromRedis()
		}
		this.stateMap.delete(channelId)
	}

	getCount(): number {
		return this.stateMap.size
	}

	// Method to close Redis connection when shutting down
	async close(): Promise<void> {
		if (redis) {
			await redis.quit()
		}
	}
}
