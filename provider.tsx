import { cookies } from 'next/headers'
import { ProviderClient } from './client'
import type { z } from 'zod'

export async function RealtimeProvider({
	children,
	websocketUrl,
	schema
}: {
	children: React.ReactNode
	websocketUrl: string
	schema: z.ZodType
}) {
	const cookieStore = await cookies()

	let channelId = ''

	channelId = cookieStore.get('channelId')?.value || ''

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
