/**
 * Tests for isStoragePath utility (pure function)
 */
import { describe, it, expect } from 'vitest';
import { isStoragePath } from './useAttachmentUrl';

describe('isStoragePath', () => {
  it('should return true for relative storage paths', () => {
    expect(isStoragePath('tickets/bu-1/file.pdf')).toBe(true);
    expect(isStoragePath('uploads/image.png')).toBe(true);
    expect(isStoragePath('my-file.docx')).toBe(true);
  });

  it('should return false for http URLs', () => {
    expect(isStoragePath('http://example.com/file.pdf')).toBe(false);
  });

  it('should return false for https URLs', () => {
    expect(isStoragePath('https://cdn.example.com/image.png')).toBe(false);
  });

  it('should return true for ftp or other protocols', () => {
    // Only http/https are recognized as full URLs
    expect(isStoragePath('ftp://server.com/file.pdf')).toBe(true);
  });
});
