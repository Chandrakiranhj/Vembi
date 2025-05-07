"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  isLoading?: boolean;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, isLoading, children, onClick, ...props }, ref) => {
  const [localLoading, setLocalLoading] = React.useState(false);
  
  // Handle click with loading indicator
  const handleClick = React.useCallback((e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setLocalLoading(true);
    
    // Reset loading state after a delay if isLoading prop isn't provided
    if (isLoading === undefined) {
      setTimeout(() => {
        setLocalLoading(false);
      }, 500); // Default timeout if no external loading state is provided
    }
    
    // Call the original onClick if provided
    if (onClick) {
      onClick(e);
    }
  }, [onClick, isLoading]);
  
  // Use either prop-based loading or local loading state
  const showLoading = isLoading ?? localLoading;
  
  // Reset local loading when isLoading prop changes to false
  React.useEffect(() => {
    if (isLoading === false) {
      setLocalLoading(false);
    }
  }, [isLoading]);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        showLoading && "relative",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      {children}
      {showLoading && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-sm">
          <Spinner size="sm" />
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent } 