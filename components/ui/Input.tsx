import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label flex items-center gap-2">
            {icon}
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn("input", error && "border-danger focus:ring-danger/30 focus:border-danger", className)}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
