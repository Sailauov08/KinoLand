import { GridSkeleton } from "@/components/rail-section";

export default function Loading() {
  return (
    <div className="container-page" aria-busy="true">
      <div className="pt-10 pb-8 sm:pt-14 sm:pb-10">
        <div className="skeleton h-3 w-20 rounded-full" />
        <div className="skeleton mt-4 h-10 w-72 max-w-full rounded-2xl" />
        <div className="skeleton mt-4 h-4 w-96 max-w-full rounded-full" />
      </div>
      <GridSkeleton />
    </div>
  );
}
