import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une clases de Tailwind; la última gana si chocan (patrón de shadcn/ui). */
export const cn = (...clases: ClassValue[]) => twMerge(clsx(clases));
