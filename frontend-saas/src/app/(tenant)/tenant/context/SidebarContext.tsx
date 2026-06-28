"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type SidebarContextType = {
    /** Desktop collapse (icon-only) */
    collapsed: boolean;
    setCollapsed: (value: boolean) => void;
    toggleSidebar: () => void;
    /** Mobile drawer open state (< lg) */
    mobileOpen: boolean;
    setMobileOpen: (value: boolean) => void;
    toggleMobile: () => void;
    closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebar_collapsed');
        if (savedState) {
            setCollapsed(JSON.parse(savedState));
        }
    }, []);

    const toggleSidebar = useCallback(() => {
        setCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebar_collapsed', JSON.stringify(newState));
            return newState;
        });
    }, []);

    const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);
    const closeMobile = useCallback(() => setMobileOpen(false), []);

    const value: SidebarContextType = {
        collapsed,
        setCollapsed,
        toggleSidebar,
        mobileOpen,
        setMobileOpen,
        toggleMobile,
        closeMobile,
    };

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
