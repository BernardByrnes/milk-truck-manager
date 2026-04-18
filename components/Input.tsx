import { classNames } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={classNames(
          'w-full px-3 py-2.5 rounded-input border border-border',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'placeholder:text-text-secondary text-text-primary',
          error && 'border-danger focus:ring-danger',
          className || ''
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        className={classNames(
          'w-full px-3 py-2.5 rounded-input border border-border',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'text-text-primary bg-white',
          error && 'border-danger focus:ring-danger',
          className || ''
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className, id, ...props }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={classNames(
          'w-full px-3 py-2.5 rounded-input border border-border resize-none',
          'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
          'placeholder:text-text-secondary text-text-primary',
          error && 'border-danger focus:ring-danger',
          className || ''
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}