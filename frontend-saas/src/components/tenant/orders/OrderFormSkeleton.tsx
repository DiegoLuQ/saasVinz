"use client";

import React from 'react';

/**
 * Skeleton loader that mimics the structure of the order form.
 * Shows 5 pulsating cards matching the real layout.
 */
export default function OrderFormSkeleton() {
    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in duration-300">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-3">
                    <div className="h-4 w-32 bg-white/5 rounded-lg animate-pulse" />
                    <div className="h-10 w-64 bg-white/10 rounded-xl animate-pulse" />
                    <div className="h-4 w-96 bg-white/5 rounded-lg animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-16 w-24 bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-16 w-24 bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-16 w-28 bg-white/5 rounded-2xl animate-pulse" />
                </div>
            </div>

            {/* Form Grid Skeleton */}
            <div className="grid grid-cols-12 gap-6 lg:gap-8">
                {/* Left Column */}
                <div className="col-span-12 lg:col-span-7 space-y-8">
                    {/* Patient Card Skeleton */}
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 animate-pulse" />
                            <div className="h-6 w-52 bg-white/10 rounded-lg animate-pulse" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                        <div className="border-t border-white/5 pt-6">
                            <div className="h-3 w-36 bg-white/5 rounded animate-pulse mb-3" />
                            <div className="h-16 bg-white/5 rounded-2xl animate-pulse" />
                        </div>
                        <div className="h-20 bg-white/5 rounded-3xl animate-pulse" />
                    </div>

                    {/* Logistics Card Skeleton */}
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 animate-pulse" />
                            <div className="h-6 w-40 bg-white/10 rounded-lg animate-pulse" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="h-3 w-32 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            <div className="space-y-2">
                                <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Evidence Card Skeleton */}
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 animate-pulse" />
                            <div className="h-6 w-56 bg-white/10 rounded-lg animate-pulse" />
                        </div>
                        <div className="h-28 bg-white/5 rounded-[2rem] animate-pulse" />
                        <div className="flex gap-4">
                            <div className="w-28 h-28 bg-white/5 rounded-2xl animate-pulse" />
                            <div className="w-28 h-28 bg-white/5 rounded-2xl animate-pulse border-2 border-dashed border-white/10" />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-12 lg:col-span-5 space-y-8">
                    {/* Sales Config Skeleton */}
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 animate-pulse" />
                            <div className="h-6 w-44 bg-white/10 rounded-lg animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
                                <div className="h-12 bg-white/5 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Summary Skeleton */}
                    <div className="rounded-[2rem] border-2 border-primary/10 bg-primary/5 p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <div className="h-6 w-36 bg-white/10 rounded-lg animate-pulse" />
                            <div className="h-6 w-20 bg-primary/20 rounded-full animate-pulse" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                            <div className="h-4 w-3/4 bg-white/5 rounded animate-pulse" />
                            <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse" />
                        </div>
                        <div className="pt-6 border-t border-white/10 flex flex-col items-end gap-2">
                            <div className="h-3 w-24 bg-primary/20 rounded animate-pulse" />
                            <div className="h-10 w-40 bg-white/10 rounded-xl animate-pulse" />
                        </div>
                    </div>

                    {/* Buttons Skeleton */}
                    <div className="flex gap-4">
                        <div className="flex-1 h-16 bg-white/5 rounded-2xl animate-pulse" />
                        <div className="flex-[2] h-16 bg-primary/20 rounded-2xl animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
