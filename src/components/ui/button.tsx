import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

/**
 * Button component variants - Apple-inspired design system
 * Optimized for mobile touch targets and accessibility
 */
const buttonVariants = cva(
  [
    // Base styles - consistent across all variants
    "inline-flex items-center justify-center gap-2",
    "rounded-lg text-sm font-medium leading-none",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "select-none touch-manipulation", // Mobile optimizations
    // Touch targets
    "min-h-[44px] min-w-[44px]", // iOS minimum
    "md:min-h-[40px] md:min-w-[40px]", // Desktop can be smaller
  ],
  {
    variants: {
      variant: {
        // Primary - Main actions (CTA buttons)
        primary: [
          "bg-orange-500 text-white shadow-sm",
          "hover:bg-orange-600 hover:shadow-md",
          "active:bg-orange-700 active:scale-[0.98]",
          "focus-visible:ring-orange-500",
        ],
        // Secondary - Secondary actions
        secondary: [
          "bg-gray-100 text-gray-900 border border-gray-200",
          "hover:bg-gray-200 hover:border-gray-300",
          "active:bg-gray-300 active:scale-[0.98]",
          "focus-visible:ring-gray-500",
        ],
        // Ghost - Subtle actions
        ghost: [
          "text-gray-700 bg-transparent",
          "hover:bg-gray-100 hover:text-gray-900",
          "active:bg-gray-200 active:scale-[0.98]",
          "focus-visible:ring-gray-500",
        ],
        // Destructive - Delete, remove actions
        destructive: [
          "bg-red-500 text-white shadow-sm",
          "hover:bg-red-600 hover:shadow-md",
          "active:bg-red-700 active:scale-[0.98]",
          "focus-visible:ring-red-500",
        ],
        // Success - Confirm, save actions
        success: [
          "bg-green-500 text-white shadow-sm",
          "hover:bg-green-600 hover:shadow-md",
          "active:bg-green-700 active:scale-[0.98]",
          "focus-visible:ring-green-500",
        ],
        // Outline - Alternative secondary style
        outline: [
          "border border-gray-300 text-gray-700 bg-white",
          "hover:bg-gray-50 hover:border-gray-400",
          "active:bg-gray-100 active:scale-[0.98]",
          "focus-visible:ring-gray-500",
        ],
        // Link - Text-only actions
        link: [
          "text-orange-500 underline-offset-4 bg-transparent p-0 h-auto",
          "hover:underline hover:text-orange-600",
          "active:text-orange-700",
          "focus-visible:ring-orange-500",
          "min-h-0 min-w-0", // Override touch targets for link style
        ],
      },
      size: {
        sm: "h-9 px-3 text-xs gap-1",
        default: "h-11 px-6 py-2 gap-2",
        lg: "h-12 px-8 text-base gap-2",
        xl: "h-14 px-10 text-lg gap-3",
        icon: "h-11 w-11 p-0 gap-0",
        "icon-sm": "h-9 w-9 p-0 gap-0",
        "icon-lg": "h-12 w-12 p-0 gap-0",
      },
      width: {
        auto: "w-auto",
        full: "w-full",
        fit: "w-fit",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      width: "auto",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Production-ready Button component with Apple-quality design
 * Features:
 * - Mobile-optimized touch targets
 * - Smooth animations with Framer Motion
 * - Loading state support
 * - Icon support (left/right)
 * - Accessibility built-in
 * - Multiple variants and sizes
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    
    const isDisabled = disabled || loading

    // Motion variants for smooth animations
    const motionVariants = {
      initial: { scale: 1 },
      hover: { scale: variant === "link" ? 1 : 1.02 },
      tap: { scale: variant === "link" ? 1 : 0.98 },
    }

    const buttonContent = (
      <>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </motion.div>
        )}
        
        {!loading && leftIcon && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            {leftIcon}
          </motion.span>
        )}
        
        {children && (
          <span className={loading ? "opacity-0" : "opacity-100 transition-opacity"}>
            {children}
          </span>
        )}
        
        {!loading && rightIcon && (
          <motion.span
            initial={{ opacity: 0, x: 4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center"
          >
            {rightIcon}
          </motion.span>
        )}
      </>
    )

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, width, className }))}
          ref={ref}
          {...props}
        >
          {buttonContent}
        </Slot>
      )
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, width, className }))}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants } 