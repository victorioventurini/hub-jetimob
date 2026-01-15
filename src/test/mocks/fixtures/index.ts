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

// Teams & Areas fixtures
export {
  createMockArea,
  createMockTeam,
  createMockAreaFormData,
  createMockTeamFormData,
  AREAS_FIXTURES,
  TEAMS_FIXTURES,
  FIXTURES as TEAMS_AREAS_FIXTURES,
  type MockAreaData,
  type MockTeamData,
} from './teams';

// Re-export profile fixtures with explicit name
export { FIXTURES as PROFILE_FIXTURES } from './profiles';
