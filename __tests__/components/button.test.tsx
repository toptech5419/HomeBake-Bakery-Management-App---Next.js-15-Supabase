import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies default variant styles', () => {
    render(<Button>Default Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('bg-primary')
    expect(button).toHaveClass('text-primary-foreground')
  })

  it('applies destructive variant styles', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('bg-destructive')
    expect(button).toHaveClass('text-destructive-foreground')
  })

  it('applies outline variant styles', () => {
    render(<Button variant="outline">Outline Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('border-input')
  })

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('bg-secondary')
    expect(button).toHaveClass('text-secondary-foreground')
  })

  it('applies ghost variant styles', () => {
    render(<Button variant="ghost">Ghost Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('hover:bg-accent')
  })

  it('applies link variant styles', () => {
    render(<Button variant="link">Link Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('text-primary')
    expect(button).toHaveClass('underline-offset-4')
  })

  it('applies small size styles', () => {
    render(<Button size="sm">Small Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('h-9')
    expect(button).toHaveClass('px-3')
  })

  it('applies large size styles', () => {
    render(<Button size="lg">Large Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('h-11')
    expect(button).toHaveClass('px-8')
  })

  it('applies icon size styles', () => {
    render(<Button size="icon">Icon</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('h-10')
    expect(button).toHaveClass('w-10')
  })

  it('shows loading state correctly', () => {
    render(<Button loading>Loading Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument() // Loading spinner
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
  })

  it('disables button when loading is true', () => {
    render(<Button loading>Loading Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>()
    render(<Button ref={ref}>Ref Button</Button>)
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('renders as different element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('handles keyboard events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Keyboard Button</Button>)
    
    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('has proper accessibility attributes', () => {
    render(<Button>Accessible Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toHaveAttribute('aria-disabled')
  })

  it('has proper accessibility attributes when disabled', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button')
    
    expect(button).toBeDisabled()
  })

  describe('Responsive Design', () => {
    it('maintains minimum touch target size', () => {
      render(<Button size="sm">Small Button</Button>)
      const button = screen.getByRole('button')
      
      // Even small buttons should maintain reasonable touch targets
      expect(button).toHaveClass('h-9') // 36px minimum
    })

    it('scales appropriately for mobile', () => {
      render(<Button>Mobile Button</Button>)
      const button = screen.getByRole('button')
      
      // Default size should be mobile-friendly
      expect(button).toHaveClass('h-10') // 40px touch target
    })
  })

  describe('Loading State', () => {
    it('shows spinner when loading', () => {
      render(<Button loading>Loading</Button>)
      
      // Check for spinner SVG
      const spinner = screen.getByRole('img', { hidden: true })
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })

    it('preserves children content when loading', () => {
      render(<Button loading>Save Changes</Button>)
      
      expect(screen.getByText('Save Changes')).toBeInTheDocument()
    })

    it('prevents interaction when loading', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button loading onClick={handleClick}>Loading Button</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
      expect(button).toBeDisabled()
    })
  })

  describe('Form Integration', () => {
    it('works as submit button in forms', () => {
      const handleSubmit = jest.fn(e => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const button = screen.getByRole('button')
      fireEvent.click(button)
      
      expect(handleSubmit).toHaveBeenCalledTimes(1)
    })

    it('works as reset button in forms', () => {
      render(
        <form>
          <input defaultValue="test" />
          <Button type="reset">Reset</Button>
        </form>
      )
      
      const button = screen.getByRole('button')
      const input = screen.getByRole('textbox') as HTMLInputElement
      
      fireEvent.click(button)
      
      expect(input.value).toBe('')
    })
  })
})