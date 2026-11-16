import type { SupabaseClient } from '@supabase/supabase-js'
import { copy } from './copy'

export function maskUserId(id: string | null | undefined): string {
  if (!id) return copy.user.unknown
  const compact = id.replace(/-/g, '')
  const short = compact.slice(0, 4)
  return `${copy.user.prefix} ${short}…`
}

export function formatUserLabel(input: {
  id: string
  name?: string | null
  email?: string | null
}): string {
  const name = input.name?.trim()
  if (name) return name
  const email = input.email?.trim()
  if (email) return email
  return maskUserId(input.id)
}

/**
 * Resolves display names/emails when a public profiles table exists.
 * If that table is not available, falls back to a masked user id.
 */
export async function loadUserLabels(
  client: SupabaseClient,
  ids: string[]
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const labels: Record<string, string> = {}
  unique.forEach(id => {
    labels[id] = maskUserId(id)
  })

  if (unique.length === 0) return labels

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, name, display_name, email')
      .in('id', unique)

    if (error || !data) return labels

    for (const row of data as Array<{
      id: string
      full_name?: string | null
      name?: string | null
      display_name?: string | null
      email?: string | null
    }>) {
      labels[row.id] = formatUserLabel({
        id: row.id,
        name: row.full_name || row.name || row.display_name,
        email: row.email,
      })
    }
  } catch {
    // The live schema has not been exported yet; masked ids are enough.
  }

  return labels
}
