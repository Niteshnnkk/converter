import {
    Maximize2,
    Minimize2,
    Crop,
    RefreshCw,
    Image,
    Smartphone,
    Eraser,
    Square,
    Droplets,
    Palette,
    Type,
    Frame,
    Pipette,
    Info,
    Layers,
    type LucideIcon,
} from 'lucide-react';

export interface ImageToolConfig {
    id: string;
    name: string;
    description: string;
    route: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    category: ImageToolCategory;
}

export type ImageToolCategory =
    | 'resize'
    | 'compress'
    | 'crop-convert'
    | 'edit-filter'
    | 'utility';

export const imageCategoryLabels: Record<ImageToolCategory, string> = {
    resize: 'Resize & Scale',
    compress: 'Compress & Optimize',
    'crop-convert': 'Crop & Convert',
    'edit-filter': 'Edit & Filters',
    utility: 'Utilities',
};

export const imageTools: ImageToolConfig[] = [
    // Resize & Scale
    {
        id: 'resize-image',
        name: 'Resize Image',
        description: 'Resize images by pixels, percentage, or physical units with aspect ratio control',
        route: '/resize-image',
        icon: Maximize2,
        color: '#6366F1',
        bgColor: '#EEF2FF',
        category: 'resize',
    },
    {
        id: 'social-media-resize',
        name: 'Social Media Resize',
        description: 'One-click resize for YouTube, Instagram, Facebook, WhatsApp & more',
        route: '/social-media-resize',
        icon: Smartphone,
        color: '#EC4899',
        bgColor: '#FDF2F8',
        category: 'resize',
    },

    // Compress & Optimize
    {
        id: 'compress-image',
        name: 'Compress Image',
        description: 'Reduce file size with quality control, target KB, and smart optimization',
        route: '/compress-image',
        icon: Minimize2,
        color: '#EF4444',
        bgColor: '#FEF2F2',
        category: 'compress',
    },

    // Crop & Convert
    {
        id: 'crop-image',
        name: 'Crop Image',
        description: 'Freeform crop, aspect ratio presets, circle crop, and grid splitter',
        route: '/crop-image',
        icon: Crop,
        color: '#22C55E',
        bgColor: '#F0FDF4',
        category: 'crop-convert',
    },
    {
        id: 'convert-image',
        name: 'Convert Image',
        description: 'Convert between PNG, JPG, WebP, BMP, GIF, ICO and Base64',
        route: '/convert-image',
        icon: RefreshCw,
        color: '#F97316',
        bgColor: '#FFF7ED',
        category: 'crop-convert',
    },
    {
        id: 'rotate-image',
        name: 'Rotate & Flip',
        description: 'Rotate any angle, flip horizontal or vertical with live preview',
        route: '/rotate-image',
        icon: RefreshCw,
        color: '#3B82F6',
        bgColor: '#EFF6FF',
        category: 'crop-convert',
    },

    // Edit & Filters
    {
        id: 'photo-filters',
        name: 'Photo Filters',
        description: 'Brightness, contrast, saturation, grayscale, sepia, blur, sharpen & more',
        route: '/photo-filters',
        icon: Palette,
        color: '#8B5CF6',
        bgColor: '#F5F3FF',
        category: 'edit-filter',
    },
    {
        id: 'add-watermark',
        name: 'Add Watermark',
        description: 'Text or image watermark with opacity, position, and tiling control',
        route: '/add-watermark',
        icon: Droplets,
        color: '#06B6D4',
        bgColor: '#ECFEFF',
        category: 'edit-filter',
    },
    {
        id: 'blur-image',
        name: 'Blur Image',
        description: 'Blur faces, license plates, or any custom area in your image',
        route: '/blur-image',
        icon: Square,
        color: '#64748B',
        bgColor: '#F8FAFC',
        category: 'edit-filter',
    },
    {
        id: 'remove-background',
        name: 'Remove Background',
        description: 'Remove or replace image background by color selection',
        route: '/remove-background',
        icon: Eraser,
        color: '#DC2626',
        bgColor: '#FEF2F2',
        category: 'edit-filter',
    },
    {
        id: 'meme-generator',
        name: 'Meme Generator',
        description: 'Create memes with top and bottom text in classic Impact font',
        route: '/meme-generator',
        icon: Type,
        color: '#EAB308',
        bgColor: '#FEFCE8',
        category: 'edit-filter',
    },
    {
        id: 'add-border',
        name: 'Add Border',
        description: 'Add solid borders, frames, and rounded corners to your images',
        route: '/add-border',
        icon: Frame,
        color: '#D97706',
        bgColor: '#FFFBEB',
        category: 'edit-filter',
    },

    // Utilities
    {
        id: 'color-picker',
        name: 'Color Picker',
        description: 'Extract dominant colors and pick any color from your image',
        route: '/color-picker',
        icon: Pipette,
        color: '#7C3AED',
        bgColor: '#F5F3FF',
        category: 'utility',
    },
    {
        id: 'image-metadata',
        name: 'Image Metadata',
        description: 'View EXIF data, remove metadata, and change DPI resolution',
        route: '/image-metadata',
        icon: Info,
        color: '#0891B2',
        bgColor: '#ECFEFF',
        category: 'utility',
    },
    {
        id: 'batch-image',
        name: 'Batch Processing',
        description: 'Resize, convert, or watermark multiple images at once',
        route: '/batch-image',
        icon: Layers,
        color: '#059669',
        bgColor: '#ECFDF5',
        category: 'utility',
    },
    {
        id: 'drawing-tool',
        name: 'Drawing Tool',
        description: 'Draw shapes, arrows, text, and freehand annotations on images',
        route: '/drawing-tool',
        icon: Frame,
        color: '#E11D48',
        bgColor: '#FFF1F2',
        category: 'edit-filter',
    },
    {
        id: 'html-to-image',
        name: 'HTML to Image',
        description: 'Capture any webpage as a high-quality PNG screenshot',
        route: '/html-to-image',
        icon: Image,
        color: '#0EA5E9',
        bgColor: '#F0F9FF',
        category: 'utility',
    },
];

export const imageCategories: ImageToolCategory[] = [
    'resize',
    'compress',
    'crop-convert',
    'edit-filter',
    'utility',
];

export const getImageToolsByCategory = (category: ImageToolCategory): ImageToolConfig[] => {
    return imageTools.filter((tool) => tool.category === category);
};

export const getImageToolById = (id: string): ImageToolConfig | undefined => {
    return imageTools.find((tool) => tool.id === id);
};
