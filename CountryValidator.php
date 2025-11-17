<?php
/**
 * Country Code Validator for Google Merchant Center Structured Data (PHP Version)
 * Ensures addressCountry values comply with ISO 3166-1 alpha-2 standards
 * 
 * @package CountryValidator
 * @version 1.0.0
 * @license MIT
 */

class CountryValidator {
    
    /**
     * ISO 3166-1 alpha-2 country codes (complete list)
     */
    private const VALID_ISO_CODES = [
        'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
        'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
        'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
        'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
        'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
        'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
        'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
        'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
        'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
        'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
        'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
        'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
        'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
        'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
        'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
        'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
        'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
        'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
        'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
        'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
        'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
    ];

    /**
     * Predefined country sets
     */
    private const PRESETS = [
        'CORE_MARKETS' => ['TN', 'US', 'GB', 'CA', 'AU', 'SA', 'AE', 'FR', 'DE', 'MA'],
        'EXTENDED_MARKETS' => [
            'TN', 'US', 'GB', 'CA', 'AU', 'FR', 'DE',
            'SA', 'AE', 'EG', 'MA', 'DZ', 'QA', 'KW', 'BH',
            'TR', 'PK', 'BD', 'ID', 'MY', 'SG',
            'NL', 'BE', 'SE', 'NO', 'DK'
        ],
        'GCC' => ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
        'ARAB_WORLD' => [
            'SA', 'AE', 'EG', 'MA', 'TN', 'DZ', 'QA', 'KW',
            'BH', 'OM', 'JO', 'LB', 'IQ', 'SY', 'YE', 'LY', 'SD', 'MR'
        ]
    ];

    /**
     * Validates a single country code
     * 
     * @param string $code Country code to validate
     * @return array ['valid' => bool, 'error' => ?string, 'normalized' => ?string]
     */
    public static function validateCode(string $code): array {
        $normalized = strtoupper(trim($code));

        // Length check
        if (strlen($normalized) !== 2) {
            return [
                'valid' => false,
                'error' => "Invalid length: expected 2 characters, got " . strlen($normalized) . ". Value: \"$code\""
            ];
        }

        // ISO registry check
        if (!in_array($normalized, self::VALID_ISO_CODES, true)) {
            return [
                'valid' => false,
                'error' => "Invalid country code: \"$normalized\" is not in ISO 3166-1 alpha-2 registry"
            ];
        }

        return [
            'valid' => true,
            'normalized' => $normalized
        ];
    }

    /**
     * Validates an array of country codes
     * 
     * @param array $codes Array of country codes
     * @param int $maxCount Maximum allowed countries
     * @param bool $allowEmpty Allow empty array
     * @return array ['valid' => bool, 'errors' => array, 'normalized' => ?array]
     */
    public static function validateCodes(
        array $codes, 
        int $maxCount = 50, 
        bool $allowEmpty = false
    ): array {
        $errors = [];
        $normalized = [];
        $seen = [];

        // Empty check
        if (empty($codes)) {
            if ($allowEmpty) {
                return ['valid' => true, 'errors' => [], 'normalized' => []];
            }
            return [
                'valid' => false,
                'errors' => ['Array is empty - at least one country code required']
            ];
        }

        // Count check
        if (count($codes) > $maxCount) {
            $errors[] = "Too many countries: " . count($codes) . " exceeds maximum of $maxCount";
        }

        // Validate each code
        foreach ($codes as $index => $code) {
            if (!is_string($code)) {
                $errors[] = "Index $index: Invalid type - expected string, got " . gettype($code);
                continue;
            }

            $result = self::validateCode($code);

            if (!$result['valid']) {
                $errors[] = "Index $index: " . $result['error'];
            } else {
                $norm = $result['normalized'];
                
                // Check duplicates
                if (in_array($norm, $seen, true)) {
                    $errors[] = "Duplicate country code at index $index: \"$norm\"";
                } else {
                    $normalized[] = $norm;
                    $seen[] = $norm;
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'normalized' => empty($errors) ? $normalized : null
        ];
    }

    /**
     * Sanitizes country input with safe fallback
     * 
     * @param string|array $input Raw country input
     * @param string $fallback Preset name to use if validation fails
     * @return array Valid country codes
     */
    public static function sanitize($input, string $fallback = 'CORE_MARKETS'): array {
        // Handle array input
        if (is_array($input)) {
            $result = self::validateCodes($input);
            if ($result['valid']) {
                return $result['normalized'];
            }
            error_log("Invalid country codes, using $fallback preset: " . json_encode($result['errors']));
            return self::PRESETS[$fallback] ?? self::PRESETS['CORE_MARKETS'];
        }

        // Handle string input
        if (is_string($input)) {
            // Check if it's a preset name
            $presetKey = strtoupper($input);
            if (isset(self::PRESETS[$presetKey])) {
                return self::PRESETS[$presetKey];
            }

            // Try to validate as country code
            $result = self::validateCode($input);
            if ($result['valid']) {
                return [$result['normalized']];
            }
            
            error_log("Invalid country code \"$input\", using $fallback preset");
            return self::PRESETS[$fallback] ?? self::PRESETS['CORE_MARKETS'];
        }

        // Invalid type
        error_log("Invalid input type, using $fallback preset");
        return self::PRESETS[$fallback] ?? self::PRESETS['CORE_MARKETS'];
    }

    /**
     * Generates shippingDestination object for schema.org
     * 
     * @param string|array $countries Country codes or preset name
     * @return array DefinedRegion object
     */
    public static function generateShippingDestination($countries): array {
        $validCodes = self::sanitize($countries);

        return [
            '@type' => 'DefinedRegion',
            'addressCountry' => $validCodes
        ];
    }

    /**
     * Get available preset names
     * 
     * @return array
     */
    public static function getPresets(): array {
        return array_keys(self::PRESETS);
    }

    /**
     * Get countries for a specific preset
     * 
     * @param string $presetName
     * @return array|null
     */
    public static function getPreset(string $presetName): ?array {
        $key = strtoupper($presetName);
        return self::PRESETS[$key] ?? null;
    }
}

// Example usage in your template
/*
// In your WooCommerce/Magento/Laravel template:

// Option 1: Use preset
$shippingDest = CountryValidator::generateShippingDestination('CORE_MARKETS');

// Option 2: Specify countries
$shippingDest = CountryValidator::generateShippingDestination(['US', 'GB', 'FR']);

// Option 3: Sanitize user input
$userInput = get_option('shipping_countries'); // From database/settings
$shippingDest = CountryValidator::generateShippingDestination($userInput);

// Use in Product schema
$productSchema = [
    '@context' => 'https://schema.org',
    '@type' => 'Product',
    'name' => 'ONSi Quranic Verses Box',
    'offers' => [
        '@type' => 'Offer',
        'price' => '59.90',
        'priceCurrency' => 'TND',
        'shippingDetails' => [
            '@type' => 'OfferShippingDetails',
            'shippingRate' => [
                '@type' => 'MonetaryAmount',
                'value' => '0',
                'currency' => 'TND'
            ],
            'shippingDestination' => $shippingDest
        ]
    ]
];

echo '<script type="application/ld+json">' . json_encode($productSchema, JSON_UNESCAPED_SLASHES) . '</script>';
*/
