import type messages from '../../messages/en.json';

// Types every translation call against messages/en.json, so a key that doesn't
// exist (e.g. t('passwordRequired') before it was added) fails at compile time
// instead of rendering a raw key at runtime.
declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof messages;
  }
}
