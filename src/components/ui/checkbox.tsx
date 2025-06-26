import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          ref={ref}
          className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ${className || ''}`}
          {...props}
        />
        {label && <label className="text-sm text-gray-700 select-none">{label}</label>}
        {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox'; 