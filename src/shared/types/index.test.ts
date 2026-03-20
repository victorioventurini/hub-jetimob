/**
 * Tests for createPaginatedResponse utility
 */
import { describe, it, expect } from 'vitest';
import { createPaginatedResponse } from './index';

describe('createPaginatedResponse', () => {
  it('should create paginated response with correct structure', () => {
    const data = [{ id: '1' }, { id: '2' }];
    const result = createPaginatedResponse(data, 10, 1, 25);
    
    expect(result.data).toEqual(data);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it('should calculate totalPages correctly', () => {
    const result = createPaginatedResponse([], 100, 1, 25);
    expect(result.totalPages).toBe(4);
  });

  it('should handle total less than pageSize', () => {
    const result = createPaginatedResponse([], 5, 1, 25);
    expect(result.totalPages).toBe(1);
  });

  it('should handle empty data', () => {
    const result = createPaginatedResponse([], 0, 1, 25);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });
});
