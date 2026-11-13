import { useSessionBootstrap } from './useSessionBootstrap';

export interface FeatureTrialStatus {
    mode: 'days' | 'until';
    days?: number;
    until?: string;
    is_trial: boolean;
    expired: boolean;
    days_left: number;
    expires_at?: string | null;
}

/**
 * Custom hook for checking dynamic feature flags configured in the tenant's subscription plan.
 */
export function useFeatures() {
    const { data: bootstrapData } = useSessionBootstrap();
    
    // The features are stored as a Record<string, any> in the subscription plan.
    // If no features object exists, default to empty object.
    const rawFeatures = (bootstrapData?.tenant?.subscription_plan?.features || {}) as Record<string, any>;
    const trialStatusMap = (rawFeatures.__trial_status__ || {}) as Record<string, FeatureTrialStatus>;

    /**
     * Checks if a specific feature is enabled for the current tenant's plan.
     * @param featureKey - The unique key of the feature (e.g., 'inventario:productos:catalogo')
     * @param defaultValue - Fallback value if the feature is undefined in the DB (default: false)
     * @returns boolean indicating if the feature is active
     */
    const hasFeature = (featureKey: string, defaultValue: boolean = false): boolean => {
        const trial = trialStatusMap[featureKey];
        if (trial?.expired) {
            return false;
        }
        if (typeof rawFeatures[featureKey] === 'boolean') {
            return rawFeatures[featureKey];
        }
        return defaultValue;
    };

    /**
     * Returns trial/lifespan metadata for a feature or module ('module:<key>') if configured.
     */
    const getTrialInfo = (key: string): FeatureTrialStatus | null => {
        return trialStatusMap[key] || null;
    };

    return { hasFeature, getTrialInfo, features: rawFeatures, trialStatusMap };
}
