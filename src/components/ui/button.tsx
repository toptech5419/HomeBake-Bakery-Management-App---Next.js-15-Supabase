'use client';

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
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
        destructive: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
        outline: "border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300",
        ghost: "text-gray-700 hover:bg-gray-50 active:bg-gray-100",
        link: "underline-offset-4 hover:underline text-orange-600",
        success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
        primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const isDisabled = disabled || loading

    const buttonContent = (
      <div className="flex items-center justify-center gap-2">
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
      </div>
    )

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
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
        type="button"
        className={cn(buttonVariants({ variant, size, className }))}
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