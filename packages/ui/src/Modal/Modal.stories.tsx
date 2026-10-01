import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Modal } from './Modal.component';
import { Button } from '../Button/Button.component';

const meta: Meta<typeof Modal> = {
  title: 'Components/Modal',
  component: Modal,
};
export default meta;

type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abandon Contract</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Abandon this contract?"
          description="This action cannot be undone."
        >
          <p className="text-sm text-ink-muted mb-4">
            Your progress on this contract will be lost. The bounty board will not hold it for
            you a second time.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Confirm
            </Button>
          </div>
        </Modal>
      </>
    );
  },
};

export const WithoutDescription: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal open={open} onOpenChange={setOpen} title="A simple notice">
          <p className="text-sm text-ink-muted">
            Modals without a description are valid — Radix will log a dev-only accessibility
            warning in the console, which is expected and harmless for this case.
          </p>
        </Modal>
      </>
    );
  },
};