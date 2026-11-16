import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Browser Supabase client used by existing client components.
 * Sessions are stored in cookies via @supabase/ssr so middleware
 * and server components can see the same login.
 */
export const supabase: SupabaseClient | null =
  url && key ? createBrowserClient(url, key) : null
