import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse rounded-lg bg-white/5 ${className}`}
            {...props}
        />
    );
}

interface TableSkeletonProps {
    rows?: number;
    cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
    return (
        <div className="w-full space-y-4 p-4 bg-white/2 rounded-3xl border border-white/5">
            {/* Header row */}
            <div className="flex items-center space-x-4 border-b border-white/5 pb-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            <div className="space-y-4 pt-2">
                {Array.from({ length: rows }).map((_, r) => (
                    <div key={r} className="flex items-center space-x-4 py-2 border-b border-white/2 last:border-0">
                        {Array.from({ length: cols }).map((_, c) => (
                            <Skeleton key={c} className="h-6 flex-1" />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface CardSkeletonProps {
    count?: number;
    gridCols?: string;
}

export function CardSkeleton({ count = 3, gridCols = 'grid-cols-1 md:grid-cols-3' }: CardSkeletonProps) {
    return (
        <div className={`grid gap-6 ${gridCols}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-6 bg-white/2 rounded-3xl border border-white/5 space-y-4">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 flex-1 rounded-xl" />
                        <Skeleton className="h-8 flex-1 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export function StatsSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 bg-white/2 rounded-3xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                </div>
            ))}
        </div>
    );
}
