/**
 * Клиентский ресайз изображений для аватара.
 *
 * Сервер НЕ ресайзит картинки (нет GD) и принимает не более 512 КБ,
 * поэтому фото обязательно ужимается на клиенте до отправки:
 * canvas → вписать в квадрат `max`px (contain, пропорции сохраняются) → JPEG.
 */

/** Разумный лимит исходного файла до ресайза. */
export const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024

/** Загружает файл в HTMLImageElement через object URL (URL освобождается после загрузки). */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Не удалось прочитать изображение.'))
    }
    image.src = objectUrl
  })
}

/** Рисует изображение на canvas, вписав его в квадрат `max`px (белый фон под JPEG). */
function drawScaled(image: HTMLImageElement, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(image.width, image.height, 1))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')
  if (context === null) {
    throw new Error('Canvas недоступен в этом браузере.')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** Экспортирует canvas в JPEG-Blob. */
function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob !== null) {
          resolve(blob)
        } else {
          reject(new Error('Не удалось подготовить изображение.'))
        }
      },
      'image/jpeg',
      quality,
    )
  })
}

/**
 * Ужимает картинку до квадрата `max`px (contain) и возвращает JPEG-Blob (~≤512 КБ).
 * Бросает Error, если файл не картинка или исходник больше 15 МБ.
 */
export async function resizeImageToBlob(file: File, max = 256, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите файл-изображение (JPEG, PNG или WebP).')
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error('Файл слишком большой: выберите изображение до 15 МБ.')
  }
  const image = await loadImage(file)
  return canvasToJpegBlob(drawScaled(image, max), quality)
}
