import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-0 hover:-translate-y-px touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-hover shadow-sm",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm",
        outline: "border border-input bg-paper-elev hover:bg-paper-sunken text-ink",
        secondary: "bg-secondary text-secondary-foreground hover:bg-paper-sunken",
        ghost: "hover:bg-paper-sunken text-ink-soft hover:text-ink",
        link: "text-brand underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px] sm:min-h-0",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
