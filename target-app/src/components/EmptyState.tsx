export function EmptyState() {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <p className="empty-state__message">
        習慣がまだ登録されていません。上のフォームから最初の習慣を追加しましょう。
      </p>
    </div>
  );
}
