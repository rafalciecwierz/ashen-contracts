import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './Modal.component';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
  argTypes: {
  },
};
export default meta;

type Story = StoryObj<typeof Modal>;

export const Example: Story = {
  args: {
  },
};