import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-semibold transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)] disabled:pointer-events-none disabled:opacity-45 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--navy)] text-white shadow-[0_10px_28px_rgba(30,41,59,0.14)] hover:bg-[var(--navy-light)]",
        amber:
          "bg-[var(--amber)] text-white shadow-[0_10px_28px_rgba(168,132,44,0.2)] hover:bg-[var(--amber-light)]",
        secondary:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-dark)] hover:text-[var(--navy)]",
        ghost: "text-[var(--text-secondary)] hover:bg-[var(--surface-alt)] hover:text-[var(--navy)]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-xl px-3 text-sm",
        lg: "h-[52px] px-5 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
