import assert from 'node:assert/strict';
import test from 'node:test';

import { getCalendarScheduleDate } from './calendarDate.mjs';

test('keeps a future calendar day at the requested default hour', () => {
  const now = new Date(2026, 7, 29, 20, 0);
  const selectedDate = new Date(2026, 7, 30);

  const result = getCalendarScheduleDate(selectedDate, '9 AM', now);

  assert.equal(result?.getFullYear(), 2026);
  assert.equal(result?.getMonth(), 7);
  assert.equal(result?.getDate(), 30);
  assert.equal(result?.getHours(), 9);
  assert.equal(result?.getMinutes(), 0);
});

test('moves today to a future time when the default hour has passed', () => {
  const now = new Date(2026, 7, 30, 14, 37);
  const selectedDate = new Date(2026, 7, 30);

  const result = getCalendarScheduleDate(selectedDate, '9 AM', now);

  assert.ok(result);
  assert.ok(result.getTime() > now.getTime());
  assert.equal(result.getDate(), 30);
});

test('rejects only calendar days before today', () => {
  const now = new Date(2026, 7, 30, 8, 0);
  const selectedDate = new Date(2026, 7, 29);

  assert.equal(getCalendarScheduleDate(selectedDate, '9 AM', now), null);
});
