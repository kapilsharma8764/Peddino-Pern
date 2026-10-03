/** Public provider contracts. Endpoints are configured per widget in Content. */
export interface WidgetSubmission {
  widgetId: string
  fields: Record<string, string | string[]>
}
export interface WidgetResponse {
  ok: boolean
  message?: string
  /** Optional hosted checkout URL. Never interpret a local cart as a paid order. */
  checkoutUrl?: string
}
export interface CartProduct {
  id: string; title: string; price: number; quantity: number; image?: string
}
export interface CheckoutRequest {
  items: CartProduct[]
  customer: Record<string, string>
  coupon?: string
}
export interface WidgetService {
  submit(payload: WidgetSubmission): Promise<WidgetResponse>
  checkout(payload: CheckoutRequest): Promise<WidgetResponse>
}
