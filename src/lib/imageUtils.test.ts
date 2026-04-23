/**
 * Tests for image utilities (avatar URL optimization).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOptimizedAvatarUrl, preloadAvatarImages } from './imageUtils';

describe('getOptimizedAvatarUrl', () => {
  it('returns undefined for null', () => {
    expect(getOptimizedAvatarUrl(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getOptimizedAvatarUrl(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getOptimizedAvatarUrl('')).toBeUndefined();
  });

  it('returns the original URL when not from Supabase Storage', () => {
    const url = 'https://example.com/avatar.png';
    expect(getOptimizedAvatarUrl(url)).toBe(url);
  });

  it('returns original for gravatar', () => {
    const url = 'https://gravatar.com/avatar/abc123';
    expect(getOptimizedAvatarUrl(url)).toBe(url);
  });

  it('transforms Supabase Storage URL with default md size (80px)', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png';
    const out = getOptimizedAvatarUrl(url);
    expect(out).toContain('/storage/v1/render/image/public/');
    expect(out).toContain('width=80');
    expect(out).toContain('height=80');
    expect(out).toContain('resize=cover');
    expect(out).toContain('quality=80');
  });

  it('uses 40px for sm size (dropdowns, lists)', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png';
    const out = getOptimizedAvatarUrl(url, 'sm');
    expect(out).toContain('width=40');
    expect(out).toContain('height=40');
  });

  it('uses 192px for lg size (profile page)', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png';
    const out = getOptimizedAvatarUrl(url, 'lg');
    expect(out).toContain('width=192');
    expect(out).toContain('height=192');
  });

  it('preserves existing query string with & separator', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png?token=abc';
    const out = getOptimizedAvatarUrl(url, 'sm');
    expect(out).toContain('?token=abc&width=40');
  });

  it('uses ? separator when no existing query string', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png';
    const out = getOptimizedAvatarUrl(url, 'sm');
    expect(out).toMatch(/\.png\?width=40/);
  });

  it('replaces only the storage object path, not other occurrences', () => {
    const url = 'https://x.supabase.co/storage/v1/object/public/avatars/u1.png';
    const out = getOptimizedAvatarUrl(url);
    expect(out).not.toContain('/storage/v1/object/public/');
    expect(out!.split('/render/image/public/').length).toBe(2);
  });
});

describe('preloadAvatarImages', () => {
  let createdSrcs: string[] = [];

  beforeEach(() => {
    createdSrcs = [];
    // jsdom provides a real Image; spy on the setter
    vi.spyOn(window, 'Image').mockImplementation(() => {
      const img: any = {};
      Object.defineProperty(img, 'src', {
        set(v: string) {
          createdSrcs.push(v);
        },
      });
      return img;
    });
  });

  it('preloads all valid Supabase URLs', () => {
    preloadAvatarImages([
      'https://x.supabase.co/storage/v1/object/public/avatars/a.png',
      'https://x.supabase.co/storage/v1/object/public/avatars/b.png',
    ], 'sm');
    expect(createdSrcs).toHaveLength(2);
    expect(createdSrcs[0]).toContain('width=40');
  });

  it('skips null/undefined entries', () => {
    preloadAvatarImages([null, undefined, 'https://example.com/x.png']);
    // example.com is non-Supabase, but still returns a URL → preloaded
    expect(createdSrcs).toHaveLength(1);
    expect(createdSrcs[0]).toBe('https://example.com/x.png');
  });

  it('handles empty array gracefully', () => {
    expect(() => preloadAvatarImages([])).not.toThrow();
    expect(createdSrcs).toHaveLength(0);
  });
});
