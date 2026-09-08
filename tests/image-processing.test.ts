import assert from 'node:assert/strict';
import test from 'node:test';
import { Jimp } from 'jimp';

test('scan image processing preserves the selected region through JPEG decode and resize', async () => {
  const source = new Jimp({ width: 120, height: 80, color: 0xff0000ff });
  for (let y = 20; y < 60; y++) {
    for (let x = 40; x < 100; x++) source.setPixelColor(0x00ff00ff, x, y);
  }
  const decoded = await Jimp.read(await source.getBuffer('image/jpeg', { quality: 95 }));
  const region = decoded.crop({ x: 45, y: 25, w: 50, h: 30 }).scaleToFit({ w: 100, h: 100 });
  const result = await Jimp.read(await region.getBuffer('image/jpeg', { quality: 90 }));
  assert.equal(result.width, 100);
  assert.equal(result.height, 60);
  const pixel = result.getPixelColor(50, 30);
  assert.ok(((pixel >>> 16) & 255) > 220, 'selected green region remains green');
  assert.ok(((pixel >>> 24) & 255) < 30, 'red background is excluded');
});
