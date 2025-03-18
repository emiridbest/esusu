import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        glass: "backdrop-blur-md bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-800 shadow-sm hover:bg-white/40 dark:hover:bg-black/40",
        outline: "border border-primary bg-transparent text-primary hover:bg-primary/10",
        ghost: "text-primary hover:bg-primary/10",
        dark: "bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 py-1",
        lg: "h-12 px-6 py-3",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }