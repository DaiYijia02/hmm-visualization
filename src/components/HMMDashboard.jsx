import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import './HMMDashboard.css';

const HMMDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to categorize steady state distributions
  const getSteadyStateLabel = (steadyStateStr) => {
    try {
      const steadyState = JSON.parse(steadyStateStr.replace(/'/g, '"'));
      const maxProb = Math.max(...steadyState);
      const minProb = Math.min(...steadyState);
      const numStates = steadyState.length;
      const uniformProb = 1.0 / numStates;

      // Check if uniform (all values close to 1/n)
      const isUniform = steadyState.every(p => Math.abs(p - uniformProb) < 0.05);
      if (isUniform) return 'Uniform';

      // Check if deterministic (one state has probability close to 1)
      if (maxProb > 0.95) return 'Deterministic';

      // Otherwise it's skewed
      return 'Skewed';
    } catch (e) {
      return `${steadyStateStr.split(',').length}D`;
    }
  };
  const [selectedTopic, setSelectedTopic] = useState('entropy');
  const [availableParameters, setAvailableParameters] = useState({});
  const [selectedHMMParams, setSelectedHMMParams] = useState({});
  const [filteredData, setFilteredData] = useState([]);

  // Topic definitions
  const topics = [
    { key: 'entropy', label: 'Entropy Analysis', file: 'entropy_results.csv' },
    { key: 'lambda2', label: 'Mixing Rate (Lambda2)', file: 'lambda2_results.csv' },
    { key: 'steady_state', label: 'Steady State Analysis', file: 'steady_state_results.csv' }
  ];

  // HMM Parameter definitions (keys that determine HMM configuration)
  const getHMMParamKeys = () => {
    if (selectedTopic === 'steady_state') {
      return ['num_state', 'num_observation', 'B_entropy', 'steady_state'];
    }
    if (selectedTopic === 'lambda2') {
      return ['num_state', 'num_observation', 'lambda2', 'B_entropy'];
    }
    if (selectedTopic === 'entropy') {
      return ['num_state', 'num_observation', 'A_entropy', 'B_entropy'];
    }
    return ['num_state', 'num_observation', 'lambda2', 'A_entropy', 'B_entropy'];
  };

  const hmmParamKeys = getHMMParamKeys();

  // Model result columns
  const modelColumns = [
    // LLM Models - Ordered by preference: Qwen 7B → 3B → 1.5B → 0.5B, then Llama 8B → 3B → 1B
    { key: 'llm_qwen_7b', label: 'Qwen 7B', group: 'LLM Models' },
    { key: 'llm_qwen_3b', label: 'Qwen 3B', group: 'LLM Models' },
    { key: 'llm_qwen_1_5b', label: 'Qwen 1.5B', group: 'LLM Models' },
    { key: 'llm_qwen_0_5b', label: 'Qwen 0.5B', group: 'LLM Models' },
    { key: 'llm_llama_8b', label: 'Llama 8B', group: 'LLM Models' },
    { key: 'llm_llama_3b', label: 'Llama 3B', group: 'LLM Models' },
    { key: 'llm_llama_1b', label: 'Llama 1B', group: 'LLM Models' },

    // HMM Methods (moved to second position)
    { key: 'viterbi', label: 'Viterbi', group: 'HMM Methods' },
    { key: 'bw', label: 'Baum-Welch', group: 'HMM Methods' },

    // N-gram Models
    { key: '1-gram', label: '1-gram', group: 'N-gram Models' },
    { key: '2-gram', label: '2-gram', group: 'N-gram Models' },
    { key: '3-gram', label: '3-gram', group: 'N-gram Models' },
    { key: '4-gram', label: '4-gram', group: 'N-gram Models' },

    // Conditional Probability Models
    { key: 'p_o_given_prev_h', label: 'P(o|prev_h)', group: 'Conditional Models' },
    { key: 'p_o_t_given_prev_1_o', label: 'P(o_t|prev_1_o)', group: 'Conditional Models' },
    { key: 'p_o_t_given_prev_2_o', label: 'P(o_t|prev_2_o)', group: 'Conditional Models' },
    { key: 'p_o_t_given_prev_3_o', label: 'P(o_t|prev_3_o)', group: 'Conditional Models' },
    { key: 'p_o_t_given_prev_4_o', label: 'P(o_t|prev_4_o)', group: 'Conditional Models' },
    { key: 'p_o_t_given_prev_all_o', label: 'P(o_t|all_prev_o)', group: 'Conditional Models' }
  ];

  // Metric types
  const metricTypes = [
    { key: 'acc', label: 'Accuracy' },
    { key: 'prob', label: 'Probability' },
    { key: 'reverse_kl', label: 'Reverse KL Divergence' },
    { key: 'forward_kl', label: 'Forward KL Divergence' },
    { key: 'hellinger_distance', label: 'Hellinger Distance' }
  ];

  const [selectedMetric, setSelectedMetric] = useState('acc');
  const [selectedModels, setSelectedModels] = useState(new Set(['llm_qwen_7b', 'viterbi', 'bw', '2-gram']));

  // Load data for selected topic
  const loadData = async (topic) => {
    setLoading(true);
    console.log(`Loading data for topic: ${topic}`);
    try {
      const topicConfig = topics.find(t => t.key === topic);
      const response = await fetch(`/hmm-visualization/data/paper/${topicConfig.file}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();
      console.log(`CSV text length: ${csvText.length}`);

      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const cleanData = results.data.filter(row => row.num_state && row.num_state.trim() !== '');
          console.log(`Parsed ${cleanData.length} rows for ${topic}`);
          setData(cleanData);
          analyzeParameters(cleanData);
          setLoading(false);
        },
        error: (error) => {
          console.error('Error parsing CSV:', error);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  // Analyze available parameter values
  const analyzeParameters = (data) => {
    const params = {};

    hmmParamKeys.forEach(key => {
      let values = data.map(row => {
        const val = row[key];
        // Handle array values for steady_state
        if (typeof val === 'string' && val.startsWith('[') && val !== '[]') {
          return val; // Keep as string for now, will parse later
        }
        const numVal = parseFloat(val);
        return isNaN(numVal) ? val : numVal;
      }).filter(v => {
        if (v === undefined || v === null) return false;
        // Allow string arrays (like steady_state data)
        if (typeof v === 'string' && v.startsWith('[')) return true;
        // Allow valid numbers
        return !isNaN(v);
      });

      // Special handling for steady_state - group by labels
      if (key === 'steady_state') {
        const labelGroups = {};
        values.forEach(arrayStr => {
          const label = getSteadyStateLabel(arrayStr);
          if (!labelGroups[label]) {
            labelGroups[label] = [];
          }
          labelGroups[label].push(arrayStr);
        });
        // Use labels as the available options
        values = Object.keys(labelGroups).sort();
      } else {
        // Special handling for A_entropy - round to nearest 0.5
        if (key === 'A_entropy') {
          values = values.map(v => Math.round(v * 2) / 2); // Round to nearest 0.5
        }

        // Remove duplicates and sort
        values = [...new Set(values)];
        values = values.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
      }

      params[key] = values;

      console.log(`${key} parameter values:`, params[key]);
    });

    setAvailableParameters(params);

    // Check if current selection is valid for this topic's data
    const isCurrentSelectionValid = () => {
      if (Object.keys(selectedHMMParams).length === 0) return false;

      return Object.entries(selectedHMMParams).every(([key, value]) => {
        const availableValues = params[key] || [];
        if (typeof value === 'number') {
          return availableValues.some(av => Math.abs(av - value) <= 0.02);
        }
        return availableValues.includes(value);
      });
    };

    // Only initialize to defaults if no valid previous configuration exists
    if (!isCurrentSelectionValid()) {
      // For non-entropy topics, use simpler initialization
      let defaults = {};
      if (selectedTopic === 'entropy') {
        // Use first available values for entropy
        Object.keys(params).forEach(key => {
          if (params[key].length > 0) {
            let defaultValue = params[key][0];
            if (!isNaN(defaultValue) && defaultValue !== '' && (typeof defaultValue !== 'string' || (typeof defaultValue === 'string' && !defaultValue.startsWith('[')))) {
              defaultValue = parseFloat(defaultValue);
            }
            defaults[key] = defaultValue;
          }
        });
      } else {
        // For lambda2/steady_state, use the parameters from the first row that has data
        if (data.length > 0) {
          const firstRow = data[0];
          hmmParamKeys.forEach(key => {
            if (firstRow[key] !== undefined && firstRow[key] !== null) {
              let value = firstRow[key];
              if (key === 'steady_state' && typeof value === 'string' && value.startsWith('[')) {
                // Convert steady_state array to label
                value = getSteadyStateLabel(value);
              } else if (!isNaN(value) && value !== '') {
                // Parse numeric values
                value = parseFloat(value);
              }
              defaults[key] = value;
            }
          });
        }
      }
      console.log('Initializing to valid HMM parameters:', defaults);
      setSelectedHMMParams(defaults);
    } else {
      console.log('Preserving existing valid HMM parameters:', selectedHMMParams);
    }
  };

  // Find the best compatible parameter combination
  const findCompatibleParameters = (newParams, changedParamKey) => {
    if (data.length === 0) return newParams;

    console.log(`Finding compatible parameters for ${changedParamKey}=${newParams[changedParamKey]}`);

    // Get all possible parameter combinations that exist in the data
    const validCombinations = data.map(row => {
      const combination = {};
      hmmParamKeys.forEach(key => {
        let value = row[key];

        // Handle array values
        if (typeof value === 'string' && value.startsWith('[')) {
          combination[key] = value;
        } else if (!isNaN(value) && value !== '') {
          // Round A_entropy to nearest 0.5 for consistency
          if (key === 'A_entropy') {
            combination[key] = Math.round(parseFloat(value) * 2) / 2;
          } else {
            combination[key] = parseFloat(value);
          }
        } else {
          combination[key] = value;
        }
      });
      return combination;
    });

    console.log(`Found ${validCombinations.length} valid combinations in data`);

    // Filter combinations that match the changed parameter
    const matchingCombinations = validCombinations.filter(combination => {
      const targetValue = newParams[changedParamKey];
      const combinationValue = combination[changedParamKey];

      // Handle array values
      if (typeof combinationValue === 'string' && combinationValue.startsWith('[')) {
        return combinationValue === targetValue;
      }

      // Handle numeric values with tolerance
      if (typeof targetValue === 'number' && typeof combinationValue === 'number') {
        const tolerance = 0.02;
        return Math.abs(combinationValue - targetValue) <= tolerance;
      }

      // Handle string values
      return combinationValue === targetValue;
    });

    console.log(`Found ${matchingCombinations.length} combinations matching ${changedParamKey}=${newParams[changedParamKey]}`);

    if (matchingCombinations.length === 0) {
      console.log('No matching combinations found, returning original params');
      return newParams;
    }

    // If the user explicitly selected a parameter, try to preserve their other selections
    // even if they don't have data
    const preserveUserSelections = true;
    if (preserveUserSelections) {
      console.log(`Preserving user selection for ${changedParamKey}=${newParams[changedParamKey]}`);
      return newParams;
    }

    // Find the combination that is closest to current selection
    let bestCombination = matchingCombinations[0];
    let bestScore = 0;

    for (const combination of matchingCombinations) {
      let score = 0;
      // Give points for parameters that match current selection
      hmmParamKeys.forEach(key => {
        if (key === changedParamKey) return; // Skip the changed parameter

        const currentValue = selectedHMMParams[key];
        const combinationValue = combination[key];

        if (typeof currentValue === 'number' && typeof combinationValue === 'number') {
          if (Math.abs(currentValue - combinationValue) <= 0.02) score += 1;
        } else if (currentValue === combinationValue) {
          score += 1;
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestCombination = combination;
      }
    }

    console.log(`Selected best combination with score ${bestScore}:`, bestCombination);
    return bestCombination;
  };

  // Filter data based on selected HMM parameters
  useEffect(() => {
    if (data.length === 0 || Object.keys(selectedHMMParams).length === 0) {
      console.log('No data or no selected params - setting filtered data to empty');
      setFilteredData([]);
      return;
    }

    console.log('Filtering data with params:', selectedHMMParams);
    console.log('Total rows in data:', data.length);
    console.log('Sample row for comparison:', data[0]);

    const filtered = data.filter(row => {
      const matches = Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
        const rowValue = row[key];

        // Handle array values (like steady_state)
        if (typeof rowValue === 'string' && rowValue.startsWith('[')) {
          let match;
          if (key === 'steady_state') {
            // For steady_state, compare labels instead of exact arrays
            const rowLabel = getSteadyStateLabel(rowValue);
            match = rowLabel === selectedValue;
          } else {
            match = rowValue === selectedValue;
          }
          if (!match) {
            console.log(`Array mismatch for ${key}: row="${rowValue}" vs selected="${selectedValue}"`);
          }
          return match;
        }

        // Handle numeric values with tolerance
        if (typeof selectedValue === 'number') {
          const numRowValue = parseFloat(rowValue);
          const tolerance = key === 'A_entropy' ? 0.02 : 0.02;
          const match = Math.abs(numRowValue - selectedValue) <= tolerance;
          if (!match) {
            console.log(`Numeric mismatch for ${key}: row=${numRowValue} vs selected=${selectedValue} (diff=${Math.abs(numRowValue - selectedValue)})`);
          }
          return match;
        }

        // Handle string values
        const match = rowValue === selectedValue;
        if (!match) {
          console.log(`String mismatch for ${key}: row="${rowValue}" vs selected="${selectedValue}"`);
        }
        return match;
      });

      return matches;
    });

    console.log(`Filtered ${filtered.length} rows from ${data.length} total rows`);
    console.log('Filter criteria:', selectedHMMParams);
    if (filtered.length > 0) {
      console.log('Sample filtered row:', filtered[0]);
    }
    setFilteredData(filtered);
  }, [data, selectedHMMParams]);

  // Load data when topic changes
  useEffect(() => {
    loadData(selectedTopic);
  }, [selectedTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sequence lengths corresponding to array indices
  const sequenceLengths = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

  // Prepare visualization data
  const getVisualizationData = () => {
    if (filteredData.length === 0) return [];

    // Get data for each sequence length
    return sequenceLengths.map(seqLength => {
      const dataPoint = { sequenceLength: seqLength };

      // For each selected model, extract the metric value at this sequence length
      modelColumns.forEach(model => {
        if (!selectedModels.has(model.key)) return;

        const columnKey = `${model.key}_${selectedMetric}`;
        const values = filteredData.map(row => {
          const val = row[columnKey];
          if (typeof val === 'string' && val.startsWith('[')) {
            try {
              const arr = JSON.parse(val.replace(/'/g, '"'));
              const seqIndex = sequenceLengths.indexOf(seqLength);
              return seqIndex >= 0 && seqIndex < arr.length ? parseFloat(arr[seqIndex]) : null;
            } catch {
              return null;
            }
          }
          // For non-array values, only show at sequence length 2048 (last position)
          return seqLength === 2048 ? (parseFloat(val) || null) : null;
        }).filter(v => v !== null);

        // Average the values for this sequence length
        if (values.length > 0) {
          dataPoint[model.key] = values.reduce((sum, v) => sum + v, 0) / values.length;
        }
      });

      return dataPoint;
    }).filter(point => Object.keys(point).length > 1); // Keep only points with at least one model data
  };

  const visualizationData = getVisualizationData();

  // Calculate available options for each parameter given current selections
  const getAvailableOptionsForParameter = (targetParamKey) => {
    if (data.length === 0) return {};

    // Create a partial selection excluding the target parameter
    const partialSelection = { ...selectedHMMParams };
    delete partialSelection[targetParamKey];

    const optionCounts = {};

    // For each possible value of the target parameter
    (availableParameters[targetParamKey] || []).forEach(value => {
      const testSelection = { ...partialSelection, [targetParamKey]: value };

      // Count how many rows match this combination AND have valid data
      const matchingRows = data.filter(row => {
        // First check if parameters match
        const parametersMatch = Object.entries(testSelection).every(([key, selectedValue]) => {
          const rowValue = row[key];

          // Handle array values (like steady_state)
          if (typeof rowValue === 'string' && rowValue.startsWith('[')) {
            if (key === 'steady_state') {
              // For steady_state, compare labels instead of exact arrays
              const rowLabel = getSteadyStateLabel(rowValue);
              return rowLabel === selectedValue;
            }
            return rowValue === selectedValue;
          }

          // Handle numeric values with tolerance
          if (typeof selectedValue === 'number') {
            const numRowValue = parseFloat(rowValue);
            const tolerance = 0.02;
            return Math.abs(numRowValue - selectedValue) <= tolerance;
          }

          // Handle string values
          return rowValue === selectedValue;
        });

        if (!parametersMatch) return false;

        // Then check if this row has valid (non-infinite, non-NaN) data for at least some models and metrics
        const hasValidData = modelColumns.some(model => {
          // Check all available metrics, not just the selected one
          return metricTypes.some(metricType => {
            const columnKey = `${model.key}_${metricType.key}`;
            const val = row[columnKey];

            if (typeof val === 'string' && val.startsWith('[')) {
              try {
                const arr = JSON.parse(val.replace(/'/g, '"'));
                return arr.some(v => !isNaN(v) && isFinite(v));
              } catch {
                return false;
              }
            }

            const numVal = parseFloat(val);
            return !isNaN(numVal) && isFinite(numVal);
          });
        });

        return hasValidData;
      });

      optionCounts[value] = matchingRows.length;
    });

    console.log(`Option counts for ${targetParamKey}:`, optionCounts);

    // Special debugging for B_entropy
    if (targetParamKey === 'B_entropy') {
      console.log('=== B_entropy debugging ===');
      console.log('Available B_entropy values:', availableParameters['B_entropy']);
      console.log('Current partial selection (excluding B_entropy):', partialSelection);

      // Check specifically for B_entropy = 0
      if ((availableParameters['B_entropy'] || []).includes(0)) {
        const testSelection = { ...partialSelection, B_entropy: 0 };
        console.log('Testing B_entropy=0 with selection:', testSelection);

        const matchingRows = data.filter(row => {
          const parametersMatch = Object.entries(testSelection).every(([key, selectedValue]) => {
            const rowValue = row[key];
            if (typeof selectedValue === 'number') {
              const numRowValue = parseFloat(rowValue);
              const tolerance = 0.02;
              const matches = Math.abs(numRowValue - selectedValue) <= tolerance;
              if (key === 'B_entropy' && selectedValue === 0) {
                console.log(`Row B_entropy: ${rowValue} (${numRowValue}), matches: ${matches}`);
              }
              return matches;
            }
            return rowValue === selectedValue;
          });

          if (parametersMatch) {
            const hasValidData = modelColumns.some(model => {
              return metricTypes.some(metricType => {
                const columnKey = `${model.key}_${metricType.key}`;
                const val = row[columnKey];
                if (typeof val === 'string' && val.startsWith('[')) {
                  try {
                    const arr = JSON.parse(val.replace(/'/g, '"'));
                    return arr.some(v => !isNaN(v) && isFinite(v));
                  } catch {
                    return false;
                  }
                }
                const numVal = parseFloat(val);
                return !isNaN(numVal) && isFinite(numVal);
              });
            });

            console.log(`Row with B_entropy=0 has valid data:`, hasValidData, 'Sample data:', {
              llm_qwen_1_5b_acc: row['llm_qwen_1_5b_acc'],
              llm_qwen_1_5b_prob: row['llm_qwen_1_5b_prob']
            });
            return hasValidData;
          }
          return false;
        });

        console.log(`B_entropy=0 matching rows count:`, matchingRows.length);
      }
    }

    return optionCounts;
  };

  // Check which metrics have valid data for current HMM parameter selection
  const getAvailableMetrics = () => {
    if (data.length === 0) return new Set();

    const availableMetrics = new Set();
    console.log('getAvailableMetrics called with selectedHMMParams:', selectedHMMParams);

    metricTypes.forEach(metricType => {
      // Check if any rows match current parameters AND have valid data for this metric
      const hasValidData = data.some(row => {
        // First check if parameters match current selection
        const parametersMatch = Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
          const rowValue = row[key];

          // Handle array values (like steady_state)
          if (typeof rowValue === 'string' && rowValue.startsWith('[')) {
            if (key === 'steady_state') {
              // For steady_state, compare labels instead of exact arrays
              const rowLabel = getSteadyStateLabel(rowValue);
              return rowLabel === selectedValue;
            }
            return rowValue === selectedValue;
          }

          // Handle numeric values with tolerance
          if (typeof selectedValue === 'number') {
            const numRowValue = parseFloat(rowValue);
            const tolerance = 0.02;
            return Math.abs(numRowValue - selectedValue) <= tolerance;
          }

          // Handle string values
          return rowValue === selectedValue;
        });

        if (!parametersMatch) return false;

        // Then check if this row has valid data for this specific metric across at least one model
        return modelColumns.some(model => {
          const columnKey = `${model.key}_${metricType.key}`;
          const val = row[columnKey];

          if (typeof val === 'string' && val.startsWith('[')) {
            try {
              const arr = JSON.parse(val.replace(/'/g, '"'));
              return arr.some(v => !isNaN(v) && isFinite(v));
            } catch {
              return false;
            }
          }

          const numVal = parseFloat(val);
          return !isNaN(numVal) && isFinite(numVal);
        });
      });

      if (hasValidData) {
        availableMetrics.add(metricType.key);
      }
    });

    return availableMetrics;
  };

  const renderHMMParameterControls = () => {
    return (
      <div className="hmm-parameters">
        <h3>HMM Configuration</h3>
        <div className="parameter-grid">
          {hmmParamKeys.map(paramKey => {
            const optionCounts = getAvailableOptionsForParameter(paramKey);

            return (
              <div key={paramKey} className="parameter-control">
                <label className="parameter-label">{paramKey.replace('_', ' ').toUpperCase()}</label>
                <div className="option-buttons">
                  {(availableParameters[paramKey] || []).map(value => {
                    const count = optionCounts[value] || 0;
                    const hasNoData = count === 0;
                    // Handle type comparison - button values can be strings, selected values can be numbers
                    const isSelected = selectedHMMParams[paramKey] == value;


                    return (
                      <button
                        key={value}
                        type="button"
                        className={`option-button ${isSelected ? 'selected' : ''} ${hasNoData ? 'no-data' : ''}`}
                        onClick={() => {
                          let parsedValue = value;
                          // Parse numeric values
                          if (!isNaN(value) && value !== '') {
                            parsedValue = parseFloat(value);
                          }

                          console.log(`Clicked ${paramKey}=${parsedValue}, updating params`);
                          setSelectedHMMParams({
                            ...selectedHMMParams,
                            [paramKey]: parsedValue
                          });
                        }}
                      >
                        {paramKey === 'steady_state' ? value : // steady_state values are already labels now
                          (typeof value === 'string' && value.startsWith('[') ?
                            `Array[${value.split(',').length}]` :
                            paramKey === 'A_entropy' ? value.toFixed(1) : value)
                        }
                      </button>
                    );
                  })}
                </div>
                <span className="param-count">
                  {(availableParameters[paramKey] || []).length} options
                </span>
              </div>
            );
          })}

          {/* Display lambda2 value for entropy analysis */}
          {selectedTopic === 'entropy' && data.length > 0 && (
            <div className="parameter-control">
              <label className="parameter-label">LAMBDA2</label>
              <div className="option-buttons">
                <div className="option-button selected">
                  {data.find(row =>
                    Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
                      const rowValue = row[key];
                      if (typeof selectedValue === 'number') {
                        const numRowValue = parseFloat(rowValue);
                        const tolerance = 0.02;
                        return Math.abs(numRowValue - selectedValue) <= tolerance;
                      }
                      return String(rowValue) === String(selectedValue);
                    })
                  )?.lambda2 || 'N/A'}
                </div>
              </div>
            </div>
          )}

          {/* Display A_entropy value for mixing rate analysis */}
          {selectedTopic === 'lambda2' && data.length > 0 && (
            <div className="parameter-control">
              <label className="parameter-label">A ENTROPY</label>
              <div className="option-buttons">
                <div className="option-button selected">
                  {(() => {
                    const matchedRow = data.find(row =>
                      Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
                        const rowValue = row[key];
                        if (typeof selectedValue === 'number') {
                          const numRowValue = parseFloat(rowValue);
                          const tolerance = 0.02;
                          return Math.abs(numRowValue - selectedValue) <= tolerance;
                        }
                        return String(rowValue) === String(selectedValue);
                      })
                    );
                    const aEntropy = matchedRow?.A_entropy;
                    return aEntropy !== undefined ? parseFloat(aEntropy).toFixed(1) : 'N/A';
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Display A_entropy and lambda2 values for steady state analysis */}
          {selectedTopic === 'steady_state' && data.length > 0 && (
            <>
              <div className="parameter-control">
                <label className="parameter-label">A ENTROPY</label>
                <div className="option-buttons">
                  <div className="option-button selected">
                    {(() => {
                      const matchedRow = data.find(row =>
                        Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
                          const rowValue = row[key];
                          if (key === 'steady_state') {
                            const rowLabel = getSteadyStateLabel(rowValue);
                            return rowLabel === selectedValue;
                          }
                          if (typeof selectedValue === 'number') {
                            const numRowValue = parseFloat(rowValue);
                            const tolerance = 0.02;
                            return Math.abs(numRowValue - selectedValue) <= tolerance;
                          }
                          return String(rowValue) === String(selectedValue);
                        })
                      );
                      const aEntropy = matchedRow?.A_entropy;
                      return aEntropy !== undefined ? parseFloat(aEntropy).toFixed(1) : 'N/A';
                    })()}
                  </div>
                </div>
              </div>

              <div className="parameter-control">
                <label className="parameter-label">LAMBDA2</label>
                <div className="option-buttons">
                  <div className="option-button selected">
                    {(() => {
                      const matchedRow = data.find(row =>
                        Object.entries(selectedHMMParams).every(([key, selectedValue]) => {
                          const rowValue = row[key];
                          if (key === 'steady_state') {
                            const rowLabel = getSteadyStateLabel(rowValue);
                            return rowLabel === selectedValue;
                          }
                          if (typeof selectedValue === 'number') {
                            const numRowValue = parseFloat(rowValue);
                            const tolerance = 0.02;
                            return Math.abs(numRowValue - selectedValue) <= tolerance;
                          }
                          return String(rowValue) === String(selectedValue);
                        })
                      );
                      return matchedRow?.lambda2 || 'N/A';
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Beautiful color theme with cold/warm tone separation
  const modelColors = {
    // Qwen Models - Blue/Purple palette
    'llm_qwen_7b': '#1e40af',      // Deep blue (largest)
    'llm_qwen_3b': '#3b82f6',      // Blue
    'llm_qwen_1_5b': '#6366f1',    // Indigo
    'llm_qwen_0_5b': '#8b5cf6',    // Purple (smallest)

    // Llama Models - Cyan/Sky blue palette
    'llm_llama_8b': '#0e7490',     // Dark cyan (largest)
    'llm_llama_3b': '#0891b2',     // Cyan
    'llm_llama_1b': '#06b6d4',     // Light cyan (smallest)

    // Baum-Welch - Distinctive slate blue (learning-based)
    'bw': '#475569',               // Slate blue-gray

    // Viterbi - Warm tone (inference-based, knows HMM parameters)
    'viterbi': '#eab308',          // Yellow

    // N-gram Models - Beautiful green palette
    '1-gram': '#047857',           // Emerald
    '2-gram': '#10b981',           // Beautiful green
    '3-gram': '#34d399',           // Light emerald
    '4-gram': '#6ee7b7',           // Mint green

    // Inference Models (know HMM parameters) - Warm tones (reds, oranges, pinks)
    'p_o_given_prev_h': '#ea580c',       // Orange
    'p_o_t_given_prev_1_o': '#d97706',   // Amber
    'p_o_t_given_prev_2_o': '#c2410c',   // Orange red
    'p_o_t_given_prev_3_o': '#be185d',   // Pink
    'p_o_t_given_prev_4_o': '#be123c',   // Rose
    'p_o_t_given_prev_all_o': '#a21caf'  // Purple
  };

  const renderModelSelector = () => {
    const modelGroups = {};
    modelColumns.forEach(model => {
      if (!modelGroups[model.group]) {
        modelGroups[model.group] = [];
      }
      modelGroups[model.group].push(model);
    });

    return (
      <div className="model-selector">
        <h4>Select Models to Display:</h4>
        <div className="model-groups">
          {Object.entries(modelGroups).map(([groupName, models]) => (
            <div key={groupName} className="model-group">
              <h5>{groupName}</h5>
              <div className="model-checkboxes">
                {models.map(model => {
                  let tooltip = '';
                  if (model.key === 'viterbi') {
                    tooltip = 'Theoretical optimum inference given ground truth HMM parameters';
                  } else if (model.key === 'bw') {
                    tooltip = 'EM algorithm for parameter estimation';
                  }

                  return (
                    <div key={model.key} className="model-checkbox-container">
                      <label className="model-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedModels.has(model.key)}
                          onChange={(e) => {
                            const newSelectedModels = new Set(selectedModels);
                            if (e.target.checked) {
                              newSelectedModels.add(model.key);
                            } else {
                              newSelectedModels.delete(model.key);
                            }
                            setSelectedModels(newSelectedModels);
                          }}
                        />
                        <span style={{ color: modelColors[model.key] }}>
                          {model.label}
                        </span>
                      </label>
                      {tooltip && (
                        <div className="model-tooltip">
                          {tooltip}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="model-count-display-bottom">
          {selectedModels.size} of {modelColumns.length} models selected
        </div>
        <div className="color-legend-bottom">
          <span className="legend-item-small">
            <span className="legend-color cool"></span>
            Cool tones: Learning-based models (learn from data)
          </span>
          <span className="legend-item-small">
            <span className="legend-color warm"></span>
            Warm tones: Inference-based models (know HMM parameters)
          </span>
        </div>
      </div>
    );
  };

  const renderVisualization = () => {
    if (loading) return <div className="loading">Loading {selectedTopic} data...</div>;

    return (
      <div className="visualization-container">
        <div className="metric-selector">
          <h4>Select Metric:</h4>
          <div className="metric-options">
            {metricTypes.map(metric => {
              const availableMetrics = getAvailableMetrics();
              const hasData = availableMetrics.has(metric.key);
              const isSelected = selectedMetric === metric.key;

              return (
                <label
                  key={metric.key}
                  className={`metric-checkbox ${!hasData ? 'no-data' : ''}`}
                >
                  <input
                    type="radio"
                    name="metric"
                    value={metric.key}
                    checked={isSelected}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                  />
                  <span>{metric.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {renderModelSelector()}

        {visualizationData.length === 0 ? (
          <div className="no-data">No data for current selection</div>
        ) : (
          <ResponsiveContainer width="100%" height={600}>
          <LineChart data={visualizationData} margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="sequenceLength"
              label={{ value: 'Sequence Length', position: 'insideBottomLeft', offset: -10 }}
              scale="log"
              domain={['dataMin', 'dataMax']}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              label={{ value: metricTypes.find(m => m.key === selectedMetric)?.label, angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => [
                value?.toFixed(4) || 'N/A',
                modelColumns.find(m => m.key === name)?.label || name
              ]}
              labelFormatter={(label) => `Sequence Length: ${label}`}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => modelColumns.find(m => m.key === value)?.label || value}
            />
            {Array.from(selectedModels).map(modelKey => (
              <Line
                key={modelKey}
                name={modelColumns.find(m => m.key === modelKey)?.label || modelKey}
                type="monotone"
                dataKey={modelKey}
                stroke={modelColors[modelKey] || '#8884d8'}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  return (
    <div className="hmm-dashboard">
      <header className="dashboard-header">
        <h1>Evaluation on Hidden Markov Data</h1>
        <p>Interactive synthetic experimental result in <a href="https://daiyijia02.github.io/icl-hmm-website/" target="_blank" rel="noopener noreferrer">this paper</a></p>
      </header>

      <div className="topic-selector">
        <h2>HMM Properties</h2>
        <div className="topic-buttons">
          {topics.map(topic => (
            <button
              key={topic.key}
              className={`topic-button ${selectedTopic === topic.key ? 'active' : ''}`}
              onClick={() => setSelectedTopic(topic.key)}
            >
              <div className="topic-title">{topic.label}</div>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading {selectedTopic} data...</div>
      ) : (
        <div className="main-layout">
        <aside className="controls-panel">
          {renderHMMParameterControls()}
        </aside>

        <main className="visualization-panel">
          <div className="metric-selector-top">
            <label className="parameter-label">METRIC</label>
            <div className="metric-options-horizontal">
              {metricTypes.map(metric => {
                const availableMetrics = getAvailableMetrics();
                const hasData = availableMetrics.has(metric.key);
                const isSelected = selectedMetric === metric.key;

                return (
                  <label
                    key={metric.key}
                    className={`metric-checkbox-top ${!hasData ? 'no-data' : ''}`}
                  >
                    <input
                      type="radio"
                      name="metric"
                      value={metric.key}
                      checked={isSelected}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                    />
                    <span>{metric.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="chart-with-models">
            <div className="chart-area">
              {visualizationData.length === 0 ? (
                <div className="no-data">No data for current selection</div>
              ) : (
                <ResponsiveContainer width="100%" height={600}>
                <LineChart data={visualizationData} margin={{ top: 20, right: 30, left: 60, bottom: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sequenceLength"
                    type="number"
                    label={{ value: 'Sequence Length', position: 'insideBottomLeft', offset: -10 }}
                    scale="log"
                    domain={[4, 2048]}
                    ticks={[4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => value.toString()}
                  />
                  <YAxis
                    label={{ value: metricTypes.find(m => m.key === selectedMetric)?.label, angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      value?.toFixed(4) || 'N/A',
                      modelColumns.find(col => col.key === name)?.label || name
                    ]}
                    labelFormatter={(label) => `Sequence Length: ${label}`}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>
                        {modelColumns.find(col => col.key === value)?.label || value}
                      </span>
                    )}
                  />
                  {Array.from(selectedModels).map((modelKey) => {
                    const model = modelColumns.find(col => col.key === modelKey);
                    if (!model) return null;

                    // Use the same color as defined in modelColors for consistency
                    const strokeColor = modelColors[modelKey] || '#8884d8';

                    return (
                      <Line
                        key={modelKey}
                        type="monotone"
                        dataKey={modelKey}
                        stroke={strokeColor}
                        strokeWidth={2}
                        dot={{ fill: strokeColor, strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5, fill: strokeColor }}
                        connectNulls={false}
                      />
                    );
                  })}
                </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="model-list-compact">
              <div className="model-selector-compact">
                <div className="model-header">
                  <h4>Select Models</h4>
                  <button
                    className="model-toggle-btn"
                    onClick={() => setSelectedModels(selectedModels.size === modelColumns.length ? new Set() : new Set(modelColumns.map(m => m.key)))}
                  >
                    {selectedModels.size === modelColumns.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>
                {renderModelSelector()}
              </div>
            </div>
          </div>
        </main>
        </div>
      )}
    </div>
  );
};

export default HMMDashboard;