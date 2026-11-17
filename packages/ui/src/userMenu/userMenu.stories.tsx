import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent } from 'storybook/test';
import { Navbar, UserMenu } from '..';

const meta: Meta<typeof UserMenu> = {
  title: 'Components/UserMenu',
  component: UserMenu,
};
export default meta;

type Story = StoryObj<typeof UserMenu>;

const items = [
  {
    id: 'logout',
    label: 'Log out',
    onSelect: () => console.log('Log out selected'),
  },
];

export const Default: Story = {
  args: {
    name: 'Unnamed Hero',
    description: 'hero@example.com',
    items,
  },
};

const onSelectSettings = fn();
const onSelectLogout = fn();

/** "Log out" is disabled, as while its action is pending. */
export const WithDisabledItem: Story = {
  args: {
    name: 'Unnamed Hero',
    description: 'hero@example.com',
    items: [
      { id: 'settings', label: 'Settings', onSelect: onSelectSettings },
      {
        id: 'logout',
        label: 'Log out',
        onSelect: onSelectLogout,
        disabled: true,
      },
    ],
  },
  play: async ({ canvas }) => {
    onSelectLogout.mockClear();
    await userEvent.click(canvas.getByRole('button'));

    // The menu renders in a portal, outside the story's canvas.
    const logout = await screen.findByRole('menuitem', { name: 'Log out' });
    await expect(logout).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(logout, { pointerEventsCheck: 0 });
    await expect(onSelectLogout).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    await expect(onSelectSettings).toHaveBeenCalledOnce();
  },
};

export const InsideNavbar: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <Navbar
      left={
        <span className="font-heading text-lg text-ink">Ashen Contracts</span>
      }
      right={
        <UserMenu
          name="Unnamed Hero"
          description="hero@example.com"
          items={items}
        />
      }
    />
  ),
};
