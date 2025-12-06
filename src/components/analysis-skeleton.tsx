import { Skeleton } from "@/components/ui/skeleton";

export function AnalysisSkeleton() {
  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 bg-slate-700" />
          <Skeleton className="h-3 w-24 bg-slate-700" />
        </div>
        <Skeleton className="h-3 w-16 bg-slate-700" />
      </div>
      <Skeleton className="h-3 w-full mt-2 bg-slate-700" />
      <Skeleton className="h-3 w-3/4 mt-1 bg-slate-700" />
    </div>
  );
}