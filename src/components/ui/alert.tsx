'use client';

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

/**
 * Alert component variants - Apple-inspired design system
 * Optimized for mobile and accessibility
 */
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-red-500/50 text-red-600 dark:border-red-500 [&>svg]:text-red-600",
        warning:
          "border-yellow-500/50 text-yellow-800 bg-yellow-50 dark:border-yellow-500 [&>svg]:text-yellow-800",
        success:
          "border-green-500/50 text-green-800 bg-green-50 dark:border-green-500 [&>svg]:text-green-800",
        info:
          "border-blue-500/50 text-blue-800 bg-blue-50 dark:border-blue-500 [&>svg]:text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * Production-ready Alert component with Apple-quality design
 * Features:
 * - Mobile-optimized spacing and typography
 * - Smooth animations with Framer Motion
 * - Multiple variants for different message types
 * - Accessibility built-in
 * - Icon support
 */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <motion.div
    ref={ref}
    role="alert"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }