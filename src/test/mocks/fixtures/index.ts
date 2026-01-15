/**
 * Test Fixtures Index
 * 
 * Central export for all test fixtures.
 */

export * from './profiles';
export { 
  createMockKr, 
  createMockInitiative, 
  createMockCycle, 
  FIXTURES as OKR_FIXTURES,
  type MockKrData,
  type MockInitiativeData,
} from './okrs';

// Re-export profile fixtures with explicit name
export { FIXTURES as PROFILE_FIXTURES } from './profiles';
