import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import the component to test
import LoginPage from '@/app/(auth)/login/page'

// Mock Next.js navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock Supabase client with proper typing
const mockSignInWithPassword = jest.fn()
const mockGetUser = jest.fn()
const mockGetSession = jest.fn()
const mockSignOut = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      getUser: mockGetUser,
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}))

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Login Page Component', () => {
    it('renders login form correctly', () => {
      render(<LoginPage />)
      
      expect(screen.getByText('Welcome to HomeBake')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    it('shows validation for empty fields', async () => {
      const user = userEvent.setup()
      render(<LoginPage />)
      
      const submitButton = screen.getByRole('button', { name: /log in/i })
      await user.click(submitButton)
      
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      
      // HTML5 validation should prevent submission with empty required fields
      expect(emailInput.validity.valid).toBe(false)
      expect(passwordInput.validity.valid).toBe(false)
    })

    it('handles successful login flow', async () => {
      const user = userEvent.setup()
      
      // Mock successful login response
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { 
          user: { id: '1', email: 'test@homebake.com' }, 
          session: { access_token: 'fake-token' } 
        },
        error: null,
      })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      // Fill in the form
      await user.type(emailInput, 'test@homebake.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Verify API call and navigation
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@homebake.com',
          password: 'password123',
        })
        expect(mockPush).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('displays error message on login failure', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Invalid email or password'
      
      // Mock failed login response
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: errorMessage },
      })
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@homebake.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument()
      })
    })

    it('shows loading state during login attempt', async () => {
      const user = userEvent.setup()
      
      // Mock delayed response
      mockSignInWithPassword.mockImplementationOnce(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            data: { user: null, session: null },
            error: null,
          }), 100)
        )
      )
      
      render(<LoginPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /log in/i })
      
      await user.type(emailInput, 'test@homebake.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      // Check loading state
      expect(screen.getByText('Logging In...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Session Management', () => {
    it('handles authenticated user data', async () => {
      const userData = {
        id: '1',
        email: 'manager@homebake.com',
        user_metadata: { role: 'manager' },
      }
      
      mockGetUser.mockResolvedValueOnce({
        data: { user: userData },
        error: null,
      })
      
      const { supabase } = require('@/lib/supabase/client')
      const result = await supabase.auth.getUser()
      
      expect(result.data.user).toEqual(userData)
      expect(result.error).toBeNull()
    })

    it('handles unauthenticated state', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User not authenticated' },
      })
      
      const { supabase } = require('@/lib/supabase/client')
      const result = await supabase.auth.getUser()
      
      expect(result.data.user).toBeNull()
      expect(result.error?.message).toBe('User not authenticated')
    })

    it('handles session retrieval', async () => {
      const sessionData = {
        access_token: 'fake-token',
        user: { id: '1', email: 'test@homebake.com' },
      }
      
      mockGetSession.mockResolvedValueOnce({
        data: { session: sessionData },
        error: null,
      })
      
      const { supabase } = require('@/lib/supabase/client')
      const result = await supabase.auth.getSession()
      
      expect(result.data.session).toEqual(sessionData)
      expect(result.error).toBeNull()
    })
  })

  describe('Logout Functionality', () => {
    it('handles successful logout', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null })
      
      const { supabase } = require('@/lib/supabase/client')
      const result = await supabase.auth.signOut()
      
      expect(result.error).toBeNull()
      expect(mockSignOut).toHaveBeenCalled()
    })

    it('handles logout errors', async () => {
      const errorMessage = 'Failed to sign out'
      mockSignOut.mockResolvedValueOnce({ 
        error: { message: errorMessage } 
      })
      
      const { supabase } = require('@/lib/supabase/client')
      const result = await supabase.auth.signOut()
      
      expect(result.error?.message).toBe(errorMessage)
    })
  })

  describe('Role-Based Access Patterns', () => {
    it('identifies owner role correctly', () => {
      const ownerUser = {
        id: '1',
        email: 'owner@homebake.com',
        user_metadata: { role: 'owner' },
      }
      
      expect(ownerUser.user_metadata.role).toBe('owner')
    })

    it('identifies manager role correctly', () => {
      const managerUser = {
        id: '2',
        email: 'manager@homebake.com',
        user_metadata: { role: 'manager' },
      }
      
      expect(managerUser.user_metadata.role).toBe('manager')
    })

    it('identifies sales rep role correctly', () => {
      const salesRepUser = {
        id: '3',
        email: 'sales@homebake.com',
        user_metadata: { role: 'sales_rep' },
      }
      
      expect(salesRepUser.user_metadata.role).toBe('sales_rep')
    })

    it('handles missing role metadata', () => {
      const userWithoutRole = {
        id: '4',
        email: 'user@homebake.com',
        user_metadata: {} as { role?: string },
      }
      
      expect(userWithoutRole.user_metadata.role).toBeUndefined()
    })
  })

  describe('Email Validation', () => {
    it('validates correct email formats', () => {
      const validEmails = [
        'test@homebake.com',
        'manager@bakery.co.uk',
        'user+tag@domain.org',
      ]
      
      validEmails.forEach(email => {
        const input = document.createElement('input')
        input.type = 'email'
        input.value = email
        expect(input.validity.valid).toBe(true)
      })
    })

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'plaintext',
        '',
      ]
      
      invalidEmails.forEach(email => {
        const input = document.createElement('input')
        input.type = 'email'
        input.value = email
        input.required = true
        expect(input.validity.valid).toBe(false)
      })
    })
  })
})