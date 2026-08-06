import styles from '../../styles/LandingCSS/Tabs/Publish.module.css';

interface Props {
  scheduleDate: string;
  onScheduleDateChange: (value: string) => void;
  onCancel: () => void;
  onReview: () => void;
}

export default function PublishScheduleModal({
  scheduleDate,
  onScheduleDateChange,
  onCancel,
  onReview,
}: Props) {
  return (
    <div className={styles.scheduleOverlay}>
      <div className={styles.scheduleModal} role="dialog" aria-modal="true" aria-labelledby="schedule-title">
        <h3 id="schedule-title">Pick a Date &amp; Time</h3>
        <input
          type="datetime-local"
          value={scheduleDate}
          onChange={(event) => onScheduleDateChange(event.target.value)}
        />
        <div className={styles.modalActions}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onReview}>Review</button>
        </div>
      </div>
    </div>
  );
}

