/**
 * Shared utilities for data parsing and processing across HMM visualization components
 */

/**
 * Parse string representation of arrays with multiple fallback strategies
 * @param {string|any} str - String to parse or already parsed value
 * @returns {any} Parsed array or original value
 */
export function parseStringArray(str) {
  try {
    if (!str) return [];

    // If already an array, return as-is
    if (Array.isArray(str)) return str;

    // If not a string, return as-is
    if (typeof str !== 'string') return str;

    // If string doesn't look like an array, return as-is
    if (!str.includes('[') || !str.includes(']')) return str;

    // Replace single quotes with double quotes for proper JSON parsing
    const jsonStr = str.replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch (e) {
    // Fallback: try extracting values manually
    try {
      const match = str.match(/\[(.*?)\]/);
      if (match && match[1]) {
        return match[1].split(',').map(item => {
          const trimmed = item.trim();
          // Try to parse as number, otherwise keep as string
          const num = parseFloat(trimmed);
          return isNaN(num) ? trimmed : num;
        });
      }
    } catch (fallbackError) {
      console.warn('Error parsing array with fallback:', str, fallbackError);
    }

    console.warn('Error parsing array:', str, e);
    return str; // Return original value if all parsing fails
  }
}

/**
 * Calculate entropy of a probability matrix
 * @param {number[][]} matrix - 2D probability matrix
 * @returns {number} Average entropy across all rows
 */
export function calculateMatrixEntropy(matrix) {
  if (!matrix || !matrix.length) return 0;

  // Calculate entropy for each row and average
  const rowEntropies = matrix.map(row => {
    if (!row || !row.length) return 0;

    let entropy = 0;
    const sum = row.reduce((a, b) => a + b, 0);

    // Avoid division by zero
    if (sum === 0) return 0;

    for (let p of row) {
      if (p > 0) {
        const normalized = p / sum;
        entropy -= normalized * Math.log2(normalized);
      }
    }

    return entropy;
  });

  return rowEntropies.reduce((a, b) => a + b, 0) / rowEntropies.length;
}

/**
 * Determine if a probability vector is deterministic (one-hot) or uniform
 * @param {number[]} pi - Probability vector
 * @returns {string} "deterministic" or "uniform"
 */
export function getPiType(pi) {
  if (!pi || !Array.isArray(pi)) return "uniform";

  // Check if one value is 1 and the rest are 0 (deterministic/one-hot)
  const isOnehot = pi.filter(val => Math.abs(val - 1) < 1e-5).length === 1 &&
                  pi.filter(val => Math.abs(val) < 1e-5).length === pi.length - 1;

  return isOnehot ? "deterministic" : "uniform";
}

/**
 * Categorize entropy values into predefined ranges
 * @param {number} entropy - Entropy value
 * @returns {string} Entropy category
 */
export function getEntropyCategory(entropy) {
  if (entropy < 0.01) return "0.0";
  if (entropy < 0.75) return "0.5";
  if (entropy < 1.25) return "1.0";
  if (entropy < 1.75) return "1.5";
  if (entropy < 2.25) return "2.0";
  if (entropy < 2.75) return "2.5";
  return "3.0";
}

/**
 * Format numeric values for display with proper precision
 * @param {any} value - Value to format
 * @param {number} precision - Number of decimal places (default: 4)
 * @returns {string} Formatted value
 */
export function formatValue(value, precision = 4) {
  if (value === null || value === undefined) return 'N/A';

  if (typeof value === 'number') {
    return isFinite(value) ? value.toFixed(precision) : 'Invalid';
  }

  if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = parseStringArray(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].toFixed ? parsed[0].toFixed(precision) : parsed[0];
      }
    } catch (e) {
      return value;
    }
  }

  return value.toString();
}

/**
 * Check if a value is a valid finite number
 * @param {any} value - Value to check
 * @returns {boolean} True if valid finite number
 */
export function isValidNumber(value) {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

/**
 * Safe array access with bounds checking
 * @param {any[]} array - Array to access
 * @param {number} index - Index to access
 * @param {any} defaultValue - Default value if index is out of bounds
 * @returns {any} Array value or default
 */
export function safeArrayAccess(array, index, defaultValue = null) {
  if (!Array.isArray(array) || index < 0 || index >= array.length) {
    return defaultValue;
  }
  return array[index];
}

/**
 * Extract unique values from array and sort them
 * @param {any[]} array - Array to extract unique values from
 * @param {Function} accessor - Optional accessor function for nested values
 * @returns {any[]} Sorted unique values
 */
export function getUniqueValues(array, accessor = (x) => x) {
  const unique = [...new Set(array.map(accessor))];

  // Sort numbers numerically, strings alphabetically
  return unique.sort((a, b) => {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  });
}

/**
 * Deep clone an object (for state management)
 * @param {any} obj - Object to clone
 * @returns {any} Deep cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}