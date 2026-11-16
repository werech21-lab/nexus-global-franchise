import type { SupabaseClient } from '@supabase/supabase-js'

export type UserLabelCopy = {
  unknown: string
  prefix: string
}

const fallbackLabels: UserLabelCopy = {
  unknown: 'Unknown user',
  prefix: 'User',
}

export function maskUserId(
  id: string | null | undefined,
  labels: UserLabelCopy = fallbackLabels
): string {
  if (!id) return labels.unknown
  const compact = id.replace(/-/g, '')
  const short = compact.slice(0, 4)
  return `${labels.prefix} ${short}…`
}

export function formatUserLabel(
  input: {
    id: string
    name?: string | null
    email?: string | null
  },
  labels: UserLabelCopy = fallbackLabels
): string {
  const name = input.name?.trim()
  if (name) return name
  const email = input.email?.trim()
  if (email) return email
  return maskUserId(input.id, labels)
}

/**
 * Resolves display names/emails when a public profiles table exists.
 * If that table is not available, falls back to a masked user id.
 */
export async function loadUserLabels(
  client: SupabaseClient,
  ids: string[],
  labels: UserLabelCopy = fallbackLabels
): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const resolved: Record<string, string> = {}
  unique.forEach(id => {
    resolved[id] = maskUserId(id, labels)
  })

  if (unique.length === 0) return resolved

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, name, display_name, email')
      .in('id', unique)

    if (error || !data) return resolved

    for (const row of data as Array<{
      id: string
      full_name?: string | null
      name?: string | null
      display_name?: string | null
      email?: string | null
    }>) {
      resolved[row.id] = formatUserLabel(
        {
          id: row.id,
          name: row.full_name || row.name || row.display_name,
          email: row.email,
        },
        labels
      )
    }
  } catch {
    // The live schema has not been exported yet; masked ids are enough.
  }

  return resolved
}
