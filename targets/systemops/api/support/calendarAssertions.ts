import { expect } from '@playwright/test';
import type { E2eCalendarEvent, E2eSlot } from './e2eClient';

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

export const QA_TIMEZONE = 'America/Sao_Paulo';

export function localParts(date: Date, timeZone = QA_TIMEZONE): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';

  return {
    year: Number(get('year')),
    month: Number(get('month')) - 1,
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: WEEKDAY_MAP[get('weekday')] ?? 0
  };
}

export function fromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
  timeZone = QA_TIMEZONE
): Date {
  const estimated = new Date(Date.UTC(year, month, day, 12, 0));
  const localBack = localParts(estimated, timeZone);
  const corrected = new Date(estimated.getTime() + ((hour - localBack.hour) * 60 + (minute - localBack.minute)) * 60_000);
  const check = localParts(corrected, timeZone);

  if (check.hour !== hour || check.minute !== minute) {
    return new Date(corrected.getTime() + ((hour - check.hour) * 60 + (minute - check.minute)) * 60_000);
  }

  return corrected;
}

export function nextLocalWeekday(weekday: number, timeZone = QA_TIMEZONE): LocalParts {
  const now = new Date();
  const today = localParts(now, timeZone);
  let daysAhead = weekday - today.weekday;
  if (daysAhead <= 0) daysAhead += 7;

  const targetNoon = new Date(now.getTime() + daysAhead * 24 * 60 * 60_000);
  const target = localParts(targetNoon, timeZone);
  return {
    ...target,
    hour: 0,
    minute: 0
  };
}

export function slotDurationMinutes(slot: E2eSlot): number {
  return (new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60_000;
}

export function expectSlotsInsideBusinessHours(slots: E2eSlot[], startHour = 8, endHour = 18) {
  expect(slots.length).toBeGreaterThan(0);
  for (const slot of slots) {
    const start = localParts(new Date(slot.startsAt));
    const end = localParts(new Date(slot.endsAt));
    expect(start.hour).toBeGreaterThanOrEqual(startHour);
    expect(end.hour + end.minute / 60).toBeLessThanOrEqual(endHour);
  }
}

export function expectSlotDurations(slots: E2eSlot[], durationMinutes: number) {
  expect(slots.length).toBeGreaterThan(0);
  for (const slot of slots) {
    expect(slotDurationMinutes(slot)).toBe(durationMinutes);
  }
}

export function expectSlotsOnWeekday(slots: E2eSlot[], weekday: number) {
  expect(slots.length).toBeGreaterThan(0);
  for (const slot of slots) {
    expect(localParts(new Date(slot.startsAt)).weekday).toBe(weekday);
  }
}

export function expectNoSlotOverlaps(slots: E2eSlot[], startsAt: Date, endsAt: Date) {
  const busyStart = startsAt.getTime();
  const busyEnd = endsAt.getTime();

  for (const slot of slots) {
    const slotStart = new Date(slot.startsAt).getTime();
    const slotEnd = new Date(slot.endsAt).getTime();
    expect(slotStart < busyEnd && slotEnd > busyStart).toBe(false);
  }
}

export function expectNoOverlappingEvents(events: E2eCalendarEvent[]) {
  const sorted = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  for (let i = 1; i < sorted.length; i++) {
    const previousEnd = new Date(sorted[i - 1].endsAt).getTime();
    const currentStart = new Date(sorted[i].startsAt).getTime();
    expect(currentStart).toBeGreaterThanOrEqual(previousEnd);
  }
}
