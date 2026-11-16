export type Deal = {
  id: string
  conversation_id: string
  amount: number | null
  currency: string
  status: string
  commission_rate: number | null
  commission_amount: number | null
  investor_approved: boolean
  owner_approved: boolean
  investor_approved_at: string | null
  owner_approved_at: string | null
  created_at: string
}

export type DealWithRole = Deal & {
  isInvestor: boolean
  isOwner: boolean
}

export type CommissionPayment = {
  id: string
  deal_id: string
  status: string
  due_at: string | null
  paid_at: string | null
}

export type PaymentWithDeal = CommissionPayment & {
  deal?: {
    id: string
    amount: number | null
    currency: string | null
    commission_rate: number | null
    commission_amount: number | null
    status: string
    conversation_id: string
  } | null
}
