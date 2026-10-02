import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const baseVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-[2px] border-[1.5px] font-sans font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:bg-machine disabled:text-paper [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-signal text-white hover:bg-signal-hover",
        outline: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        secondary: "border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
        ghost: "border-transparent px-1 text-ink underline-offset-4 decoration-2 hover:underline",
        destructive: "border-signal-ink bg-transparent text-signal-ink hover:bg-signal-soft",
        mp: "border-transparent bg-mp text-ink hover:brightness-95",
        inverse: "border-paper bg-transparent text-paper hover:bg-paper hover:text-ink",
        link: "border-transparent px-0 text-ink underline underline-offset-4 decoration-2",
      },
      size: {
        default: "min-h-11 px-6 text-base",
        sm: "min-h-9 px-4 text-sm",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonVariantProps = VariantProps<typeof baseVariants> & { className?: string }

/** Variant classes merged with tailwind-merge, so a caller's className wins over the base. */
function buttonVariants({ className, ...props }: ButtonVariantProps = {}) {
  return cn(baseVariants(props), className)
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof baseVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={(state) =>
        buttonVariants({ variant, size, className: typeof className === "function" ? className(state) : className })
      }
      {...props}
    />
  )
}

export { Button, buttonVariants }
