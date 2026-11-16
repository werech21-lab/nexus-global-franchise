export async function notifyEmailEvent(
  event: 'new_inquiry' | 'new_message',
  payload: Record<string, string>
): Promise<void> {
  try {
    await fetch('/api/notify/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...payload }),
    })
  } catch {
    // Email is optional and must never block the in-app action.
  }
}
