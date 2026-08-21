import type { ProductCategory } from '@/types'

// One category vocabulary. It existed in four places — two merchant cards, two
// admin <SelectItem> lists — and /admin/products had none, so it rendered the
// raw enum: an operator read "cosmeticos".
//
// Two registers on purpose. The full names are what the admin picks from and
// what the catalog filter bar shows; the short ones fit a product card's chip.

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  supplements: 'Suplementos Dietarios',
  cosmeticos: 'Cosméticos & Cuidado Personal',
  cafe: 'Café y Infusiones',
}

export const CATEGORY_LABELS_SHORT: Record<ProductCategory, string> = {
  supplements: 'Suplementos',
  cosmeticos: 'Cosméticos',
  cafe: 'Café',
}

/** SCREENS.md §1 dot colours, mapped onto the three categories the enum holds. */
export const CATEGORY_DOTS: Record<ProductCategory, string> = {
  supplements: '#8FC79A',
  cosmeticos: '#E4A0B7',
  cafe: '#D9B27C',
}

export const CATEGORY_VALUES: ProductCategory[] = ['supplements', 'cosmeticos', 'cafe']
