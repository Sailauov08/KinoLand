export default function Loading() {
  return (
    <div aria-busy="true" className="container-page grid gap-8 pt-12 md:grid-cols-[260px_1fr] md:gap-12 md:pt-24 lg:grid-cols-[300px_1fr]">
      <div className="skeleton mx-auto aspect-[2/3] w-48 rounded-3xl sm:w-56 md:w-full" />
      <div className="space-y-4 self-end">
        <div className="skeleton h-6 w-40 rounded-full" />
        <div className="skeleton h-12 w-3/4 rounded-2xl" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
        <div className="flex gap-3 pt-4">
          <div className="skeleton h-12 w-40 rounded-full" />
          <div className="skeleton h-12 w-44 rounded-full" />
        </div>
      </div>
    </div>
  );
}
