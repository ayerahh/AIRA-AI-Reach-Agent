import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05rem",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            "--radius": borderRadius,
            "--shimmer-color": shimmerColor,
            "--shimmer-duration": shimmerDuration,
            "--background": background,
          } as CSSProperties
        }
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--background)] [border-radius:var(--radius)] transition-transform active:scale-95 shadow-2xl",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div className="absolute inset-0 -z-10 [border-radius:var(--radius)] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude]">
          <div className="absolute inset-0 animate-[shimmer_var(--shimmer-duration)_linear_infinite] bg-[conic-gradient(from_0deg,transparent_20%,var(--shimmer-color)_40%,transparent_60%)] [margin:calc(var(--shimmer-size)*-1)] [mask:linear-gradient(#fff_0_0)]" />
        </div>
        {children}
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";