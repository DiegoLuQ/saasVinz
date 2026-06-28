// SVG clip paths for custom shapes
export const getClipPath = (shape: string) => {
    switch (shape) {
        case 'circle':
            return 'circle(50% at 50% 50%)';
        case 'square':
            return 'none';
        case 'star':
            return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        case 'flower':
            return 'polygon(50% 0%, 60% 20%, 80% 10%, 70% 30%, 90% 40%, 70% 50%, 90% 60%, 70% 70%, 80% 90%, 60% 80%, 50% 100%, 40% 80%, 20% 90%, 30% 70%, 10% 60%, 30% 50%, 10% 40%, 30% 30%, 20% 10%, 40% 20%)';
        default:
            return 'circle(50% at 50% 50%)';
    }
};

export const getImageFilter = (filter: string) => {
    switch (filter) {
        case 'blur':
            return 'blur(8px)';
        case 'grayscale':
            return 'grayscale(100%)';
        case 'sepia':
            return 'sepia(100%)';
        case 'brightness':
            return 'brightness(1.3)';
        default:
            return 'none';
    }
};
