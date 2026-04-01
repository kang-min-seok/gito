import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white border-0 hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:bg-[var(--color-primary-disabled)] disabled:cursor-not-allowed cursor-pointer',
  secondary:
    'bg-transparent text-[#f1f5f9] border border-[#30363d] hover:bg-[#1c2128] active:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
  ghost:
    'bg-transparent text-[#64748b] border-0 hover:text-[#94a3b8] active:text-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer',
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-6 py-2.5 text-sm rounded-lg',
  sm: 'px-3 py-1.5 text-[13px] rounded-md',
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: React.ReactNode;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type AnchorProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

type Props = ButtonProps | AnchorProps;

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props) {
  const base = 'inline-flex items-center justify-center font-medium no-underline';
  const variantClass = VARIANT_CLASSES[variant];
  const sizeClass = SIZE_CLASSES[size];
  const combinedClass = `${base} ${variantClass} ${sizeClass} ${className}`.trim();

  if ('href' in rest && rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorProps;
    return (
      <a href={href} className={combinedClass} {...anchorRest}>
        {children}
      </a>
    );
  }

  return (
    <button className={combinedClass} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
