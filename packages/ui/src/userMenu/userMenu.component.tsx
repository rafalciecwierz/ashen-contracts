'use client';

import { DropdownMenu } from 'radix-ui';
import { Avatar } from '..';

export interface UserMenuItem {
  label: string;
  onSelect: () => void;
}

export interface UserMenuProps {
  /** Shown as the avatar's label and as the heading of the menu. */
  name: string;
  /** Secondary line under the name, e.g. the account email. */
  description?: string;
  /** Avatar image URL; the initial of `name` is shown when absent. */
  avatarSrc?: string;
  items: UserMenuItem[];
}

export function UserMenu({
  name,
  description,
  avatarSrc,
  items,
}: UserMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Avatar name={name} src={avatarSrc} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-lg border border-surface-raised bg-surface p-1 font-body text-ink shadow-xl"
        >
          <DropdownMenu.Label className="px-3 py-2">
            <div className="text-sm font-semibold text-ink">{name}</div>
            {description && (
              <div className="text-xs text-ink-muted">{description}</div>
            )}
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-1 h-px bg-surface-raised" />

          {items.map((item) => (
            <DropdownMenu.Item
              key={item.label}
              onSelect={item.onSelect}
              className="cursor-pointer rounded px-3 py-2 text-sm outline-none data-highlighted:bg-surface-raised"
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
