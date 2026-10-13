import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '..';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md'] },
  },
};
export default meta;

type Story = StoryObj<typeof Avatar>;

export const Initial: Story = {
  args: { name: 'Unnamed Hero' },
};

export const Small: Story = {
  args: { name: 'Geralt', size: 'sm' },
};

// Inline SVG as a data URI so the story doesn't depend on any external image.
const sampleImage =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' fill='%23444'/><circle cx='20' cy='16' r='7' fill='%23999'/><rect x='8' y='26' width='24' height='14' rx='7' fill='%23999'/></svg>";

export const WithImage: Story = {
  args: { name: 'Drizzt', src: sampleImage },
};
