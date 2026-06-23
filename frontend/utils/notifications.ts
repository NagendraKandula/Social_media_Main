export type NotificationType = "success" | "warning" | "info" | "error";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  createdAt: string;
  read: boolean;
  dedupeKey?: string;
};

type NotificationInput = {
  type?: NotificationType;
  title: string;
  message: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  dedupeKey?: string;
};

const NOTIFICATIONS_KEY = "story_notifications";
export const NOTIFICATIONS_UPDATED_EVENT = "story-notifications-updated";

const getStoredNotifications = (): AppNotification[] => {
  if (typeof window === "undefined") return [];

  const rawNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!rawNotifications) return [];

  try {
    return JSON.parse(rawNotifications);
  } catch {
    localStorage.removeItem(NOTIFICATIONS_KEY);
    return [];
  }
};

const saveNotifications = (notifications: AppNotification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

export const getNotifications = () => getStoredNotifications();

export const addNotification = ({
  type = "info",
  title,
  message,
  details,
  dedupeKey,
}: NotificationInput) => {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications();

  if (dedupeKey && notifications.some((item) => item.dedupeKey === dedupeKey)) {
    return;
  }

  const nextNotification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    details,
    createdAt: new Date().toISOString(),
    read: false,
    dedupeKey,
  };

  saveNotifications([nextNotification, ...notifications].slice(0, 30));
};

export const markAllNotificationsRead = () => {
  if (typeof window === "undefined") return;

  const notifications = getStoredNotifications().map((item) => ({
    ...item,
    read: true,
  }));

  saveNotifications(notifications);
};

export const clearNotifications = () => {
  if (typeof window === "undefined") return;

  saveNotifications([]);
};
