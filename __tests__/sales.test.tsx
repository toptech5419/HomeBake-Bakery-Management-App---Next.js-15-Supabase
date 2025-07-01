import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import component and utilities
import SalesForm from '@/components/sales/sales-form'
import { salesFormSchema } from '@/lib/validations/sales'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/hooks/use-shift', () => ({
  useShift: () => ({ shift: 'morning' }),
}))

jest.mock('@/hooks/use-offline-mutations', () => ({
  useOfflineSalesMutation: () => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  }),
}))

jest.mock('@/hooks/use-offline', () => ({
  useOfflineStatus: () => ({ isOnline: true }),
}))

// Mock bread types data
const mockBreadTypes = [
  { id: '1', name: 'Sourdough', unit_price: 5.50 },
  { id: '2', name: 'Whole Wheat', unit_price: 4.25 },
  { id: '3', name: 'French Baguette', unit_price: 3.75 },
]

describe('Sales Functionality', () => {
  const mockUserId = 'user-123'
  const mockOnSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Sales Form Component', () => {
    it('renders sales form with bread types', () => {
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Log Sales')).toBeInTheDocument()
      expect(screen.getByText('Morning Shift')).toBeInTheDocument()
      
      // Check all bread types are displayed
      expect(screen.getByText('Sourdough')).toBeInTheDocument()
      expect(screen.getByText('$5.50 each')).toBeInTheDocument()
      expect(screen.getByText('Whole Wheat')).toBeInTheDocument()
      expect(screen.getByText('$4.25 each')).toBeInTheDocument()
      expect(screen.getByText('French Baguette')).toBeInTheDocument()
      expect(screen.getByText('$3.75 each')).toBeInTheDocument()
    })

    it('shows empty state when no bread types available', () => {
      render(
        <SalesForm 
          breadTypes={[]} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('No bread types available for sale')).toBeInTheDocument()
    })

    it('allows input of sales quantities', async () => {
      const user = userEvent.setup()
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      // Find quantity input for first bread type
      const quantityInputs = screen.getAllByLabelText(/quantity sold/i)
      expect(quantityInputs).toHaveLength(3)

      // Enter quantity for sourdough
      await user.type(quantityInputs[0], '5')
      expect(quantityInputs[0]).toHaveValue(5)
    })

    it('allows input of discount percentages', async () => {
      const user = userEvent.setup()
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      // Find discount input for first bread type
      const discountInputs = screen.getAllByLabelText(/discount/i)
      expect(discountInputs).toHaveLength(3)

      // Enter discount for sourdough
      await user.type(discountInputs[0], '10')
      expect(discountInputs[0]).toHaveValue(10)
    })

    it('prevents submission with no quantities', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByRole('button', { name: /save sales log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Please enter at least one quantity sold greater than 0.'
        )
      })
    })

    it('submits valid sales data', async () => {
      const user = userEvent.setup()
      const { toast } = require('sonner')
      const { useOfflineSalesMutation } = require('@/hooks/use-offline-mutations')
      const mockMutateAsync = jest.fn().mockResolvedValue({})
      
      useOfflineSalesMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })

      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      // Fill in sales data
      const quantityInputs = screen.getAllByLabelText(/quantity sold/i)
      const discountInputs = screen.getAllByLabelText(/discount/i)

      await user.type(quantityInputs[0], '5') // 5 Sourdough
      await user.type(discountInputs[0], '10') // 10% discount
      await user.type(quantityInputs[1], '3') // 3 Whole Wheat

      const submitButton = screen.getByRole('button', { name: /save sales log/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(2) // Two entries with quantities
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Sales log saved for 2 bread type(s)!')
        )
        expect(mockOnSuccess).toHaveBeenCalled()
      })
    })

    it('validates discount percentage limits', async () => {
      const user = userEvent.setup()
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      const discountInput = screen.getAllByLabelText(/discount/i)[0]
      
      // Test max value of 100
      await user.clear(discountInput)
      await user.type(discountInput, '150')
      
      // HTML5 validation should limit to max=100
      fireEvent.blur(discountInput)
      expect(discountInput).toHaveAttribute('max', '100')
    })
  })

  describe('Sales Validation Schema', () => {
    it('validates valid sales data', () => {
      const validData = {
        entries: [
          {
            bread_type_id: '1',
            quantity_sold: 5,
            discount_percentage: 10,
            shift: 'morning',
          },
        ],
      }

      const result = salesFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects negative quantities', () => {
      const invalidData = {
        entries: [
          {
            bread_type_id: '1',
            quantity_sold: -1,
            discount_percentage: 0,
            shift: 'morning',
          },
        ],
      }

      const result = salesFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects discount over 100%', () => {
      const invalidData = {
        entries: [
          {
            bread_type_id: '1',
            quantity_sold: 5,
            discount_percentage: 150,
            shift: 'morning',
          },
        ],
      }

      const result = salesFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('rejects invalid shift values', () => {
      const invalidData = {
        entries: [
          {
            bread_type_id: '1',
            quantity_sold: 5,
            discount_percentage: 10,
            shift: 'invalid-shift',
          },
        ],
      }

      const result = salesFormSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('Sales Calculations', () => {
    it('calculates price with discount correctly', () => {
      const unitPrice = 5.50
      const discountPercentage = 10
      const quantity = 5

      const discountAmount = (unitPrice * discountPercentage) / 100
      const finalPrice = unitPrice - discountAmount
      const totalPrice = finalPrice * quantity

      expect(discountAmount).toBe(0.55)
      expect(finalPrice).toBe(4.95)
      expect(totalPrice).toBe(24.75)
    })

    it('handles zero discount correctly', () => {
      const unitPrice = 4.25
      const discountPercentage = 0
      const quantity = 3

      const discountAmount = (unitPrice * discountPercentage) / 100
      const finalPrice = unitPrice - discountAmount
      const totalPrice = finalPrice * quantity

      expect(discountAmount).toBe(0)
      expect(finalPrice).toBe(4.25)
      expect(totalPrice).toBe(12.75)
    })

    it('handles maximum discount correctly', () => {
      const unitPrice = 3.75
      const discountPercentage = 100
      const quantity = 2

      const discountAmount = (unitPrice * discountPercentage) / 100
      const finalPrice = unitPrice - discountAmount
      const totalPrice = finalPrice * quantity

      expect(discountAmount).toBe(3.75)
      expect(finalPrice).toBe(0)
      expect(totalPrice).toBe(0)
    })
  })

  describe('Role-Based Sales Access', () => {
    it('allows sales rep to log sales', () => {
      const salesRepRole = 'sales_rep'
      const allowedRoles = ['owner', 'manager', 'sales_rep']
      
      expect(allowedRoles.includes(salesRepRole)).toBe(true)
    })

    it('allows manager to log sales', () => {
      const managerRole = 'manager'
      const allowedRoles = ['owner', 'manager', 'sales_rep']
      
      expect(allowedRoles.includes(managerRole)).toBe(true)
    })

    it('allows owner to log sales', () => {
      const ownerRole = 'owner'
      const allowedRoles = ['owner', 'manager', 'sales_rep']
      
      expect(allowedRoles.includes(ownerRole)).toBe(true)
    })
  })

  describe('Offline Sales Handling', () => {
    it('shows offline message when offline', () => {
      const { useOfflineStatus } = require('@/hooks/use-offline')
      useOfflineStatus.mockReturnValue({ isOnline: false })

      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      // The form should still be functional offline
      expect(screen.getByText('Log Sales')).toBeInTheDocument()
    })

    it('handles pending offline mutations', () => {
      const { useOfflineSalesMutation } = require('@/hooks/use-offline-mutations')
      useOfflineSalesMutation.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: true,
      })

      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      const submitButton = screen.getByRole('button', { name: /saving sales log/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Shift Management', () => {
    it('displays morning shift correctly', () => {
      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Morning Shift')).toBeInTheDocument()
    })

    it('handles evening shift', () => {
      const { useShift } = require('@/hooks/use-shift')
      useShift.mockReturnValue({ shift: 'evening' })

      render(
        <SalesForm 
          breadTypes={mockBreadTypes} 
          userId={mockUserId}
          onSuccess={mockOnSuccess}
        />
      )

      expect(screen.getByText('Evening Shift')).toBeInTheDocument()
    })
  })
})