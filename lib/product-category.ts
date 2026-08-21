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

/**
 * Supplement Facts is a labelling-compliance artifact for supplements and is
 * meaningless — and misleading — on a cosmetic or a coffee. Adam ruling
 * 2026-08-21: keep the structured panel, conditional by category.
 *
 * A predicate rather than an inline `category === 'supplements'`: it is checked
 * in four places, and a rule about what a regulatory panel may appear on should
 * not be four literals that can drift apart.
 */
export function showsSupplementFacts(category: ProductCategory | null | undefined): boolean {
  return category === 'supplements'
}
