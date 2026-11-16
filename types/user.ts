export type Account = {
  id: string
  name: string
  email: string
}

export type NexusUser = {
  id: string
  email: string | null
  full_name?: string | null
  created_at: string | null
  last_sign_in_at: string | null
}
