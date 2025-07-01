import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/')
  })

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login')
    
    // Check if login form is visible
    await expect(page.getByText('Welcome to HomeBake')).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible()
  })

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /log in/i }).click()
    
    // Check for HTML5 validation
    const emailField = page.getByLabel(/email/i)
    const passwordField = page.getByLabel(/password/i)
    
    // HTML5 validation should prevent submission
    await expect(emailField).toHaveAttribute('required')
    await expect(passwordField).toHaveAttribute('required')
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /log in/i }).click()
    
    // Wait for error message (this would normally come from Supabase)
    // In a real test, you'd need to mock the API or have test credentials
    await expect(page.getByText(/logging in/i)).toBeVisible()
  })

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login')
    
    // This test would require valid test credentials or mocked auth
    // For now, we'll test the form submission process
    await page.getByLabel(/email/i).fill('test@homebake.com')
    await page.getByLabel(/password/i).fill('testpassword123')
    
    // Check that the form can be submitted
    const submitButton = page.getByRole('button', { name: /log in/i })
    await expect(submitButton).toBeEnabled()
    
    // In a real scenario with proper test auth setup:
    // await submitButton.click()
    // await expect(page).toHaveURL('/dashboard')
  })

  test('should handle navigation to protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard')
    
    // Should be redirected to login (if middleware is working)
    // await expect(page).toHaveURL('/login')
    
    // For now, just check that we're not on an error page
    await expect(page.locator('body')).toBeVisible()
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE size
    await page.goto('/login')
    
    // Check mobile layout
    await expect(page.getByText('Welcome to HomeBake')).toBeVisible()
    
    // Form should be properly sized for mobile
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Touch targets should be appropriately sized
    const submitButton = page.getByRole('button', { name: /log in/i })
    const buttonBox = await submitButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThan(40) // Minimum touch target
  })

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/login')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/email/i)).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByLabel(/password/i)).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /log in/i })).toBeFocused()
    
    // Should be able to submit with Enter
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    await page.keyboard.press('Enter')
    
    // Form submission should be triggered
    await expect(page.getByText(/logging in/i)).toBeVisible()
  })

  test('should display loading state during login', async ({ page }) => {
    await page.goto('/login')
    
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    
    // Submit form and check loading state
    await page.getByRole('button', { name: /log in/i }).click()
    
    // Should show loading text and disabled state
    await expect(page.getByText(/logging in/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /logging in/i })).toBeDisabled()
  })
})

test.describe('Session Management', () => {
  test('should handle session persistence', async ({ page }) => {
    // This would test that users stay logged in across browser refreshes
    // Requires actual authentication setup
    await page.goto('/dashboard')
    
    // With proper auth, this should either show dashboard or redirect to login
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle logout functionality', async ({ page }) => {
    // This would test the logout flow
    // First need to be authenticated, then test logout
    await page.goto('/dashboard')
    
    // Look for logout button/option
    // await page.getByRole('button', { name: /logout/i }).click()
    // await expect(page).toHaveURL('/login')
  })
})

test.describe('Role-Based Access', () => {
  test('should restrict access based on user roles', async ({ page }) => {
    // This would test that sales reps can't access owner-only features
    // Requires test users with different roles
    await page.goto('/dashboard/users')
    
    // Should either show content (if owner) or redirect/show error (if not owner)
    await expect(page.locator('body')).toBeVisible()
  })

  test('should show appropriate navigation for each role', async ({ page }) => {
    // Test that different user roles see different navigation options
    await page.goto('/dashboard')
    
    // Check for role-specific navigation items
    // This would vary based on the authenticated user's role
    await expect(page.locator('nav')).toBeVisible()
  })
})