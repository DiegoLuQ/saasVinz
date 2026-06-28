import { useSessionBootstrap } from './useSessionBootstrap';

/**
 * Custom hook for checking dynamic feature flags configured in the tenant's subscription plan.
 */
export function useFeatures() {
    const { data: bootstrapData } = useSessionBootstrap();
    
    // The features are stored as a Record<string, boolean> in the subscription plan.
    // If no features object exists, default to empty object.
    const features = bootstrapData?.tenant?.subscription_plan?.features || {};

    /**
     * Checks if a specific feature is enabled for the current tenant's plan.
     * @param featureKey - The unique key of the feature (e.g., 'inventario:productos:catalogo')
     * @param defaultValue - Fallback value if the feature is undefined in the DB (default: false)
     * @returns boolean indicating if the feature is active
     */
    const hasFeature = (featureKey: string, defaultValue: boolean = false): boolean => {
        if (typeof features[featureKey] === 'boolean') {
            return features[featureKey];
        }
        return defaultValue;
    };

    return { hasFeature, features };
}
