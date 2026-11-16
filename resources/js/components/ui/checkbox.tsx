import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-[5px] border border-tijum-surface/80 dark:border-border bg-white dark:bg-card shadow-2xs transition-[color,background-color,border-color,box-shadow] outline-none focus-visible:border-tijum-coral focus-visible:ring-[3px] focus-visible:ring-tijum-coral/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-tijum-coral data-[state=checked]:bg-tijum-coral data-[state=checked]:text-white disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
