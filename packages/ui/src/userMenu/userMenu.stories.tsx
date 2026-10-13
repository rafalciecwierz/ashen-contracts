import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navbar, UserMenu } from '..';

const meta: Meta<typeof UserMenu> = {
  title: 'Components/UserMenu',
  component: UserMenu,
};
export default meta;

type Story = StoryObj<typeof UserMenu>;

const items = [
  { label: 'Log out', onSelect: () => console.log('Log out selected') },
];

export const Default: Story = {
  args: {
    name: 'Unnamed Hero',
    description: 'hero@example.com',
    items,
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
