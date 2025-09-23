import { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';

/**
 * Custom hook for loading and parsing CSV files
 * @param {string} filename - CSV filename to load from ./data/ directory
 * @param {Object} options - Papa Parse options
 * @returns {Object} { data, loading, error, reload }
 */
export function useCSVData(filename, options = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const defaultOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    ...options
  };

  const loadData = useCallback(async () => {
    if (!filename) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`./data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      Papa.parse(csvText, {
        ...defaultOptions,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn(`CSV parsing warnings for ${filename}:`, results.errors);
          }
          setData(results.data);
          setLoading(false);
        },
        error: (parseError) => {
          setError(`Error parsing CSV ${filename}: ${parseError.message}`);
          setLoading(false);
        }
      });
    } catch (fetchError) {
      setError(`Error loading ${filename}: ${fetchError.message}`);
      setLoading(false);
    }
  }, [filename, JSON.stringify(defaultOptions)]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload };
}

/**
 * Custom hook for loading multiple CSV files
 * @param {Array} fileConfigs - Array of {filename, key} objects
 * @param {Object} options - Papa Parse options
 * @returns {Object} { data, loading, error, reload }
 */
export function useMultipleCSVData(fileConfigs, options = {}) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const defaultOptions = {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    ...options
  };

  const loadData = useCallback(async () => {
    if (!fileConfigs || fileConfigs.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = {};
      const loadPromises = fileConfigs.map(async ({ filename, key }) => {
        try {
          const response = await fetch(`./data/${filename}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
          }

          const csvText = await response.text();

          return new Promise((resolve, reject) => {
            Papa.parse(csvText, {
              ...defaultOptions,
              complete: (parseResults) => {
                if (parseResults.errors.length > 0) {
                  console.warn(`CSV parsing warnings for ${filename}:`, parseResults.errors);
                }
                results[key] = parseResults.data;
                resolve();
              },
              error: (parseError) => {
                reject(new Error(`Error parsing CSV ${filename}: ${parseError.message}`));
              }
            });
          });
        } catch (fetchError) {
          throw new Error(`Error loading ${filename}: ${fetchError.message}`);
        }
      });

      await Promise.all(loadPromises);
      setData(results);
      setLoading(false);
    } catch (loadError) {
      setError(loadError.message);
      setLoading(false);
    }
  }, [JSON.stringify(fileConfigs), JSON.stringify(defaultOptions)]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reload = useCallback(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, reload };
}

/**
 * Custom hook for filtered and processed CSV data
 * @param {string} filename - CSV filename
 * @param {Function} processor - Function to process each row
 * @param {Object} filters - Filter criteria
 * @returns {Object} { data, filteredData, loading, error, reload }
 */
export function useProcessedCSVData(filename, processor, filters = {}) {
  const { data: rawData, loading, error, reload } = useCSVData(filename);
  const [processedData, setProcessedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (rawData.length === 0) {
      setProcessedData([]);
      setFilteredData([]);
      return;
    }

    try {
      // Process raw data
      const processed = processor ? rawData.map(processor) : rawData;
      setProcessedData(processed);

      // Apply filters
      let filtered = processed;
      if (Object.keys(filters).length > 0) {
        filtered = processed.filter(row => {
          return Object.entries(filters).every(([key, value]) => {
            if (value === null || value === undefined) return true;
            return row[key] === value;
          });
        });
      }
      setFilteredData(filtered);
    } catch (processingError) {
      console.error('Error processing data:', processingError);
      setProcessedData([]);
      setFilteredData([]);
    }
  }, [rawData, processor, JSON.stringify(filters)]);

  return {
    data: rawData,
    processedData,
    filteredData,
    loading,
    error,
    reload
  };
}