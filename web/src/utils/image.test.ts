import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_SOURCE_FILE_BYTES, resizeImageToBlob } from './image'

/**
 * jsdom не умеет ни декодировать картинки, ни рисовать на canvas —
 * мокаем Image (мгновенный onload с заданными размерами) и canvas 2d/toBlob.
 */
const toBlobSpy = vi.fn(
  (callback: (blob: Blob | null) => void, _type?: string, _quality?: number) => {
    callback(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }))
  },
)

const contextMock = {
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
}

function stubImage(width: number, height: number): void {
  class FakeImage {
    width = width
    height = height
    onload: (() => void) | null = null
    onerror: (() => void) | null = null

    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', FakeImage)
}

function makeFile(type = 'image/png', size = 1024): File {
  const file = new File(['x'], 'photo.png', { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('resizeImageToBlob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      contextMock as unknown as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(toBlobSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects non-image files without touching the canvas', async () => {
    stubImage(100, 100)
    await expect(resizeImageToBlob(makeFile('application/pdf'))).rejects.toThrow('изображение')
    expect(toBlobSpy).not.toHaveBeenCalled()
  })

  it('rejects source files larger than 15 MB', async () => {
    stubImage(100, 100)
    const oversized = makeFile('image/jpeg', MAX_SOURCE_FILE_BYTES + 1)
    await expect(resizeImageToBlob(oversized)).rejects.toThrow('15 МБ')
    expect(toBlobSpy).not.toHaveBeenCalled()
  })

  it('exports the canvas as image/jpeg with the given quality and returns the Blob', async () => {
    stubImage(1000, 1000)

    const blob = await resizeImageToBlob(makeFile(), 256, 0.8)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/jpeg')
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)
  })

  it('scales the longest side down to max=256 keeping the aspect ratio', async () => {
    stubImage(1024, 512)

    await resizeImageToBlob(makeFile())

    expect(contextMock.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 256, 128)
    expect(contextMock.fillRect).toHaveBeenCalledWith(0, 0, 256, 128)
  })

  it('does not upscale images already smaller than max', async () => {
    stubImage(120, 90)

    await resizeImageToBlob(makeFile())

    expect(contextMock.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 120, 90)
  })

  it('rejects when the image fails to load (corrupted file)', async () => {
    class BrokenImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null

      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', BrokenImage)

    await expect(resizeImageToBlob(makeFile())).rejects.toThrow('Не удалось прочитать')
  })
})
