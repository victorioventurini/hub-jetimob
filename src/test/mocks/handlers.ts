/**
 * MSW Handlers for Supabase API Mocking
 * 
 * These handlers intercept Supabase REST API calls during tests.
 * Uses the Supabase project URL pattern.
 */

import { http, HttpResponse, delay } from 'msw';
import { createMockCycle, OKR_FIXTURES, AREAS_FIXTURES, TEAMS_FIXTURES } from './fixtures';

// Base URL for Supabase REST API
const SUPABASE_URL = 'https://oiwnghihyqdsinouwmga.supabase.co';
const REST_URL = `${SUPABASE_URL}/rest/v1`;

// Default cycles data
const mockCycles = [
  createMockCycle({
    id: 'cycle-q1-2026',
    name: 'Q1 2026',
    type: 'quarter',
    start_date: '2026-01-01',
    end_date: '2026-03-31',
  }),
  createMockCycle({
    id: 'cycle-q2-2026',
    name: 'Q2 2026',
    type: 'quarter',
    start_date: '2026-04-01',
    end_date: '2026-06-30',
  }),
  createMockCycle({
    id: 'cycle-2026',
    name: 'Ano 2026',
    type: 'year',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  }),
];

// Handler factory for common patterns
function createTableHandler<T>(
  tableName: string,
  data: T[],
  options?: {
    delay?: number;
    filterFn?: (item: T, searchParams: URLSearchParams) => boolean;
  }
) {
  return http.get(`${REST_URL}/${tableName}`, async ({ request }) => {
    if (options?.delay) {
      await delay(options.delay);
    }
    
    const url = new URL(request.url);
    let result = [...data];
    
    // Apply filter if provided
    if (options?.filterFn) {
      result = result.filter(item => options.filterFn!(item, url.searchParams));
    }
    
    // Handle select parameter (Supabase column selection)
    const select = url.searchParams.get('select');
    if (select && select !== '*') {
      const columns = select.split(',').map(c => c.trim());
      result = result.map(item => {
        const filtered: Record<string, unknown> = {};
        columns.forEach(col => {
          if (col in (item as Record<string, unknown>)) {
            filtered[col] = (item as Record<string, unknown>)[col];
          }
        });
        return filtered as T;
      });
    }
    
    // Handle order parameter
    const order = url.searchParams.get('order');
    if (order) {
      const [column, direction] = order.split('.');
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[column];
        const bVal = (b as Record<string, unknown>)[column];
        if (aVal === bVal) return 0;
        const comparison = aVal! > bVal! ? 1 : -1;
        return direction === 'desc' ? -comparison : comparison;
      });
    }
    
    return HttpResponse.json(result);
  });
}

// Cycles handlers
export const cyclesHandlers = [
  // GET /cycles - List all cycles
  createTableHandler('cycles', mockCycles),
  
  // GET /cycles?id=eq.{id} - Get single cycle
  http.get(`${REST_URL}/cycles`, async ({ request }) => {
    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');
    
    if (idFilter && idFilter.startsWith('eq.')) {
      const cycleId = idFilter.replace('eq.', '');
      const cycle = mockCycles.find(c => c.id === cycleId);
      
      // Supabase returns array for .maybeSingle() queries with select
      return HttpResponse.json(cycle ? [cycle] : []);
    }
    
    return HttpResponse.json(mockCycles);
  }),
];

// OKR Objectives handlers
export const objectivesHandlers = [
  // GET /okr_objectives
  http.get(`${REST_URL}/okr_objectives`, async () => {
    return HttpResponse.json([]);
  }),
  
  // POST /okr_objectives
  http.post(`${REST_URL}/okr_objectives`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `obj-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// OKR Key Results handlers
export const keyResultsHandlers = [
  // GET /okr_key_results
  http.get(`${REST_URL}/okr_key_results`, async () => {
    return HttpResponse.json([]);
  }),
  
  // POST /okr_key_results
  http.post(`${REST_URL}/okr_key_results`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `kr-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// Check-ins handlers
export const checkinsHandlers = [
  // GET /okr_checkins
  http.get(`${REST_URL}/okr_checkins`, async () => {
    return HttpResponse.json([]);
  }),
  
  // POST /okr_checkins
  http.post(`${REST_URL}/okr_checkins`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `checkin-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// Initiatives handlers
export const initiativesHandlers = [
  // GET /okr_initiatives
  http.get(`${REST_URL}/okr_initiatives`, async () => {
    return HttpResponse.json([]);
  }),
  
  // POST /okr_initiatives
  http.post(`${REST_URL}/okr_initiatives`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `init-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];


// Teams handlers (updated with fixtures)
export const teamsHandlers = [
  // GET /teams - List all teams
  http.get(`${REST_URL}/teams`, async ({ request }) => {
    const url = new URL(request.url);
    const teams = Object.values(TEAMS_FIXTURES);
    
    // Filter by bu_id
    const buIdFilter = url.searchParams.get('bu_id');
    let result = [...teams];
    if (buIdFilter && buIdFilter.startsWith('eq.')) {
      const buId = buIdFilter.replace('eq.', '');
      result = result.filter(t => t.bu_id === buId);
    }
    
    // Filter by status
    const statusFilter = url.searchParams.get('status');
    if (statusFilter && statusFilter.startsWith('eq.')) {
      const status = statusFilter.replace('eq.', '');
      result = result.filter(t => t.status === status);
    }
    
    // Filter by area_id
    const areaIdFilter = url.searchParams.get('area_id');
    if (areaIdFilter && areaIdFilter.startsWith('eq.')) {
      const areaId = areaIdFilter.replace('eq.', '');
      result = result.filter(t => t.area_id === areaId);
    }
    
    return HttpResponse.json(result);
  }),
  
  // POST /teams
  http.post(`${REST_URL}/teams`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `team-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// Areas handlers
export const areasHandlers = [
  // GET /areas - List all areas
  http.get(`${REST_URL}/areas`, async ({ request }) => {
    const url = new URL(request.url);
    const areas = Object.values(AREAS_FIXTURES);
    
    // Filter by bu_id
    const buIdFilter = url.searchParams.get('bu_id');
    let result = [...areas];
    if (buIdFilter && buIdFilter.startsWith('eq.')) {
      const buId = buIdFilter.replace('eq.', '');
      result = result.filter(a => a.bu_id === buId);
    }
    
    // Filter by status
    const statusFilter = url.searchParams.get('status');
    if (statusFilter && statusFilter.startsWith('eq.')) {
      const status = statusFilter.replace('eq.', '');
      result = result.filter(a => a.status === status);
    }
    
    return HttpResponse.json(result);
  }),
  
  // POST /areas
  http.post(`${REST_URL}/areas`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: `area-${Date.now()}`,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { status: 201 });
  }),
];

// Profiles handlers
export const profilesHandlers = [
  http.get(`${REST_URL}/profiles`, async () => {
    return HttpResponse.json([]);
  }),
];

// Error simulation handlers (for testing error states)
export const errorHandlers = {
  networkError: http.get(`${REST_URL}/*`, () => {
    return HttpResponse.error();
  }),
  
  serverError: http.get(`${REST_URL}/*`, () => {
    return HttpResponse.json(
      { message: 'Internal Server Error', code: '500' },
      { status: 500 }
    );
  }),
  
  unauthorized: http.get(`${REST_URL}/*`, () => {
    return HttpResponse.json(
      { message: 'JWT expired', code: 'PGRST301' },
      { status: 401 }
    );
  }),
};

// All handlers combined
export const handlers = [
  ...cyclesHandlers,
  ...objectivesHandlers,
  ...keyResultsHandlers,
  ...checkinsHandlers,
  ...initiativesHandlers,
  ...teamsHandlers,
  ...areasHandlers,
  ...profilesHandlers,
];

// Export individual handler groups for selective mocking
export {
  mockCycles,
  REST_URL,
  SUPABASE_URL,
};
