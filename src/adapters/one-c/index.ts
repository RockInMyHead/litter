import { products } from '../../data/factory/index.ts'
export function readOneC() {
  return Object.fromEntries(products.map(product => [product.code, product.order]))
}
