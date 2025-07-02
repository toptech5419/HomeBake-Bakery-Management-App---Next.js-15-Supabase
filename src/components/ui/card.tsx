import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

/**
 * Card component variants - Apple-inspired design system
 * Clean, modern cards for data presentation
 */
const cardVariants = cva(
  [
    // Base styles
    "bg-white rounded-lg border border-gray-200 shadow-sm",
    "transition-all duration-200 ease-out",
    "overflow-hidden", // Ensure content doesn't break borders
  ],
  {
    variants: {
      variant: {
        default: "bg-white border-gray-200",
        elevated: "shadow-md hover:shadow-lg",
        outline: "border-2 border-gray-200 shadow-none",
        filled: "bg-gray-50 border-gray-200",
        success: "bg-green-50 border-green-200",
        warning: "bg-amber-50 border-amber-200",
        error: "bg-red-50 border-red-200",
        info: "bg-blue-50 border-blue-200",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
      hover: {
        none: "",
        lift: "hover:shadow-md hover:-translate-y-1",
        glow: "hover:shadow-lg hover:shadow-orange-100",
        scale: "hover:scale-[1.02] active:scale-[0.98]",
      },
      interactive: {
        true: "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      hover: "none",
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, hover, interactive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "div" : "div"

    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, size, hover, interactive, className }))}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? "button" : undefined}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

/**
 * Card Header - For titles and actions
 */
const cardHeaderVariants = cva(
  [
    "flex flex-col space-y-1.5",
    "pb-4 border-b border-gray-100",
  ],
  {
    variants: {
      alignment: {
        left: "items-start text-left",
        center: "items-center text-center",
        right: "items-end text-right",
      },
      spacing: {
        none: "pb-0 border-b-0",
        sm: "pb-2",
        default: "pb-4",
        lg: "pb-6",
      },
    },
    defaultVariants: {
      alignment: "left",
      spacing: "default",
    },
  }
)

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, alignment, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ alignment, spacing, className }))}
      {...props}
    />
  )
)
CardHeader.displayName = "CardHeader"

/**
 * Card Title - Primary heading
 */
const cardTitleVariants = cva(
  [
    "font-semibold leading-none tracking-tight",
    "text-gray-900",
  ],
  {
    variants: {
      size: {
        sm: "text-lg",
        default: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof cardTitleVariants> {}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, size, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(cardTitleVariants({ size, className }))}
      {...props}
    />
  )
)
CardTitle.displayName = "CardTitle"

/**
 * Card Description - Secondary text
 */
const cardDescriptionVariants = cva(
  [
    "text-gray-600 leading-relaxed",
  ],
  {
    variants: {
      size: {
        sm: "text-xs",
        default: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof cardDescriptionVariants> {}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(cardDescriptionVariants({ size, className }))}
      {...props}
    />
  )
)
CardDescription.displayName = "CardDescription"

/**
 * Card Content - Main content area
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

/**
 * Card Footer - Actions and secondary content
 */
const cardFooterVariants = cva(
  [
    "flex items-center",
    "pt-4 border-t border-gray-100",
  ],
  {
    variants: {
      alignment: {
        left: "justify-start",
        center: "justify-center",
        right: "justify-end",
        between: "justify-between",
        around: "justify-around",
      },
      spacing: {
        none: "pt-0 border-t-0",
        sm: "pt-2",
        default: "pt-4",
        lg: "pt-6",
      },
    },
    defaultVariants: {
      alignment: "right",
      spacing: "default",
    },
  }
)

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, alignment, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ alignment, spacing, className }))}
      {...props}
    />
  )
)
CardFooter.displayName = "CardFooter"

/**
 * Metric Card - Special card for displaying metrics/KPIs
 */
export interface MetricCardProps extends Omit<CardProps, 'children'> {
  title: string
  value: string | number
  description?: string
  change?: {
    value: string | number
    type: 'increase' | 'decrease' | 'neutral'
    period?: string
  }
  icon?: React.ReactNode
  loading?: boolean
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ 
    title, 
    value, 
    description, 
    change, 
    icon, 
    loading = false,
    className,
    ...props 
  }, ref) => {
    return (
      <Card
        ref={ref}
        variant="elevated"
        hover="lift"
        className={cn("transition-all duration-200", loading && "animate-pulse", className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "---" : value}
              </p>
              {change && !loading && (
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    change.type === 'increase' && "text-green-700 bg-green-100",
                    change.type === 'decrease' && "text-red-700 bg-red-100",
                    change.type === 'neutral' && "text-gray-700 bg-gray-100"
                  )}
                >
                  {change.type === 'increase' && '↗'}
                  {change.type === 'decrease' && '↘'}
                  {change.type === 'neutral' && '→'}
                  {' '}{change.value}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
            {change?.period && !loading && (
              <p className="text-xs text-gray-400 mt-1">vs {change.period}</p>
            )}
          </div>
          {icon && (
            <div className="ml-4 flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                {icon}
              </div>
            </div>
          )}
        </div>
      </Card>
    )
  }
)
MetricCard.displayName = "MetricCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  MetricCard,
  cardVariants,
} 