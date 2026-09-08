import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// ponytail: vite.config.ts doesn't set test.globals, so RTL's auto-cleanup
// (which only self-registers when afterEach is already global) never fires.
// Register it once here now that Practice.test.tsx is the first suite to render components.
afterEach(cleanup);
