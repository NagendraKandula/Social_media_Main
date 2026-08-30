const setRequestedTime = (date, hourLabel) => {
  const nextDate = new Date(date);
  const [time, modifier] = hourLabel.split(' ');
  let hours = Number.parseInt(time, 10);

  if (hours === 12) hours = 0;
  if (modifier === 'PM') hours += 12;

  nextDate.setHours(hours, 0, 0, 0);
  return nextDate;
};

const startOfLocalDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getNextAvailableTime = (now) => {
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil((next.getMinutes() + 5) / 5) * 5);
  return next;
};

export const getCalendarScheduleDate = (selectedDate, hourLabel = '9 AM', now = new Date()) => {
  const selectedDay = startOfLocalDay(selectedDate);
  const today = startOfLocalDay(now);

  if (selectedDay.getTime() < today.getTime()) return null;

  const requestedDate = setRequestedTime(selectedDate, hourLabel);
  if (selectedDay.getTime() === today.getTime() && requestedDate.getTime() <= now.getTime()) {
    return getNextAvailableTime(now);
  }

  return requestedDate;
};
