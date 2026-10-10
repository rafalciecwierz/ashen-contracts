export interface AvatarProps {
  /** Used for the fallback initial and as the accessible label. */
  name: string;
  /** Image URL. When absent, the first letter of `name` is shown instead. */
  src?: string;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
};

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initial = (Array.from(name.trim())[0] ?? '?').toUpperCase();

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 font-body font-semibold text-ink ${sizeStyles[size]}`}
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initial}
    </span>
  );
}