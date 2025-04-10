import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Label
} from 'recharts';
import './Dashboard.css';

// Available models
const models = [
  { id: 'Qwen2.57B', file: 'Qwen2.5-7B.csv', label: 'Qwen 2 (7B)' },
  { id: 'Qwen2.53B', file: 'Qwen2.5-3B.csv', label: 'Qwen 2 (3B)' },
  { id: 'Qwen2.51.5B', file: 'Qwen2.5-1.5B.csv', label: 'Qwen 2 (1.5B)' },
  { id: 'Qwen2.50.5B', file: 'Qwen2.5-0.5B.csv', label: 'Qwen 2 (0.5B)' }
];

// Mapping for sequence lengths
const seqLengths = [8, 16, 32, 64, 128, 256, 512, 1024];

// Metric types
const metricTypes = [
  { id: 'llm_emission', label: 'LLM Model' },
  { id: 'random_emission', label: 'Random' },
  { id: 'previous_emission', label: 'Bigram' },
  { id: 'p_o_given_prev_h', label: 'P(O|Prev H)' },
  { id: 'p_o_t_given_prev_1_o', label: 'P(O|Prev 1 O)' },
  { id: 'p_o_t_given_prev_2_o', label: 'P(O|Prev 2 O)' },
  { id: 'p_o_t_given_prev_3_o', label: 'P(O|Prev 3 O)' },
  { id: 'p_o_t_given_prev_4_o', label: 'P(O|Prev 4 O)' },
  { id: 'p_o_t_given_prev_5_o', label: 'P(O|Prev 5 O)' },
  { id: 'p_o_t_given_prev_6_o', label: 'P(O|Prev 6 O)' },
  { id: 'p_o_t_given_prev_7_o', label: 'P(O|Prev 7 O)' },
  { id: 'p_o_t_given_prev_8_o', label: 'P(O|Prev 8 O)' },
  { id: 'p_o_t_given_prev_all_o', label: 'P(O|All Prev O)' }
];

// Metric measures
const metricMeasures = [
  { id: 'acc', label: 'Accuracy' },
  { id: 'reverse_kl', label: 'Reverse KL Divergence' },
  { id: 'forward_kl', label: 'Forward KL Divergence' },
  { id: 'hellinger_distance', label: 'Hellinger Distance' }
];

// Colors for the chart lines by model
const MODEL_COLORS = {
  'Qwen2.57B': '#1f77b4',  // blue
  'Qwen2.53B': '#ff7f0e',  // orange
  'Qwen2.51.5B': '#2ca02c', // green
  'Qwen2.50.5B': '#d62728'  // red
};

// Colors for the chart lines by metric
const METRIC_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", 
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a"
];

// Function to parse string representation of arrays
function parseStringArray(str) {
  try {
    if (!str) return [];
    
    // Replace single quotes with double quotes for proper JSON parsing
    const jsonStr = str.replace(/'/g, '"');
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error parsing array:', str);
    return [];
  }
}

// Function to calculate entropy of a matrix
function calculateMatrixEntropy(matrix) {
  if (!matrix || !matrix.length) return 0;
  
  // Calculate entropy for each row and average
  const rowEntropies = matrix.map(row => {
    if (!row || !row.length) return 0;
    
    let entropy = 0;
    const sum = row.reduce((a, b) => a + b, 0);
    
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

// Function to determine if pi is deterministic (one-hot) or uniform
function getPiType(pi) {
  // Check if one value is 1 and the rest are 0
  const isOnehot = pi.filter(val => Math.abs(val - 1) < 1e-5).length === 1 && 
                  pi.filter(val => Math.abs(val) < 1e-5).length === pi.length - 1;
  return isOnehot ? "deterministic" : "uniform";
}

// Function to categorize entropy values
function getEntropyCategory(entropy) {
  if (entropy < 0.01) return "0.0";
  if (entropy < 0.75) return "0.5";
  if (entropy < 1.25) return "1.0";
  if (entropy < 1.75) return "1.5"; 
  if (entropy < 2.25) return "2.0";
  if (entropy < 2.75) return "2.5";
  return "3.0";
}

// Helper function to fetch CSV data from local files
async function fetchCSVFile(filename) {
  try {
    const response = await fetch(`/data/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error);
    throw error;
  }
}

const MultiModelHMMDashboard = () => {
  // State for the data
  const [rawData, setRawData] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states - single selection
  const [selectedState, setSelectedState] = useState(null);
  const [selectedObservation, setSelectedObservation] = useState(null);
  const [selectedAEntropy, setSelectedAEntropy] = useState(null);
  const [selectedBEntropy, setSelectedBEntropy] = useState(null);
  const [selectedPiType, setSelectedPiType] = useState(null);
  
  // Visualization states
  const [selectedModels, setSelectedModels] = useState(['Qwen2.57B']);
  const [selectedMetricTypes, setSelectedMetricTypes] = useState(['llm_emission']);
  const [selectedMeasure, setSelectedMeasure] = useState('acc');
  const [comparisonMode, setComparisonMode] = useState('models'); // 'models' or 'metrics'
  
  // Filter options
  const [stateOptions, setStateOptions] = useState([]);
  const [observationOptions, setObservationOptions] = useState([]);
  const [aEntropyOptions, setAEntropyOptions] = useState([]);
  const [bEntropyOptions, setBEntropyOptions] = useState([]);
  const [piTypeOptions, setPiTypeOptions] = useState([]);
  
  // Load all model data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const allData = {};
        
        // Load each model file
        for (const model of models) {
          try {
            // Using fetch instead of window.fs.readFile
            const response = await fetchCSVFile(model.file);
            
            Papa.parse(response, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                // Process the data
                const data = results.data.map(row => {
                  // Parse matrices and vectors
                  const A = parseStringArray(row.A);
                  const B = parseStringArray(row.B);
                  const pi = parseStringArray(row.pi);
                  
                  // Calculate entropy and categorize
                  const aEntropy = calculateMatrixEntropy(A);
                  const bEntropy = calculateMatrixEntropy(B);
                  const piType = getPiType(pi);
                  
                  return {
                    ...row,
                    aEntropy,
                    bEntropy,
                    aEntropyCategory: getEntropyCategory(aEntropy),
                    bEntropyCategory: getEntropyCategory(bEntropy),
                    piType
                  };
                });
                
                allData[model.id] = data;
                
                // If all models are loaded, update the state
                if (Object.keys(allData).length === models.length) {
                  setRawData(allData);
                  
                  // Extract unique filter options from the first model (they should be the same across models)
                  const firstModelData = allData[models[0].id];
                  
                  if (firstModelData && firstModelData.length > 0) {
                    const states = [...new Set(firstModelData.map(d => d.num_states))].sort((a, b) => a - b);
                    const observations = [...new Set(firstModelData.map(d => d.num_observations))].sort((a, b) => a - b);
                    const aEntropies = [...new Set(firstModelData.map(d => d.aEntropyCategory))].sort();
                    const bEntropies = [...new Set(firstModelData.map(d => d.bEntropyCategory))].sort();
                    const piTypes = [...new Set(firstModelData.map(d => d.piType))];
                    
                    setStateOptions(states);
                    setObservationOptions(observations);
                    setAEntropyOptions(aEntropies);
                    setBEntropyOptions(bEntropies);
                    setPiTypeOptions(piTypes);
                    
                    // Initialize selections with first values
                    setSelectedState(states[0]);
                    setSelectedObservation(observations[0]);
                    setSelectedAEntropy(aEntropies[0]);
                    setSelectedBEntropy(bEntropies[0]);
                    setSelectedPiType(piTypes[0]);
                  }
                  
                  setLoading(false);
                }
              },
              error: (error) => {
                console.error(`Error parsing CSV for ${model.id}: ${error.message}`);
                setError(`Error parsing CSV for ${model.id}: ${error.message}`);
              }
            });
          } catch (err) {
            console.error(`Error loading ${model.file}: ${err.message}`);
            setError(`Error loading ${model.file}: ${err.message}`);
          }
        }
      } catch (err) {
        setError(`Error loading data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Process filtered data for visualization when filters or selections change
  useEffect(() => {
    if (Object.keys(rawData).length === 0 || 
        !selectedState || 
        !selectedObservation || 
        !selectedAEntropy || 
        !selectedBEntropy || 
        !selectedPiType ||
        selectedModels.length === 0 ||
        selectedMetricTypes.length === 0) return;
    
    let processed = [];
    
    if (comparisonMode === 'models') {
      // Compare different models for a single metric type
      // For each sequence length
      seqLengths.forEach((seqLength, idx) => {
        const dataPoint = { seqLength };
        
        // Process each selected model
        selectedModels.forEach(modelId => {
          const filtered = rawData[modelId]?.filter(row => 
            row.num_states === selectedState &&
            row.num_observations === selectedObservation &&
            row.aEntropyCategory === selectedAEntropy &&
            row.bEntropyCategory === selectedBEntropy &&
            row.piType === selectedPiType
          ) || [];
          
          // We only use the first selected metric type for model comparison
          const metric = selectedMetricTypes[0];
          const fieldName = `${metric}_${selectedMeasure}`;
          
          // Average the values across all filtered rows
          let sum = 0;
          let count = 0;
          
          filtered.forEach(row => {
            if (metric === 'random_emission') {
              // Random metrics are single values, not arrays
              if (row[fieldName] !== undefined && !isNaN(row[fieldName])) {
                sum += row[fieldName];
                count++;
              }
            } else {
              // Other metrics are arrays
              try {
                const values = parseStringArray(row[fieldName]);
                if (values && values.length > idx) {
                  // Skip NaN, inf, etc.
                  const val = values[idx];
                  if (!isNaN(val) && isFinite(val)) {
                    sum += val;
                    count++;
                  }
                }
              } catch (e) {
                // Silently ignore parsing errors
              }
            }
          });
          
          // Calculate average or use null if no valid data
          dataPoint[modelId] = count > 0 ? sum / count : null;
        });
        
        processed.push(dataPoint);
      });
    } else {
      // Compare different metrics for a single model
      // For each sequence length
      seqLengths.forEach((seqLength, idx) => {
        const dataPoint = { seqLength };
        
        // Use only the first selected model
        const modelId = selectedModels[0];
        const filtered = rawData[modelId]?.filter(row => 
          row.num_states === selectedState &&
          row.num_observations === selectedObservation &&
          row.aEntropyCategory === selectedAEntropy &&
          row.bEntropyCategory === selectedBEntropy &&
          row.piType === selectedPiType
        ) || [];
        
        // Process each selected metric type
        selectedMetricTypes.forEach(metric => {
          const fieldName = `${metric}_${selectedMeasure}`;
          
          // Average the values across all filtered rows
          let sum = 0;
          let count = 0;
          
          filtered.forEach(row => {
            if (metric === 'random_emission') {
              // Random metrics are single values, not arrays
              if (row[fieldName] !== undefined && !isNaN(row[fieldName])) {
                sum += row[fieldName];
                count++;
              }
            } else {
              // Other metrics are arrays
              try {
                const values = parseStringArray(row[fieldName]);
                if (values && values.length > idx) {
                  // Skip NaN, inf, etc.
                  const val = values[idx];
                  if (!isNaN(val) && isFinite(val)) {
                    sum += val;
                    count++;
                  }
                }
              } catch (e) {
                // Silently ignore parsing errors
              }
            }
          });
          
          // Calculate average or use null if no valid data
          dataPoint[metric] = count > 0 ? sum / count : null;
        });
        
        processed.push(dataPoint);
      });
    }
    
    setProcessedData(processed);
  }, [
    rawData, 
    selectedState, 
    selectedObservation, 
    selectedAEntropy, 
    selectedBEntropy, 
    selectedPiType, 
    selectedModels, 
    selectedMetricTypes, 
    selectedMeasure,
    comparisonMode
  ]);
  
  // Handlers for selections
  const handleStateSelection = (state) => {
    setSelectedState(state);
  };
  
  const handleObservationSelection = (obs) => {
    setSelectedObservation(obs);
  };
  
  const handleAEntropySelection = (entropy) => {
    setSelectedAEntropy(entropy);
  };
  
  const handleBEntropySelection = (entropy) => {
    setSelectedBEntropy(entropy);
  };
  
  const handlePiTypeSelection = (type) => {
    setSelectedPiType(type);
  };
  
  const handleModelSelection = (modelId) => {
    setSelectedModels(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(m => m !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };
  
  const handleMetricTypeSelection = (metric) => {
    setSelectedMetricTypes(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };
  
  const handleMeasureSelection = (event) => {
    setSelectedMeasure(event.target.value);
  };
  
  const toggleComparisonMode = () => {
    const newMode = comparisonMode === 'models' ? 'metrics' : 'models';
    setComparisonMode(newMode);
    
    // Reset selections based on the new mode
    if (newMode === 'models') {
      // For model comparison, we only use one metric
      setSelectedMetricTypes([selectedMetricTypes[0] || 'llm_emission']);
    } else {
      // For metric comparison, we only use one model
      setSelectedModels([selectedModels[0] || 'Qwen2.57B']);
    }
  };
  
  if (loading) {
    return <div className="loading-message">Loading data from multiple models...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Multi-Model HMM Experiment Analysis</h1>
      
      <div className="comparison-section">
        <div className="flex-container">
          <h2 className="section-title">Comparison Mode</h2>
          <button 
            onClick={toggleComparisonMode}
            className="mode-button"
          >
            {comparisonMode === 'models' 
              ? 'Switch to Metric Comparison' 
              : 'Switch to Model Comparison'}
          </button>
        </div>
        
        <div className="grid-container">
          {/* Model Selection */}
          <div className="selection-card">
            <h3 className="selection-title">Select Models</h3>
            <div className="checkbox-grid">
              {models.map(model => (
                <label key={model.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={() => handleModelSelection(model.id)}
                    disabled={comparisonMode === 'metrics' && selectedModels.length === 1 && selectedModels[0] === model.id}
                  />
                  <span>{model.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Metric Selection */}
          <div className="selection-card">
            <h3 className="selection-title">Metric Selection</h3>
            <div className="scrollable-container">
              <div className="checkbox-grid">
                {metricTypes.map(metric => (
                  <label key={metric.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedMetricTypes.includes(metric.id)}
                      onChange={() => handleMetricTypeSelection(metric.id)}
                      disabled={comparisonMode === 'models' && selectedMetricTypes.length === 1 && selectedMetricTypes[0] === metric.id}
                    />
                    <span>{metric.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="filters-section">
        {/* Filter Controls */}
        <div className="filter-grid">
          <div>
            <h3 className="selection-title">Number of States</h3>
            <div className="filter-options">
              {stateOptions.map(state => (
                <label key={state} className="option-label">
                  <input
                    type="radio"
                    checked={selectedState === state}
                    onChange={() => handleStateSelection(state)}
                    name="stateGroup"
                  />
                  <span>{state}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="selection-title">Number of Observations</h3>
            <div className="filter-options">
              {observationOptions.map(obs => (
                <label key={obs} className="option-label">
                  <input
                    type="radio"
                    checked={selectedObservation === obs}
                    onChange={() => handleObservationSelection(obs)}
                    name="observationGroup"
                  />
                  <span>{obs}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="selection-title">A Matrix Entropy</h3>
            <div className="filter-options">
              {aEntropyOptions.map(entropy => (
                <label key={entropy} className="option-label">
                  <input
                    type="radio"
                    checked={selectedAEntropy === entropy}
                    onChange={() => handleAEntropySelection(entropy)}
                    name="aEntropyGroup"
                  />
                  <span>{entropy}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="selection-title">B Matrix Entropy</h3>
            <div className="filter-options">
              {bEntropyOptions.map(entropy => (
                <label key={entropy} className="option-label">
                  <input
                    type="radio"
                    checked={selectedBEntropy === entropy}
                    onChange={() => handleBEntropySelection(entropy)}
                    name="bEntropyGroup"
                  />
                  <span>{entropy}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="selection-title">Pi Type</h3>
            <div className="filter-options">
              {piTypeOptions.map(type => (
                <label key={type} className="option-label">
                  <input
                    type="radio"
                    checked={selectedPiType === type}
                    onChange={() => handlePiTypeSelection(type)}
                    name="piTypeGroup"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Measure Selection */}
        <div className="filter-grid" style={{marginTop: '1rem'}}>
          <h3 className="selection-title">Measure</h3>
          <select 
            className="measure-select"
            value={selectedMeasure}
            onChange={handleMeasureSelection}
          >
            {metricMeasures.map(measure => (
              <option key={measure.id} value={measure.id}>
                {measure.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Visualization */}
      <div className="visualization-container">
        <h2 className="visualization-title">
          {comparisonMode === 'models' 
            ? `${metricTypes.find(m => m.id === selectedMetricTypes[0])?.label} Performance Comparison` 
            : `${models.find(m => m.id === selectedModels[0])?.label} Metrics Comparison`}
        </h2>
        
        {processedData.length > 0 ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={processedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="seqLength" 
                  scale="log" 
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => value.toString()}
                >
                  <Label value="Sequence Length" position="insideBottomRight" offset={-10} />
                </XAxis>
                <YAxis>
                  <Label 
                    value={metricMeasures.find(m => m.id === selectedMeasure)?.label} 
                    position="left" 
                    angle={-90} 
                    style={{ textAnchor: 'middle' }} 
                  />
                </YAxis>
                <Tooltip formatter={(value) => value !== null ? value.toFixed(4) : 'N/A'} />
                <Legend />
                
                {comparisonMode === 'models' ? (
                  // Model comparison - one line per model
                  selectedModels.map((modelId, index) => {
                    const modelLabel = models.find(m => m.id === modelId)?.label;
                    return (
                      <Line
                        key={modelId}
                        type="monotone"
                        dataKey={modelId}
                        name={modelLabel}
                        stroke={MODEL_COLORS[modelId] || METRIC_COLORS[index % METRIC_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                    );
                  })
                ) : (
                  // Metric comparison - one line per metric
                  selectedMetricTypes.map((metricType, index) => {
                    const metricLabel = metricTypes.find(m => m.id === metricType)?.label;
                    return (
                      <Line
                        key={metricType}
                        type="monotone"
                        dataKey={metricType}
                        name={metricLabel}
                        stroke={METRIC_COLORS[index % METRIC_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                    );
                  })
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="no-data-message">
            No data available with the current filters
          </div>
        )}
      </div>
      
      <div className="footer-notes">
        <p>
          <strong>Note:</strong> This visualization compares {
            comparisonMode === 'models' 
              ? 'model performance across sequence lengths' 
              : 'different metrics for a single model'
          }.
        </p>
        <p style={{marginTop: '0.5rem'}}>
          <strong>Current Configuration:</strong> {
            comparisonMode === 'models' 
              ? `Comparing ${selectedModels.length} models using ${metricTypes.find(m => m.id === selectedMetricTypes[0])?.label}` 
              : `Comparing ${selectedMetricTypes.length} metrics for ${models.find(m => m.id === selectedModels[0])?.label}`
          },
          States: {selectedState}, 
          Observations: {selectedObservation}, 
          A Entropy: {selectedAEntropy}, 
          B Entropy: {selectedBEntropy}, 
          Pi Type: {selectedPiType}
        </p>
      </div>
    </div>
  );
};

export default MultiModelHMMDashboard;