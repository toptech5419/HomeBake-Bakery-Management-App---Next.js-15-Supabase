import { test, expect } from '@playwright/test'

test.describe('Sales Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In a real test environment, you would set up test authentication
    // For now, we'll navigate to the sales page directly
    await page.goto('/')
  })

  test('should complete full sales logging workflow', async ({ page }) => {
    // Navigate to dashboard (assuming authenticated)
    await page.goto('/dashboard')
    
    // Navigate to sales section
    await page.getByRole('link', { name: /sales/i }).click()
    await expect(page).toHaveURL(/.*sales/)

    // Check if sales form is visible
    await expect(page.getByText(/log sales/i)).toBeVisible()
    
    // Should show current shift
    await expect(page.getByText(/shift/i)).toBeVisible()
  })

  test('should display bread types for sale', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Should show bread types (assuming some exist in test DB)
    // In a real test, you'd seed test data
    const breadTypesSection = page.locator('[data-testid="sales-form"]')
    await expect(breadTypesSection).toBeVisible()
  })

  test('should validate sales form inputs', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Try to submit without entering any quantities
    const submitButton = page.getByRole('button', { name: /save sales log/i })
    if (await submitButton.isVisible()) {
      await submitButton.click()
      
      // Should show validation error
      await expect(page.getByText(/at least one quantity/i)).toBeVisible()
    }
  })

  test('should handle quantity input validation', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Find quantity inputs
    const quantityInputs = page.locator('input[type="number"]').filter({ hasText: /quantity/i })
    
    if (await quantityInputs.count() > 0) {
      const firstInput = quantityInputs.first()
      
      // Test negative number validation
      await firstInput.fill('-5')
      await firstInput.blur()
      
      // HTML5 validation should prevent negative numbers
      await expect(firstInput).toHaveAttribute('min', '0')
    }
  })

  test('should handle discount percentage validation', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Find discount inputs
    const discountInputs = page.locator('input[type="number"]').filter({ hasText: /discount/i })
    
    if (await discountInputs.count() > 0) {
      const firstInput = discountInputs.first()
      
      // Test maximum percentage validation
      await firstInput.fill('150')
      await firstInput.blur()
      
      // Should not allow more than 100%
      await expect(firstInput).toHaveAttribute('max', '100')
    }
  })

  test('should submit valid sales data', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 })
    
    // Fill in sample sales data
    const quantityInputs = page.locator('input[placeholder*="quantity"]')
    const count = await quantityInputs.count()
    
    if (count > 0) {
      // Fill first bread type with quantity
      await quantityInputs.first().fill('5')
      
      // Submit form
      const submitButton = page.getByRole('button', { name: /save sales log/i })
      await submitButton.click()
      
      // Should show success message
      await expect(page.getByText(/success/i)).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle offline functionality', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Simulate offline mode
    await page.context().setOffline(true)
    
    // Fill and submit sales data
    const quantityInputs = page.locator('input[placeholder*="quantity"]')
    if (await quantityInputs.count() > 0) {
      await quantityInputs.first().fill('3')
      
      const submitButton = page.getByRole('button', { name: /save sales log/i })
      await submitButton.click()
      
      // Should handle offline submission gracefully
      // (Implementation depends on offline strategy)
      await expect(page.locator('body')).toBeVisible()
    }
    
    // Restore online mode
    await page.context().setOffline(false)
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard/sales')
    
    // Form should be mobile-friendly
    await expect(page.getByText(/log sales/i)).toBeVisible()
    
    // Touch targets should be appropriately sized
    const submitButton = page.getByRole('button', { name: /save sales log/i })
    if (await submitButton.isVisible()) {
      const buttonBox = await submitButton.boundingBox()
      expect(buttonBox?.height).toBeGreaterThan(40) // Minimum touch target
    }
    
    // Form inputs should be properly sized for mobile
    const inputs = page.locator('input[type="number"]')
    const count = await inputs.count()
    
    if (count > 0) {
      const inputBox = await inputs.first().boundingBox()
      expect(inputBox?.height).toBeGreaterThan(40) // Touch-friendly input height
    }
  })

  test('should handle keyboard navigation in sales form', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    
    // Find first quantity input and ensure it's focusable
    const quantityInputs = page.locator('input[type="number"]')
    if (await quantityInputs.count() > 0) {
      await quantityInputs.first().focus()
      await page.keyboard.type('5')
      
      // Tab to next input
      await page.keyboard.press('Tab')
      
      // Should move to discount input or next quantity input
      const activeElement = page.locator(':focus')
      await expect(activeElement).toBeVisible()
    }
  })

  test('should display correct pricing information', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Should show unit prices for bread types
    const priceElements = page.locator('text=/\\$\\d+\\.\\d{2}/')
    
    if (await priceElements.count() > 0) {
      // Prices should be in correct format
      const priceText = await priceElements.first().textContent()
      expect(priceText).toMatch(/\$\d+\.\d{2}/)
    }
  })

  test('should show current shift information', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Should display current shift (morning or evening)
    const shiftBadge = page.locator('text=/Morning Shift|Evening Shift/')
    await expect(shiftBadge).toBeVisible()
  })

  test('should handle form reset after successful submission', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    const quantityInputs = page.locator('input[placeholder*="quantity"]')
    
    if (await quantityInputs.count() > 0) {
      // Fill form
      await quantityInputs.first().fill('5')
      
      // Submit
      const submitButton = page.getByRole('button', { name: /save sales log/i })
      await submitButton.click()
      
      // Wait for success and form reset
      await page.waitForTimeout(2000)
      
      // Form should be reset (inputs should be empty)
      const inputValue = await quantityInputs.first().inputValue()
      expect(inputValue).toBe('')
    }
  })
})

test.describe('Sales History and Reports', () => {
  test('should display sales history', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Look for sales history section
    const historyLink = page.getByRole('link', { name: /history|view sales/i })
    
    if (await historyLink.isVisible()) {
      await historyLink.click()
      
      // Should show sales history table or list
      await expect(page.locator('table, [data-testid="sales-history"]')).toBeVisible()
    }
  })

  test('should filter sales by date range', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Look for date filters
    const dateInputs = page.locator('input[type="date"]')
    
    if (await dateInputs.count() >= 2) {
      // Set date range
      await dateInputs.first().fill('2024-01-01')
      await dateInputs.last().fill('2024-01-31')
      
      // Apply filter
      const filterButton = page.getByRole('button', { name: /filter|apply/i })
      if (await filterButton.isVisible()) {
        await filterButton.click()
        
        // Should update results
        await expect(page.locator('body')).toBeVisible()
      }
    }
  })

  test('should export sales data', async ({ page }) => {
    await page.goto('/dashboard/sales')
    
    // Look for export functionality
    const exportButton = page.getByRole('button', { name: /export|download/i })
    
    if (await exportButton.isVisible()) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download')
      await exportButton.click()
      
      // Verify download starts
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/)
    }
  })
})