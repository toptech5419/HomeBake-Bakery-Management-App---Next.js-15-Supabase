// Note: This file is kept for backwards compatibility but functions are no longer used
// Low stock tracking is now handled directly by monitoring the performance pages

export function deprecationWarning() {
  console.warn('Low stock server actions are deprecated. Use useLowStockTracker hook instead.');
}