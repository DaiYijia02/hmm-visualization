import { useState, useEffect, useCallback, useMemo } from 'react';
import Papa from 'papaparse';
import {
  getCategoryById,
  getDataSourcesForCategory,
  getCategoryConstraints
} from '../config/categories';
import { parseStringArray, getUniqueValues } from '../utils/dataUtils';

/**
 * Custom hook for loading data based on selected category
 * Handles both single files and directory-based data sources
 */
export function useCategoryData(categoryId) {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableVariables, setAvailableVariables] = useState({});
  const [dataSchema, setDataSchema] = useState(null);

  // Get category configuration
  const category = useMemo(() => getCategoryById(categoryId), [categoryId]);
  const dataSources = useMemo(() => getDataSourcesForCategory(categoryId), [categoryId]);
  const constraints = useMemo(() => getCategoryConstraints(categoryId), [categoryId]);

  // Get known files for directory data sources based on category
  const getKnownFilesForDirectory = useCallback((directoryPath) => {
    if (directoryPath.includes('early_nolambda_nobw')) {
      return [
        'Qwen2.5-0.5B.csv',
        'Qwen2.5-1.5B.csv',
        'Qwen2.5-3B.csv',
        'Qwen2.5-7B.csv',
        'Qwen2.5-7B_16_states.csv',
        'Qwen2.5-7B_64_states.csv',
        'Qwen2.5-7B_expand_obs.csv',
        'Qwen2.5-7B_expand_state.csv'
      ];
    }

    if (directoryPath.includes('early_2_emissions')) {
      return [
        'Llama-3.1-8B_11111_4096_2_state_2_emissions_2048.csv',
        'Llama-3.1-8B_11111_4096_entropy_2_emissions_2048.csv',
        'Llama-3.1-8B_11111_4096_lambda2_2_emissions_2048.csv',
        'Llama-3.1-8B_11111_4096_steady_state_2_emissions_2048.csv',
        'Llama-3.2-1B_11111_4096_2_state_2_emissions_2048.csv',
        'Llama-3.2-1B_11111_4096_entropy_2_emissions_2048.csv',
        'Llama-3.2-1B_11111_4096_lambda2_2_emissions_2048.csv',
        'Llama-3.2-1B_11111_4096_steady_state_2_emissions_2048.csv',
        'Llama-3.2-3B_11111_4096_2_state_2_emissions_2048.csv',
        'Llama-3.2-3B_11111_4096_entropy_2_emissions_2048.csv'
      ];
    }

    return [];
  }, []);

  // Load data from a single CSV file
  const loadSingleFile = useCallback(async (dataSource) => {
    try {
      const response = await fetch(dataSource.publicPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${dataSource.publicPath}: ${response.status}`);
      }

      const csvText = await response.text();

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn(`CSV parsing warnings for ${dataSource.publicPath}:`, results.errors);
            }
            resolve(results.data);
          },
          error: (parseError) => {
            reject(new Error(`Error parsing CSV ${dataSource.publicPath}: ${parseError.message}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Error loading ${dataSource.publicPath}: ${error.message}`);
    }
  }, []);

  // Load data from directory (simulate by trying to fetch known patterns)
  const loadDirectoryData = useCallback(async (dataSource) => {
    // For directory sources, we need to know the file names
    // This would typically require a server endpoint to list files
    // For now, we'll create a mapping based on known patterns

    const directoryFiles = getKnownFilesForDirectory(dataSource.path);
    const allData = [];

    for (const fileName of directoryFiles) {
      try {
        const publicPath = `${dataSource.publicPath}/${fileName}`;
        const response = await fetch(publicPath);
        if (!response.ok) {
          console.warn(`Could not fetch ${publicPath}, skipping...`);
          continue;
        }

        const csvText = await response.text();
        const data = await new Promise((resolve, reject) => {
          Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              // Add source file info to each row
              const dataWithSource = results.data.map(row => ({
                ...row,
                _sourceFile: fileName,
                _category: categoryId
              }));
              resolve(dataWithSource);
            },
            error: reject
          });
        });

        allData.push(...data);
      } catch (error) {
        console.warn(`Error loading ${fileName}:`, error.message);
      }
    }

    return allData;
  }, [categoryId, getKnownFilesForDirectory]);

  // Extract available variables from loaded data
  const extractAvailableVariables = useCallback((data) => {
    if (!data || data.length === 0) return {};

    const variables = {};

    // Extract unique values for key variables
    if (data[0].hasOwnProperty('num_state') || data[0].hasOwnProperty('num_states')) {
      const stateField = data[0].hasOwnProperty('num_state') ? 'num_state' : 'num_states';
      variables.numStates = getUniqueValues(data, row => row[stateField]);
    }

    if (data[0].hasOwnProperty('num_observation') || data[0].hasOwnProperty('num_observations')) {
      const obsField = data[0].hasOwnProperty('num_observation') ? 'num_observation' : 'num_observations';
      variables.numObservations = getUniqueValues(data, row => row[obsField]);
    }

    // For entropy-based categories
    if (data[0].hasOwnProperty('A_entropy')) {
      variables.aEntropy = getUniqueValues(data, row => parseFloat(row.A_entropy));
    }

    if (data[0].hasOwnProperty('B_entropy')) {
      variables.bEntropy = getUniqueValues(data, row => parseFloat(row.B_entropy));
    }

    // For lambda2 categories
    if (data[0].hasOwnProperty('lambda2')) {
      variables.lambda2 = getUniqueValues(data, row => parseFloat(row.lambda2));
    }

    // For steady state categories
    if (data[0].hasOwnProperty('steady_state')) {
      variables.steadyState = getUniqueValues(data, row => {
        const ss = row.steady_state;
        if (typeof ss === 'string') {
          const parsed = parseStringArray(ss);
          return Array.isArray(parsed) ? parsed.length : ss;
        }
        return ss;
      });
    }

    // Extract source files if available (for directory sources)
    if (data[0].hasOwnProperty('_sourceFile')) {
      variables.sourceFiles = getUniqueValues(data, row => row._sourceFile);
    }

    return variables;
  }, []);

  // Determine data schema from loaded data
  const analyzeDataSchema = useCallback((data) => {
    if (!data || data.length === 0) return null;

    const firstRow = data[0];
    const schema = {
      fields: Object.keys(firstRow).filter(key => !key.startsWith('_')),
      modelFields: [],
      metricFields: [],
      parameterFields: [],
      matrixFields: []
    };

    // Categorize fields
    schema.fields.forEach(field => {
      if (field.includes('_acc') || field.includes('_prob') ||
          field.includes('_kl') || field.includes('_hellinger')) {
        schema.metricFields.push(field);

        // Extract model name from metric field
        const modelName = field.replace(/_acc|_prob|_reverse_kl|_forward_kl|_hellinger_distance/g, '');
        if (!schema.modelFields.includes(modelName)) {
          schema.modelFields.push(modelName);
        }
      } else if (field === 'A' || field === 'B' || field === 'U' || field === 'Sigma' || field === 'U_inv') {
        schema.matrixFields.push(field);
      } else if (['num_state', 'num_states', 'num_observation', 'num_observations',
                 'lambda2', 'A_entropy', 'B_entropy', 'steady_state', 'pi', 'pi_0'].includes(field)) {
        schema.parameterFields.push(field);
      }
    });

    return schema;
  }, []);

  // Main data loading effect
  useEffect(() => {
    if (!categoryId || !category || !dataSources.length) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        let allData = [];

        // Load data from all sources
        for (const dataSource of dataSources) {
          let sourceData;

          if (dataSource.type === 'single_file') {
            sourceData = await loadSingleFile(dataSource);
          } else if (dataSource.type === 'directory') {
            sourceData = await loadDirectoryData(dataSource);
          } else {
            console.warn(`Unknown data source type: ${dataSource.type}`);
            continue;
          }

          if (sourceData && sourceData.length > 0) {
            // Add category info to each row
            const dataWithCategory = sourceData.map(row => ({
              ...row,
              _category: categoryId
            }));

            allData.push(...dataWithCategory);
          }
        }

        if (allData.length === 0) {
          throw new Error(`No data loaded for category: ${categoryId}`);
        }

        // Analyze the data
        const variables = extractAvailableVariables(allData);
        const schema = analyzeDataSchema(allData);

        setRawData(allData);
        setAvailableVariables(variables);
        setDataSchema(schema);
        setLoading(false);

      } catch (err) {
        console.error('Error loading category data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, [categoryId, category, dataSources, loadSingleFile, loadDirectoryData, extractAvailableVariables, analyzeDataSchema]);

  // Filtered data based on constraints
  const filteredData = useMemo(() => {
    if (!rawData.length) return [];

    return rawData.filter(row => {
      // Apply category constraints
      for (const [key, value] of Object.entries(constraints)) {
        const rowKey = key === 'num_states' ? (row.num_state || row.num_states) :
                      key === 'num_observations' ? (row.num_observation || row.num_observations) :
                      row[key];

        if (rowKey !== value) {
          return false;
        }
      }
      return true;
    });
  }, [rawData, constraints]);

  return {
    data: filteredData,
    rawData,
    loading,
    error,
    availableVariables,
    dataSchema,
    category,
    reload: () => {
      setRawData([]);
      setAvailableVariables({});
      setDataSchema(null);
    }
  };
}