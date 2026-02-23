import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cloudinary image URL with transformations for responsive images
 */
export function getImageUrl(url: string | undefined, options?: {
  width?: number
  height?: number
  quality?: number
}) {
  if (!url) return '/placeholder-event.jpg'
  if (!url.includes('cloudinary')) return url

  const { width, height, quality = 80 } = options || {}
  const transforms = ['f_auto', `q_${quality}`]
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  transforms.push('c_fill')

  return url.replace('/upload/', `/upload/${transforms.join(',')}/`)
}

/**
 * Format price in VND
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date in Vietnamese
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Format date and time in Vietnamese
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
