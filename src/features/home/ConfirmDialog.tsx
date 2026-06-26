type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '删除',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(51,53,47,.35)' }}
    >
      <div className="w-[360px] p-6 shadow-xl" style={{ backgroundColor: '#fffdf8', borderRadius: 12 }}>
        <h2 className="text-lg font-semibold" style={{ color: '#33352f' }}>{title}</h2>
        <p className="mt-2 text-sm" style={{ color: '#5a6856' }}>{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm transition hover:opacity-70"
            style={{ color: '#5a6856', borderRadius: 10 }}
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="px-4 py-2 text-sm text-white transition hover:opacity-90"
            style={{ backgroundColor: '#7a5e53', borderRadius: 10 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
