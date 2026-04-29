import { messagingApi } from '@line/bot-sdk'

let _client: messagingApi.MessagingApiClient | null = null

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!_client) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN が設定されていません')
    _client = new messagingApi.MessagingApiClient({ channelAccessToken: token })
  }
  return _client
}
