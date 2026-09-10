import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="label flex items-center gap-2">
            {icon}
            {label}
          </label>
        )}
        <textarea
          id={id}
          ref={ref}
          className={cn(
            "input min-h-[110px] resize-y",
            error && "border-danger focus:ring-danger/30 focus:border-danger",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
