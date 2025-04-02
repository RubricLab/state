import { cookies } from 'next/headers'
import { ProviderClient } from './client'

export async function RealtimeProvider({
	children,
	websocketUrl
}: {
	children: React.ReactNode
	websocketUrl: string
}) {
	const cookieStore = await cookies()

	let channelId = ''

	channelId = cookieStore.get('channelId')?.value || ''

	const res = await fetch(`${websocketUrl}?channelId=${channelId}`)

	const initialState = await res.json()

	channelId = res.headers.get('Set-Cookie')?.split('; ')[0]?.split('=')[1] || ''

	return (
		<ProviderClient websocketUrl={websocketUrl} channelId={channelId} initialState={initialState}>
			{children}
		</ProviderClient>
	)
}
