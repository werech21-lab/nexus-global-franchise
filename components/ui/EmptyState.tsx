export default function EmptyState({
  title,
  body,
}: {
  title: string
  body?: string
}) {
  return (
    <div className="card text-center text-slate-300">
      <p className="font-semibold text-white">{title}</p>
      {body ? <p className="mt-2 text-sm text-slate-400">{body}</p> : null}
    </div>
  )
}
