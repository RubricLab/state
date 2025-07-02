import { z } from 'zod/v4'

export const generateId = () => crypto.randomUUID().slice(0, 8)

export const eventSchema = z.object({
	key: z.string(),
	value: z.any()
})

export const THIRTY_DAYS = 60 * 60 * 24 * 30
