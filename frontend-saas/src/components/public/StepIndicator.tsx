"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

interface StepIndicatorProps {
    currentStep: number;
    steps: string[];
    isDark?: boolean;
}

export default function StepIndicator({ currentStep, steps, isDark }: StepIndicatorProps) {
    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-center relative">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full" />

                {/* Active Progress Bar */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 transition-all duration-500 rounded-full -z-10"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = stepNumber === currentStep;
                    const isCompleted = stepNumber < currentStep;

                    return (
                        <div key={index} className="flex flex-col items-center">
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: isActive || isCompleted ? "#10b981" : (isDark ? "#0f172a" : "#ffffff"),
                                    borderColor: isActive ? "#34d399" : isCompleted ? "#10b981" : (isDark ? "#334155" : "#cbd5e1"),
                                    scale: isActive ? 1.1 : 1
                                }}
                                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center transition-colors duration-300 z-10 ${isActive || isCompleted ? "text-white" : "text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                {isCompleted ? (
                                    <Check size={16} strokeWidth={4} />
                                ) : (
                                    <span className="text-xs font-black">{stepNumber}</span>
                                )}
                            </motion.div>
                            <span className={`mt-3 text-[10px] uppercase tracking-widest font-black transition-colors duration-300 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"
                                }`}>
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
