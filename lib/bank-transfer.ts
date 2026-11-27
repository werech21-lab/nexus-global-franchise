/**
 * Bank account that receives commission transfers. Server only: these details
 * are returned by /api/payments/bank-transfer/details exclusively to the
 * opportunity owner of a completed deal with a pending commission.
 * Override with env vars; the defaults are the account Nexus published to payers.
 */
export type BankDetails = {
  accountHolder: string
  bankName: string
  bankNameAr: string
  accountNumber: string
  iban: string
  swift: string
}

export function bankDetails(): BankDetails {
  const env = process.env
  return {
    accountHolder: env.BANK_TRANSFER_ACCOUNT_HOLDER?.trim() || 'ABDULLAH AWIRAH',
    bankName: env.BANK_TRANSFER_BANK_NAME?.trim() || 'Al Ahli Bank of Kuwait (ABK)',
    bankNameAr: env.BANK_TRANSFER_BANK_NAME_AR?.trim() || 'البنك الأهلي الكويتي',
    accountNumber: env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() || '0607002087001',
    iban: (env.BANK_TRANSFER_IBAN?.trim() || 'KW27ABKK0000000000607002087001').replace(/\s+/g, ''),
    swift: env.BANK_TRANSFER_SWIFT?.trim() || '',
  }
}
