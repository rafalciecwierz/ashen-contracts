import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { Button } from '../button/button.component';
import { Modal } from '..';

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
            Your progress on this contract will be lost. The bounty board will
            not hold it for you a second time.
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
            Modals without a description are valid — Radix will log a dev-only
            accessibility warning in the console, which is expected and harmless
            for this case.
          </p>
        </Modal>
      </>
    );
  },
};

/** The ✕ button's accessible name comes from `closeLabel`, e.g. a translation. */
export const WithCloseLabel: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Otwórz</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Porzucić kontrakt?"
          description="Tej akcji nie można cofnąć."
          closeLabel="Zamknij"
        >
          <p className="text-sm text-ink-muted">Postęp kontraktu przepadnie.</p>
        </Modal>
      </>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Otwórz' }));

    // The dialog renders in a portal, outside the story's canvas.
    const dialog = await screen.findByRole('dialog');
    await expect(
      screen.queryByRole('button', { name: 'Close' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};
