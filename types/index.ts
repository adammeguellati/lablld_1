export type Plan = 'starter' | 'plus'

export interface ThemeLabel {
  id: string
  name: string
  preview_url: string
  file_url: string
}
export type PlanStatus = 'active' | 'past_due' | 'cancelled'
export type OrderStatus =
  | 'quote_pending'
  | 'payment_pending'
  | 'pending'
  | 'paid'
  | 'payment_failed'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
export type ProductCategory = 'supplements' | 'cosmeticos' | 'cafe'
export type LabelStatus = 'pending' | 'approved' | 'rejected'

export interface Merchant {
  id: string
  email: string
  full_name: string
  wompi_payment_source_id: number | null
  subscription_started_at: string | null
  subscription_next_billing_at: string | null
  plan: Plan | null
  pending_plan: Plan | null
  plan_status: PlanStatus
  plan_cancel_at: string | null
  is_active: boolean
  shopify_connected: boolean
  shopify_request_domain: string | null
  created_at: string
  updated_at: string
}

export interface LabelArea {
  x: number
  y: number
  width: number
  height: number
}

export interface SupplementFactRow {
  name: string
  amount: string
  dv?: string
  indent?: boolean
}

export interface SupplementFacts {
  serving_size: string
  servings_per_container: number
  rows: SupplementFactRow[]
}

export interface BenefitBlock {
  icon: string
  title: string
  description: string
}

export interface ScienceFact {
  title: string
  content: string
  source?: string
}

export interface Product {
  id: string
  name: string
  slug: string | null
  description: string | null
  short_description: string | null
  long_description: string | null
  category: ProductCategory
  format: string | null
  sku: string | null
  base_price: number
  wholesale_price_usd: number | null
  price_cop: number | null
  suggested_retail_price_cop: number | null
  shipping_cost_cop: number | null
  stock: number | null
  available_tiers: Plan[]
  images: string[]
  icons: string[]
  benefit_blocks: BenefitBlock[] | null
  science_facts: ScienceFact[] | null
  supplement_facts: SupplementFacts | null
  ingredients_list: string | null
  other_ingredients: string | null
  serving_size: string | null
  servings_per_container: number | null
  suggested_use: string | null
  warning: string | null
  manufacturer_country: string | null
  product_weight_g: number | null
  gross_weight_g: number | null
  shipping_scope: string | null
  fulfillment_fee_cop: number | null
  mockup_template_id: string | null
  mockup_smart_object_uuid: string | null
  mockup_so_width: number | null
  mockup_so_height: number | null
  label_area: LabelArea | null
  label_dimensions: { width: number; height: number; unit: string } | null
  label_template_url: string | null
  canva_template_url: string | null
  theme_labels: ThemeLabel[] | null
  is_active: boolean
  is_new: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  shipping_rates?: ShippingRate[]
}

export interface ShippingRate {
  id: string
  product_id: string
  country: string
  country_code: string
  rate: number
  rate_cop: number | null
  created_at: string
}

export interface MerchantProduct {
  id: string
  merchant_id: string
  product_id: string
  label_url: string | null
  label_status: LabelStatus
  label_rejection_reason: string | null
  mockup_url: string | null
  shopify_product_id: string | null
  shopify_variant_id: string | null
  custom_name: string | null
  custom_description: string | null
  retail_price: number | null
  shipping_tier: 'standard' | 'express'
  is_published: boolean
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  product?: Product
}

export interface MerchantLabel {
  id: string
  merchant_id: string
  label_url: string
  name: string | null
  status: LabelStatus
  rejection_reason: string | null
  created_at: string
}

export interface ShopifyStore {
  id: string
  merchant_id: string
  shop_domain: string
  access_token: string
  scope: string | null
  webhook_id: string | null
  created_at: string
}

export interface Order {
  id: string
  merchant_id: string
  shopify_order_id: string | null
  shopify_order_number: string | null
  source: string | null
  customer_name: string | null
  customer_email: string | null
  shipping_address: ShippingAddress | null
  status: OrderStatus
  fulfillment_cost: number | null
  shipping_cost_cop: number | null
  estimated_delivery: string | null
  payment_link_id: string | null
  payment_link_url: string | null
  wompi_transaction_id: string | null
  tracking_number: string | null
  carrier: string | null
  envia_guide_id: string | null
  label_pdf_url: string | null
  notes: string | null
  shipped_at: string | null
  created_at: string
  updated_at: string
  order_items?: OrderItem[]
  merchant?: Merchant
}

export interface ShippingAddress {
  name: string
  address1: string
  address2?: string
  city: string
  province: string
  zip: string
  country: string
  phone?: string
}

export interface OrderItem {
  id: string
  order_id: string
  // Nullable in the schema and written null by two insert sites: sample orders
  // always, and admin orders whenever the merchant has no matching
  // merchant_product. Declaring it a bare string made every dereference a
  // latent crash the compiler could not see.
  merchant_product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  created_at: string
  merchant_product?: MerchantProduct
}

export interface ShopifyOrderWebhook {
  id: number
  order_number: number
  email: string
  customer: {
    first_name: string
    last_name: string
    email: string
  }
  shipping_address: {
    name: string
    address1: string
    address2?: string
    city: string
    province: string
    zip: string
    country: string
    country_code: string
    phone?: string
  }
  line_items: ShopifyLineItem[]
  total_price: string
}

export interface ShopifyLineItem {
  id: number
  variant_id: number
  product_id: number
  title: string
  quantity: number
  price: string
}
