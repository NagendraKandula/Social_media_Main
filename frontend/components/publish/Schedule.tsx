import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from 'lucide-react';
import styles from './Schedule.module.css';

interface ScheduleProps {
  scheduleDate: string;
  onScheduleDateChange: (value: string) => void;
  onReview: () => void;
  selectedChannelCount: number;
  busy?: boolean;
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const parseValue = (value: string) => {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function ScheduleDateTimePicker({
  value,
  onChange,
  id = 'publish-schedule-date',
  disabled = false,
}: DateTimePickerProps) {
  const selected = parseValue(value);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const leadingDays = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingDays }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, index) => new Date(year, month, index + 1),
      ),
    ];
  }, [viewMonth]);

  const commitDate = (day: Date) => {
    const next = selected ? new Date(selected) : new Date();
    if (!selected) next.setHours(next.getHours() + 1, 0, 0, 0);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());

    if (next.getTime() <= Date.now()) {
      const soon = new Date(Date.now() + 5 * 60 * 1000);
      next.setHours(soon.getHours(), soon.getMinutes(), 0, 0);
    }
    onChange(toLocalValue(next));
  };

  const updateTime = (hour12: number, minute: number, period: 'AM' | 'PM') => {
    const next = selected
      ? new Date(selected)
      : new Date(Date.now() + 60 * 60 * 1000);
    const hour24 = (hour12 % 12) + (period === 'PM' ? 12 : 0);
    next.setHours(hour24, minute, 0, 0);
    onChange(toLocalValue(next));
  };

  const time = selected || new Date(Date.now() + 60 * 60 * 1000);
  const hour12 = time.getHours() % 12 || 12;
  const minute = Math.floor(time.getMinutes() / 5) * 5;
  const period: 'AM' | 'PM' = time.getHours() >= 12 ? 'PM' : 'AM';
  const today = startOfDay(new Date());

  return (
    <div ref={rootRef} className={styles.themedDateTimePicker}>
      <button
        id={id}
        type="button"
        className={`${styles.themedDateTimeTrigger} ${isOpen ? styles.themedDateTimeTriggerOpen : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>
          {selected
            ? selected.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
            : 'Pick a date and time'}
        </span>
        <CalendarDays size={19} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className={styles.themedDateTimePopover}
          role="dialog"
          aria-label="Choose schedule date and time"
        >
          <div className={styles.themedCalendarHeader}>
            <strong>
              {viewMonth.toLocaleString([], { month: 'long', year: 'numeric' })}
            </strong>
            <div>
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
                  )
                }
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
                  )
                }
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className={styles.themedCalendarGrid} role="grid" aria-label="Calendar">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} role="columnheader">{weekday}</span>
            ))}
            {calendarCells.map((day, index) => {
              if (!day) return <span key={`empty-${index}`} aria-hidden="true" />;
              const isPast = startOfDay(day) < today;
              const isSelected = Boolean(
                selected && startOfDay(selected).getTime() === day.getTime(),
              );
              const isToday = day.getTime() === today.getTime();

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`${isSelected ? styles.themedCalendarSelected : ''} ${isToday ? styles.themedCalendarToday : ''}`}
                  disabled={isPast}
                  onClick={() => commitDate(day)}
                  aria-label={day.toLocaleDateString([], {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  aria-selected={isSelected}
                  role="gridcell"
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={styles.themedTimeControls}>
            <label>
              <span>Hour</span>
              <select
                value={hour12}
                onChange={(event) => updateTime(Number(event.target.value), minute, period)}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{pad(hour)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Minute</span>
              <select
                value={minute}
                onChange={(event) => updateTime(hour12, Number(event.target.value), period)}
              >
                {MINUTES.map((value) => (
                  <option key={value} value={value}>{pad(value)}</option>
                ))}
              </select>
            </label>
            <div className={styles.themedPeriodControl} aria-label="AM or PM">
              {(['AM', 'PM'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={period === option ? styles.themedPeriodActive : ''}
                  onClick={() => updateTime(hour12, minute, option)}
                  aria-pressed={period === option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.themedCalendarFooter}>
            <button type="button" onClick={() => onChange('')}>Clear</button>
            <button
              type="button"
              onClick={() => {
                const soon = new Date(Date.now() + 60 * 60 * 1000);
                setViewMonth(soon);
                onChange(toLocalValue(soon));
              }}
            >Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Schedule({
  scheduleDate,
  onScheduleDateChange,
  onReview,
  selectedChannelCount,
  busy = false,
}: ScheduleProps) {
  const scheduledTime = scheduleDate ? new Date(scheduleDate) : null;
  const hasValidDate = Boolean(
    scheduledTime &&
    !Number.isNaN(scheduledTime.getTime()) &&
    scheduledTime.getTime() > Date.now(),
  );

  return (
    <section className={styles.schedulePanel} aria-labelledby="schedule-panel-title">
      <div className={styles.scheduleIntro}>
        <span className={styles.scheduleIcon} aria-hidden="true">
          <CalendarClock size={20} />
        </span>
        <div>
          <h3 id="schedule-panel-title">Choose when to publish</h3>
          <p>Select a future date and time for all currently selected channels.</p>
        </div>
      </div>

      <div className={styles.scheduleFormCard}>
        <label htmlFor="publish-schedule-date">Schedule date and time</label>
        <ScheduleDateTimePicker
          value={scheduleDate}
          onChange={onScheduleDateChange}
        />
        <span className={styles.scheduleTimezone}>
          <Clock3 size={14} aria-hidden="true" />
          Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})
        </span>
      </div>

      <div className={styles.scheduleSummary} aria-live="polite">
        <span>Scheduled for</span>
        <strong>
          {hasValidDate
            ? scheduledTime!.toLocaleString([], {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
            : 'Select a date and time'}
        </strong>
        <small>
          {selectedChannelCount > 0
            ? `${selectedChannelCount} selected channel${selectedChannelCount === 1 ? '' : 's'}`
            : 'No channels selected yet'}
        </small>
      </div>

      <button
        type="button"
        className={styles.scheduleReviewButton}
        onClick={onReview}
        disabled={!hasValidDate || busy}
      >
        {busy ? 'Preparing…' : 'Review scheduled post'}
      </button>
    </section>
  );
}
