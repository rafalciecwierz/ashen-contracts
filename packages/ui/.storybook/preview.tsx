import type { Preview } from '@storybook/react-vite';
// Self-hosted variable fonts, as next/font gives apps/web; preview.css points the tokens at them.
import '@fontsource-variable/cinzel';
import '@fontsource-variable/inter';
import './preview.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      // Every story passes axe, so a new violation fails `pnpm test` and CI.
      test: 'error',
    },
  },
};

export default preview;
