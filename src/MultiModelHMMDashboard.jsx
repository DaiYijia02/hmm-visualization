import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Label
} from 'recharts';
import { useMultipleCSVData } from './hooks/useCSVData';
import {
  parseStringArray,
  calculateMatrixEntropy,
  getPiType,
  getEntropyCategory,
  getUniqueValues,
  isValidNumber,
  safeArrayAccess
} from './utils/dataUtils';
import { models } from './config/models';
import {
  METRIC_TYPES as metricTypes,
  METRIC_MEASURES as metricMeasures,
  ALT_SEQUENCE_LENGTHS as seqLengths,
  MODEL_COLORS,
  CHART_COLORS as METRIC_COLORS,
  getModelColor
} from './config/constants';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import './Dashboard.css';

// Use imported configurations

// Utility functions are now imported from utils/dataUtils.js

const MultiModelHMMDashboard = () => {
  // Use custom hook for data loading
  const fileConfigs = models.map(model => ({ filename: model.file, key: model.id }));
  const { data: rawCSVData, loading, error } = useMultipleCSVData(fileConfigs);

  // State for processed data
  const [rawData, setRawData] = useState({});
  const [processedData, setProcessedData] = useState([]);
  
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
  
  // Process raw data when it loads
  useEffect(() => {
    if (Object.keys(rawCSVData).length === 0) return;

    try {
      // Process data for each model
      const processedRawData = {};

      Object.entries(rawCSVData).forEach(([modelId, data]) => {
        processedRawData[modelId] = data.map(row => {
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
      });

      // Extract unique filter options from the first model
      const firstModelData = processedRawData[models[0].id];

      if (firstModelData && firstModelData.length > 0) {
        const states = getUniqueValues(firstModelData, d => d.num_states);
        const observations = getUniqueValues(firstModelData, d => d.num_observations);
        const aEntropies = getUniqueValues(firstModelData, d => d.aEntropyCategory);
        const bEntropies = getUniqueValues(firstModelData, d => d.bEntropyCategory);
        const piTypes = getUniqueValues(firstModelData, d => d.piType);

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

      // Update raw data with processed version
      setRawData(processedRawData);
    } catch (err) {
      console.error('Error processing data:', err);
    }
  }, [rawCSVData]);
  
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
              if (row[fieldName] !== undefined && isValidNumber(row[fieldName])) {
                sum += row[fieldName];
                count++;
              }
            } else {
              // Other metrics are arrays
              const values = parseStringArray(row[fieldName]);
              if (Array.isArray(values)) {
                const val = safeArrayAccess(values, idx);
                if (val !== null && isValidNumber(val)) {
                  sum += val;
                  count++;
                }
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
              if (row[fieldName] !== undefined && isValidNumber(row[fieldName])) {
                sum += row[fieldName];
                count++;
              }
            } else {
              // Other metrics are arrays
              const values = parseStringArray(row[fieldName]);
              if (Array.isArray(values)) {
                const val = safeArrayAccess(values, idx);
                if (val !== null && isValidNumber(val)) {
                  sum += val;
                  count++;
                }
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
    return (
      <LoadingSpinner
        message="Loading data from multiple models..."
        size="large"
      />
    );
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        title="Failed to Load Model Data"
        variant="critical"
        showRetry={true}
        onRetry={() => window.location.reload()}
      />
    );
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
          <ErrorMessage
            error="No data available with the current filter configuration. Please try adjusting your filter settings."
            title="No Data Found"
            variant="warning"
            showRetry={false}
          />
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