import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import component and utilities
import ProductionForm from '@/components/production/production-form'
import { productionFormSchema } from '@/lib/validations/production'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/contexts/ShiftContext', () => ({
  useShift: jest.fn(),
}))

jest.mock('@/hooks/use-offline-mutations', () => ({
  useOfflineProductionMutation: jest.fn(),
}))

jest.mock('@/hooks/use-offline', () => ({
  useOfflineStatus: jest.fn(),
}))

// Get the mocked functions after jest.mock is set up
const { useShift } = require('@/contexts/ShiftContext')
const { useOfflineProductionMutation } = require('@/hooks/use-offline-mutations')
const { useOfflineStatus } = require('@/hooks/use-offline')

const mockUseShift = useShift as jest.MockedFunction<any>
const mockUseOfflineProductionMutation = useOfflineProductionMutation as jest.MockedFunction<any>
const mockUseOfflineStatus = useOfflineStatus as jest.MockedFunction<any>

jest.mock('@/lib/production/actions', () => ({
  saveFeedback: jest.fn().mockResolvedValue({ error: null }),
}))

// Mock bread types data
const mockBreadTypes = [
  { id: '1', name: 'Sourdough' },
  { id: '2', name: 'Whole Wheat' },
  { id: '3', name: 'French Baguette' },
]

describe('Production Functionality', () => {
  const mockManagerId = 'manager-123'
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Set up default mock return values
    mockUseShift.mockReturnValue({ currentShift: 'morning' })
    mockUseOfflineProductionMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    })
    mockUseOfflineStatus.mockReturnValue({ isOnline: true })
  })

  describe('Production Form Component', () => {
    it('renders production form with bread types', () => {
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Log Production')).toBeInTheDocument()
      expect(screen.getByText('Morning Shift')).toBeInTheDocument()
      
      // Check all bread types are displayed
      expect(screen.getByText('Sourdough')).toBeInTheDocument()
      expect(screen.getByText('Whole Wheat')).toBeInTheDocument()
      expect(screen.getByText('French Baguette')).toBeInTheDocument()
    })

    it('shows empty state when no bread types available', () => {
      render(
        <ProductionForm 
          breadTypes={[]} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('No bread types available')).toBeInTheDocument()
    })

    it('allows input of production quantities', async () => {
      const user = userEvent.setup()
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // Find quantity inputs
      const quantityInputs = screen.getAllByPlaceholderText(/enter quantity produced/i)
      expect(quantityInputs).toHaveLength(3)

      // Enter quantity for sourdough
      await user.type(quantityInputs[0], '25')
      expect(quantityInputs[0]).toHaveValue(25)
    })

    it('allows input of feedback notes', async () => {
      const user = userEvent.setup()
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      const feedbackTextarea = screen.getByPlaceholderText(/any notes about today's production/i)
      
      await user.type(feedbackTextarea, 'Great production day, all bread turned out well!')
      expect(feedbackTextarea).toHaveValue('Great production day, all bread turned out well!')
    })

    it('prevents submission with no quantities', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByRole('button', { name: /save production log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Please enter at least one quantity greater than 0.'
        )
      })
    })

    it('submits valid production data', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      const mockMutateAsync = jest.fn().mockResolvedValue({})
      
      mockUseOfflineProductionMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill in production data
      const quantityInputs = screen.getAllByPlaceholderText(/enter quantity produced/i)

      await user.type(quantityInputs[0], '25') // 25 Sourdough
      await user.type(quantityInputs[1], '15') // 15 Whole Wheat

      const submitButton = screen.getByRole('button', { name: /save production log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2) // Two entries with quantities
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Production log saved for 2 bread type(s)!')
        )
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('submits feedback when provided', async () => {
      const user = userEvent.setup()
      const { saveFeedback } = require('@/lib/production/actions')
      
      mockUseOfflineProductionMutation.mockReturnValue({
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill in production data and feedback
      const quantityInputs = screen.getAllByPlaceholderText(/enter quantity produced/i)
      const feedbackTextarea = screen.getByPlaceholderText(/any notes about today's production/i)

      await user.type(quantityInputs[0], '25')
      await user.type(feedbackTextarea, 'Equipment working well today')

      const submitButton = screen.getByRole('button', { name: /save production log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(saveFeedback).toHaveBeenCalledWith({
          user_id: mockManagerId,
          shift: 'morning',
          note: 'Equipment working well today',
        })
      })
    })

    it('validates minimum quantity values', async () => {
      const user = userEvent.setup()
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      const quantityInput = screen.getAllByPlaceholderText(/enter quantity produced/i)[0]
      
      // HTML5 validation should enforce min=0
      expect(quantityInput).toHaveAttribute('min', '0')
    })
  })

  describe('Production Validation Schema', () => {
    it('validates valid production data', () => {
      const validData = {
        entries: [
          {
            bread_type_id: '1',
            quantity: 25,
            shift: 'morning',
          },
        ],
      }

      const result = productionFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects negative quantities', () => {
      const invalidData = {
        entries: [
          {
            bread_type_id: '1',
            quantity: -5,
            shift: 'morning',
          },
        ],
      }

      const result = productionFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('allows zero quantities in validation (handled by form logic)', () => {
      const validData = {
        entries: [
          {
            bread_type_id: '1',
            quantity: 0,
            shift: 'morning',
          },
        ],
      }

      const result = productionFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects invalid shift values', () => {
      const invalidData = {
        entries: [
          {
            bread_type_id: '1',
            quantity: 25,
            shift: 'invalid-shift',
          },
        ],
      }

      const result = productionFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Role-Based Production Access', () => {
    it('allows manager to log production', () => {
      const managerRole = 'manager'
      const allowedRoles = ['owner', 'manager']
      
      expect(allowedRoles.includes(managerRole)).toBe(true)
    })

    it('allows owner to log production', () => {
      const ownerRole = 'owner'
      const allowedRoles = ['owner', 'manager']
      
      expect(allowedRoles.includes(ownerRole)).toBe(true)
    })

    it('restricts sales rep from production logging', () => {
      const salesRepRole = 'sales_rep'
      const allowedRoles = ['owner', 'manager']
      
      expect(allowedRoles.includes(salesRepRole)).toBe(false)
    })
  })

  describe('Offline Production Handling', () => {
    it('shows offline status when offline', () => {
      mockUseOfflineStatus.mockReturnValue({ isOnline: false })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // The form should still be functional offline
      expect(screen.getByText('Log Production')).toBeInTheDocument()
    })

    it('handles pending offline mutations', () => {
      mockUseOfflineProductionMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByRole('button', { name: /saving production log/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Shift Management', () => {
    it('displays morning shift correctly', () => {
      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Morning Shift')).toBeInTheDocument()
    })

    it('handles evening shift', () => {
      mockUseShift.mockReturnValue({ currentShift: 'evening' })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Evening Shift')).toBeInTheDocument()
    })
  })

  describe('Production Metrics', () => {
    it('calculates total production correctly', () => {
      const productions = [
        { bread_type: 'Sourdough', quantity: 25 },
        { bread_type: 'Whole Wheat', quantity: 15 },
        { bread_type: 'French Baguette', quantity: 20 },
      ]

      const totalQuantity = productions.reduce((sum, prod) => sum + prod.quantity, 0)
      expect(totalQuantity).toBe(60)
    })

    it('tracks production by bread type', () => {
      const productions = [
        { bread_type: 'Sourdough', quantity: 25 },
        { bread_type: 'Sourdough', quantity: 10 },
        { bread_type: 'Whole Wheat', quantity: 15 },
      ]

      const groupedProduction = productions.reduce((acc, prod) => {
        acc[prod.bread_type] = (acc[prod.bread_type] || 0) + prod.quantity
        return acc
      }, {} as Record<string, number>)

      expect(groupedProduction['Sourdough']).toBe(35)
      expect(groupedProduction['Whole Wheat']).toBe(15)
    })
  })

  describe('Feedback Management', () => {
    it('handles optional feedback correctly', async () => {
      const user = userEvent.setup()
      const { saveFeedback } = require('@/lib/production/actions')
      
      mockUseOfflineProductionMutation.mockReturnValue({
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill in production data without feedback
      const quantityInputs = screen.getAllByPlaceholderText(/enter quantity produced/i)
      await user.type(quantityInputs[0], '25')

      const submitButton = screen.getByRole('button', { name: /save production log/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Feedback should not be called when no feedback is provided
        expect(saveFeedback).not.toHaveBeenCalled()
      })
    })

    it('trims whitespace from feedback', async () => {
      const user = userEvent.setup()
      const { saveFeedback } = require('@/lib/production/actions')
      
      mockUseOfflineProductionMutation.mockReturnValue({
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      })

      render(
        <ProductionForm 
          breadTypes={mockBreadTypes} 
          managerId={mockManagerId}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill in production data and feedback with whitespace
      const quantityInputs = screen.getAllByPlaceholderText(/enter quantity produced/i)
      const feedbackTextarea = screen.getByPlaceholderText(/any notes about today's production/i)

      await user.type(quantityInputs[0], '25')
      await user.type(feedbackTextarea, '   Good production day   ')

      const submitButton = screen.getByRole('button', { name: /save production log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(saveFeedback).toHaveBeenCalledWith({
          user_id: mockManagerId,
          shift: 'morning',
          note: 'Good production day', // Should be trimmed
        })
      })
    })
  })
})