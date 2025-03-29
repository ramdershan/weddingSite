import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isRsvpDeadlinePassed(): boolean {
  const deadline = new Date('2026-01-01T00:00:00');
  const now = new Date();
  return now >= deadline;
}

export function isEngagementRsvpDeadlinePassed(): boolean {
  const deadline = new Date('2025-09-01T00:00:00');
  const now = new Date();
  return now >= deadline;
}

export function getWeddingDate(): Date {
  // Use a date that is definitely in the future
  const weddingDate = new Date('2026-01-24T13:00:00'); // 1:00 PM on January 24th, 2026
  return weddingDate;
}