import { cookies } from 'next/headers'
import type { z } from 'zod/v4'
import { ProviderClient } from './client'

export async function RealtimeProvider({
	children,
	websocketUrl,
	channelId,
	schema
}: {
	children: React.ReactNode
	websocketUrl: string
	channelId?: string
	schema: z.ZodObject<Record<string, z.ZodTypeAny>>
}) {
	const cookieStore = await cookies()

	channelId = channelId || cookieStore.get('channelId')?.value || ''

	const res = await fetch(`${websocketUrl}?channelId=${channelId}`)

	const initialStateRaw = await res.text()
	const initialStateJson = initialStateRaw ? JSON.parse(initialStateRaw) : undefined
	const initialState = schema.parse(initialStateJson)

	channelId = res.headers.get('Set-Cookie')?.split('; ')[0]?.split('=')[1] || ''

	return (
		<ProviderClient websocketUrl={websocketUrl} channelId={channelId} initialState={initialState}>
			{children}
		</ProviderClient>
	)
}
