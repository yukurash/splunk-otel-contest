export function EmptyState() {
  return (
    <section className="empty-state" aria-label="習慣が登録されていません">
      <p className="empty-state__icon" aria-hidden="true">
        📋
      </p>
      <p className="empty-state__message">まだ習慣がありません</p>
      <p className="empty-state__hint">上のフォームから習慣を追加しましょう</p>
    </section>
  );
}
