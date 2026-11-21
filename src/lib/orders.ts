export interface OrderSummary {
  id: string
  status: 'pending_payment' | 'cancelled' | 'expired'
  total: number
  currency: 'TMN'
  createdAt: number
  expiresAt: number
  items: { productId: string; title: string; quantity: number; unitPrice: number }[]
}
