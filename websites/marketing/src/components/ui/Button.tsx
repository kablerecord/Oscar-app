import { ButtonHTMLAttributes, forwardRef } from 'react'
import Link from 'next/link'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', href, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600 hover:shadow-blue-500/40',
      secondary: 'bg-slate-700 text-white hover:bg-slate-600',
      outline: 'border-2 border-blue-500 text-blue-400 hover:bg-blue-500/10',
      ghost: 'text-slate-300 hover:text-white hover:bg-slate-800',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`

    if (href) {
      return (
        <Link href={href} className={combinedClassName}>
          {children}
        </Link>
      )
    }

    return (
      <button ref={ref} className={combinedClassName} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
