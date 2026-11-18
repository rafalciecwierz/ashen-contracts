import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SubmitEvent } from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { Button } from '..';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Enter the Clearing',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Cancel',
  },
};

const onSubmit = fn((event: SubmitEvent) => event.preventDefault());

export const InsideForm: Story = {
  render: (args) => (
    <form onSubmit={onSubmit}>
      <Button {...args}>Cancel</Button>
    </form>
  ),
  args: { variant: 'secondary' },
  play: async ({ canvas }) => {
    onSubmit.mockClear();
    const button = canvas.getByRole('button', { name: 'Cancel' });
    await expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    await expect(onSubmit).not.toHaveBeenCalled();
  },
};

export const ClassNameOverride: Story = {
  args: {
    variant: 'primary',
    className: 'bg-error px-8',
    children: 'Abandon contract',
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Abandon contract' });
    await expect(button).toHaveClass('bg-error', 'px-8', 'py-2');
    await expect(button).not.toHaveClass('bg-brand-600');
    await expect(button).not.toHaveClass('px-5');
  },
};
