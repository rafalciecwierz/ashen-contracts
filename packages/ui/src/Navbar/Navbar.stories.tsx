import type { Meta, StoryObj } from '@storybook/react-vite';
import { Navbar } from './Navbar.component';
import { Button } from '../Button/Button.component';
import { Avatar } from '../Avatar/Avatar.component';

const meta: Meta<typeof Navbar> = {
  title: 'Components/Navbar',
  component: Navbar,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof Navbar>;

const Logo = () => <span className="font-heading text-lg text-ink">Ashen Contracts</span>;

export const LoggedOut: Story = {
  args: {
    left: <Logo />,
    right: (
      <>
        <Button variant="secondary">Log in</Button>
        <Button>Create account</Button>
      </>
    ),
  },
};

export const LoggedIn: Story = {
  args: {
    left: <Logo />,
    center: <span className="text-sm text-ink-muted">Energy bar goes here</span>,
    right: <Avatar name="Unnamed Hero" />,
  },
};