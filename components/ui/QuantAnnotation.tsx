type QuantAnnotationProps = {
  className?: string;
  variant?: "bracket" | "underline";
};

export function QuantAnnotation({ className = "", variant = "underline" }: QuantAnnotationProps) {
  const commonProps = {
    "aria-hidden": true,
    className: `pointer-events-none ${className}`,
    fill: "none",
    focusable: "false" as const,
  };

  if (variant === "bracket") {
    return (
      <svg {...commonProps} viewBox="0 0 32 112">
        <path d="M25 4C12 15 12 31 15 48c3 17 1 39-10 59" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
        <path d="M29 8C18 20 18 34 20 49c2 18 0 38-9 55" opacity=".42" stroke="currentColor" strokeLinecap="round" strokeWidth=".8" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} viewBox="0 0 144 18">
      <path d="M3 11c31-4 74-6 138-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
      <path d="M10 15c38-4 78-5 124-3" opacity=".42" stroke="currentColor" strokeLinecap="round" strokeWidth=".8" />
    </svg>
  );
}
