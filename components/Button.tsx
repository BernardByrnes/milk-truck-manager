import { classNames } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className, ...props }: ButtonProps) {
  const baseStyles = 'font-medium rounded-button transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]',
    secondary: 'border border-border text-text-primary hover:bg-gray-50 active:scale-[0.98]',
    danger: 'bg-danger text-white hover:bg-red-600 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={classNames(baseStyles, variants[variant], sizes[size], className || '')}
      {...props}
    >
      {children}
    </button>
  );
}