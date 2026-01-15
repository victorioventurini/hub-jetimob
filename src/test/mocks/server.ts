/**
 * MSW Server Setup
 * 
 * Creates and exports the MSW server for use in tests.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create server with default handlers
export const server = setupServer(...handlers);

// Export for use in tests
export { handlers };
