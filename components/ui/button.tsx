'use client';

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
    asChild?: boolean;
    isLoading?: boolean;
    loadingText?: string;
    debounceTime?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    isLoading, 
    loadingText = "Loading...", 
    onClick, 
    children,
    debounceTime = 300,
    ...props 
  }, ref) => {
    const [isClicked, setIsClicked] = React.useState(false);
    const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    
    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
        }
      };
    }, []);
    
    // Handle click with debounce to prevent multiple rapid clicks
    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLoading || isClicked || props.disabled) return;
        
        setIsClicked(true);
        
        // Only call onClick immediately if there's no debounce
        if (onClick && debounceTime === 0) {
          onClick(e);
        } else if (onClick) {
          // Otherwise debounce the click
          clickTimeoutRef.current = setTimeout(() => {
            onClick(e);
          }, debounceTime);
        }
        
        // Reset clicked state after a short delay
        setTimeout(() => {
          setIsClicked(false);
        }, Math.max(debounceTime, 200));
      },
      [onClick, isLoading, isClicked, props.disabled, debounceTime]
    );
    
    // For asChild, we need to handle differently
    if (asChild) {
      const Comp = Slot;
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    // Render button with loading state
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={isLoading || isClicked || props.disabled}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg 
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              ></circle>
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {loadingText}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants }
