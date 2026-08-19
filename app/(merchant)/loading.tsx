export default function Loading() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-5xl space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded-lg" />
        <div className="h-4 w-72 bg-gray-100 rounded" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  )
}
