import { initials } from '../lib/utils';
import { cn } from '../lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-olive-500 text-xs font-bold text-white',
        className
      )}
    >
      {initials(name)}
    </div>
  );
}
