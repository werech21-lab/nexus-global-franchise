export const MIN_PASSWORD_LENGTH = 10

export type PasswordIssue = 'minLength' | 'lettersNumbers' | 'mismatch'

export function getPasswordIssue(password: string): PasswordIssue | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'minLength'
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'lettersNumbers'
  }
  return null
}

export function getPasswordMismatch(
  password: string,
  confirmPassword: string
): PasswordIssue | null {
  if (password !== confirmPassword) return 'mismatch'
  return null
}

export function passwordIssueMessage(
  issue: PasswordIssue | null,
  messages: {
    minLength: string
    lettersNumbers: string
    mismatch: string
  }
): string | null {
  if (!issue) return null
  if (issue === 'minLength') {
    return messages.minLength.replace('{min}', String(MIN_PASSWORD_LENGTH))
  }
  return messages[issue]
}
