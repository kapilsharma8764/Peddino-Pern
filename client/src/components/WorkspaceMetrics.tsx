export function WorkspaceMetrics({ items }: { items: { label: string; value: number }[] }) {
  return <dl className="workspace-metrics">{items.map(({ label, value }) => <div className="workspace-metric" key={label}><dt><span>{label}</span></dt><dd><strong>{value.toLocaleString()}</strong></dd></div>)}</dl>
}
