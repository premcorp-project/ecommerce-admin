// Pre-built attribute presets for common e-commerce product types.
// Each preset has a display label, the attribute key sent to the backend,
// and a default set of values the admin can use as-is or customise.

export interface AttributePreset {
    label: string;
    key: string;
    values: string[];
    icon: string;
}

export const PRESET_ATTRIBUTES: AttributePreset[] = [
    {
        label: 'Size',
        key: 'Size',
        values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
        icon: '📐',
    },
    {
        label: 'Color',
        key: 'Color',
        values: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Navy', 'Grey', 'Pink', 'Purple'],
        icon: '🎨',
    },
    {
        label: 'Material',
        key: 'Material',
        values: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Leather', 'Denim', 'Nylon'],
        icon: '🧵',
    },
    {
        label: 'Storage',
        key: 'Storage',
        values: ['64GB', '128GB', '256GB', '512GB', '1TB'],
        icon: '💾',
    },
    {
        label: 'RAM',
        key: 'RAM',
        values: ['4GB', '8GB', '16GB', '32GB', '64GB'],
        icon: '🖥️',
    },
    {
        label: 'Weight',
        key: 'Weight',
        values: ['250g', '500g', '1kg', '2kg', '5kg', '10kg', '25kg'],
        icon: '⚖️',
    },
    {
        label: 'Volume',
        key: 'Volume',
        values: ['50ml', '100ml', '250ml', '500ml', '1L', '2L', '5L'],
        icon: '🧴',
    },
    {
        label: 'Scent',
        key: 'Scent',
        values: ['Unscented', 'Lavender', 'Citrus', 'Mint', 'Rose', 'Vanilla', 'Eucalyptus'],
        icon: '🌸',
    },
    {
        label: 'Flavour',
        key: 'Flavour',
        values: ['Original', 'Chocolate', 'Vanilla', 'Strawberry', 'Mint', 'Unflavoured'],
        icon: '🍓',
    },
    {
        label: 'Pack Size',
        key: 'Pack Size',
        values: ['Single', 'Pack of 2', 'Pack of 4', 'Pack of 6', 'Pack of 10', 'Pack of 12', 'Pack of 24'],
        icon: '📦',
    },
    {
        label: 'Voltage',
        key: 'Voltage',
        values: ['110V', '220V', '240V', '12V', '24V'],
        icon: '⚡',
    },
    {
        label: 'Connectivity',
        key: 'Connectivity',
        values: ['Bluetooth', 'Wi-Fi', 'USB-C', 'USB-A', 'HDMI', 'Ethernet', 'NFC'],
        icon: '📡',
    },
    {
        label: 'Style',
        key: 'Style',
        values: ['Classic', 'Modern', 'Vintage', 'Minimalist', 'Sport', 'Casual', 'Formal'],
        icon: '✨',
    },
    {
        label: 'Length',
        key: 'Length',
        values: ['30cm', '50cm', '1m', '2m', '3m', '5m', '10m'],
        icon: '📏',
    },
    {
        label: 'Finish',
        key: 'Finish',
        values: ['Matte', 'Gloss', 'Satin', 'Metallic', 'Textured', 'Natural'],
        icon: '🪣',
    },
];
