import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] text-white border-0 hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)] disabled:bg-[var(--color-primary-disabled)] disabled:cursor-not-allowed cursor-pointer',
  secondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
  ghost:
    'bg-transparent text-gray-400 border-0 hover:text-gray-700 active:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
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
