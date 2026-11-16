export type Conversation = {
  id: string
  listing_id?: string | null
  investor_id: string
  owner_id: string
  created_at?: string
  updated_at?: string
}

export type ChatMessage = {
  id?: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export type ConversationRead = {
  conversation_id: string
  last_read_at: string
}

export type MessageNotification = {
  conversationId: string
  count: number
  latestAt: string
  preview: string
  senderRoleKey: 'owner' | 'investor'
}
