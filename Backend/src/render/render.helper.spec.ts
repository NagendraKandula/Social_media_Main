import { Platform } from '@prisma/client';
import { RenderHelper } from './render.helper';

describe('RenderHelper edit decisions', () => {
  const helper = new RenderHelper();

  it('reuses a compliant original when the edit covers the full image', () => {
    const result = helper.needsRendering(
      Platform.INSTAGRAM,
      'feed',
      1080,
      1350,
      500_000,
      { cropX: 0, cropY: 0, cropWidth: 1080, cropHeight: 1350, rotation: 0 },
    );

    expect(result.needsRendering).toBe(false);
  });

  it('forces rendering when a user crop differs from the original bounds', () => {
    const result = helper.needsRendering(
      Platform.INSTAGRAM,
      'feed',
      1080,
      1350,
      500_000,
      { cropX: 100, cropY: 0, cropWidth: 880, cropHeight: 1100, rotation: 0 },
    );

    expect(result).toEqual({ needsRendering: true, reason: 'User crop or rotation must be rendered' });
  });

  it('forces rendering when rotation is present', () => {
    const result = helper.needsRendering(
      Platform.INSTAGRAM,
      'feed',
      1080,
      1350,
      500_000,
      { cropX: 0, cropY: 0, cropWidth: 1080, cropHeight: 1350, rotation: 90 },
    );

    expect(result.needsRendering).toBe(true);
  });
});
