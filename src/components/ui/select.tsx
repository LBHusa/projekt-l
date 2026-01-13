import * as React from 'react';

// Simple native select implementation (not Radix UI)
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  children?: React.ReactNode;
  onValueChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onValueChange) {
        onValueChange(e.target.value);
      }
    };

    return (
      <select
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm ${className || ''}`}
        ref={ref}
        onChange={handleChange}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export const SelectValue = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectValue.displayName = 'SelectValue';

export const SelectTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...props}>{children}</div>
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectContent.displayName = 'SelectContent';

export const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, children, ...props }, ref) => {
  return (
    <option ref={ref} {...props}>
      {children}
    </option>
  );
});
SelectItem.displayName = 'SelectItem';
