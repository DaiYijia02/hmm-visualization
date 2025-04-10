import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import Papa from 'papaparse';
import './320HMMDashboard.css';

const HMMVisualizer = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    num_states: 'all',
    num_observations: 'all',
    matrix_a: 'all',
    matrix_b: 'all',
    pi: 'all'
  });
  
  // Metric selection state
  const [selectedMetricType, setSelectedMetricType] = useState('acc');
  const [selectedModels, setSelectedModels] = useState([]);
  
  // Available options (populated after data load)
  const [categories, setCategories] = useState({
    num_states: [],
    num_observations: [],
    matrix_a: [],
    matrix_b: [],
    pi: []
  });
  
  const [availableMetrics, setAvailableMetrics] = useState({
    acc: [],
    reverse_kl: [],
    forward_kl: [],
    hellinger_distance: []
  });

  // Sequence lengths
  const seqLengths = [8, 16, 32, 64, 128, 256, 512, 1024];
  
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', 
    '#FF8042', '#a4de6c', '#d0ed57', '#83a6ed', '#8dd1e1', '#9c9ede', '#6088b4',
    '#6b486b', '#a05d56', '#d0743c', '#ff8c00'
  ];

  // Function to parse lists with special handling for inf/nan values
  const parseList = (listStr) => {
    try {
      if (typeof listStr === 'string') {
        // Replace special values with JSON-compatible values before parsing
        const preprocessed = listStr
          .replace(/'/g, '"')
          .replace(/inf/g, 'null')
          .replace(/nan/g, 'null');
        return JSON.parse(preprocessed);
      } else {
        return listStr; // Already parsed or a scalar value
      }
    } catch (e) {
      console.error("Error parsing:", listStr);
      return [];
    }
  };

  // Function to parse matrix string into a 2D array
  const parseMatrix = (matrixStr) => {
    try {
      // Convert the string representation to a valid JSON array
      const jsonStr = matrixStr.replace(/'/g, '"');
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Error parsing matrix:", matrixStr);
      return [];
    }
  };

  // Function to calculate entropy of a probability distribution
  const calculateEntropy = (probs) => {
    return -probs.reduce((entropy, p) => {
      // Handle zero probabilities (log(0) is undefined)
      return entropy + (p > 0 ? p * Math.log2(p) : 0);
    }, 0);
  };

  // Function to calculate the average entropy of a matrix
  const calculateMatrixEntropy = (matrix) => {
    if (!matrix || matrix.length === 0) return 0;
    
    // Calculate entropy for each row of the matrix
    const rowEntropies = matrix.map(rowProbs => {
      return calculateEntropy(rowProbs);
    });
    
    // Return the average entropy across all rows
    return rowEntropies.reduce((sum, entropy) => sum + entropy, 0) / rowEntropies.length;
  };

  // Function to assign an entropy category based on calculated value
  const getEntropyCategory = (entropy) => {
    if (entropy < 0.25) return "0";
    else if (entropy < 0.75) return "0.5";
    else if (entropy < 1.25) return "1.0";
    else if (entropy < 1.75) return "1.5";
    else if (entropy < 2.25) return "2.0";
    else if (entropy < 2.75) return "2.5"; 
    else if (entropy < 3.25) return "3.0";
    else if (entropy < 3.75) return "3.5";
    else return "4.0+";
  };

  // Process data to add categories
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load the CSV file from the data directory
        const response = await fetch('./data/320-Qwen2.5-1.5B.csv');
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        const fileContent = await response.text();
        
        // Parse CSV
        Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            // Process data to add categories
            const processedData = results.data.map(row => {
              const aMatrix = parseMatrix(row.A);
              const bMatrix = parseMatrix(row.B);
              
              let aEntropy = 0;
              let bEntropy = 0;
              
              if (aMatrix.length > 0) {
                aEntropy = calculateMatrixEntropy(aMatrix);
              }
              
              if (bMatrix.length > 0) {
                bEntropy = calculateMatrixEntropy(bMatrix);
              }
              
              return {
                ...row,
                matrix_a_entropy: aEntropy,
                matrix_b_entropy: bEntropy,
                matrix_a_cat: getEntropyCategory(aEntropy),
                matrix_b_cat: getEntropyCategory(bEntropy),
                pi_cat: row.pi?.includes("1.0") ? "Deterministic" : "Uniform"
              };
            });
            
            setData(processedData);
            
            // Extract unique categories
            const cats = {
              num_states: [...new Set(processedData.map(row => row.num_states))].sort((a, b) => a - b),
              num_observations: [...new Set(processedData.map(row => row.num_observations))].sort((a, b) => a - b),
              matrix_a: [...new Set(processedData.map(row => row.matrix_a_cat))].sort(),
              matrix_b: [...new Set(processedData.map(row => row.matrix_b_cat))].sort(),
              pi: [...new Set(processedData.map(row => row.pi_cat))]
            };
            setCategories(cats);
            
            // Extract available metrics
            const metrics = {
              acc: [],
              reverse_kl: [],
              forward_kl: [],
              hellinger_distance: []
            };
            
            // Find all columns with metric suffixes
            const allColumns = results.meta.fields;
            allColumns.forEach(col => {
              // Figure out which type of metric this is
              if (col.endsWith('_acc')) {
                // Extract the model name
                const modelName = col.substring(0, col.length - 4);
                metrics.acc.push(modelName);
              } else if (col.endsWith('_reverse_kl')) {
                const modelName = col.substring(0, col.length - 11);
                metrics.reverse_kl.push(modelName);
              } else if (col.endsWith('_forward_kl')) {
                const modelName = col.substring(0, col.length - 11);
                metrics.forward_kl.push(modelName);
              } else if (col.endsWith('_hellinger_distance')) {
                const modelName = col.substring(0, col.length - 19);
                metrics.hellinger_distance.push(modelName);
              }
            });
            
            // Sort and deduplicate the metric lists
            for (const metricType in metrics) {
              metrics[metricType] = [...new Set(metrics[metricType])].sort();
            }
            
            setAvailableMetrics(metrics);
            
            // Set initial selected models
            const initialModels = metrics.acc.slice(0, 5); // Select first 5 by default
            setSelectedModels(initialModels);
            
            setLoading(false);
          },
          error: (error) => {
            console.error("CSV parsing error:", error);
            setError(`Error parsing CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        console.error("Data loading error:", error);
        setError(`Error loading data: ${error.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter data based on selected criteria
  const filterData = (filters) => {
    return data.filter(row => 
      (filters.num_states === 'all' || row.num_states === parseInt(filters.num_states)) &&
      (filters.num_observations === 'all' || row.num_observations === parseInt(filters.num_observations)) &&
      (filters.matrix_a === 'all' || row.matrix_a_cat === filters.matrix_a) &&
      (filters.matrix_b === 'all' || row.matrix_b_cat === filters.matrix_b) &&
      (filters.pi === 'all' || row.pi_cat === filters.pi)
    );
  };

  // Extract data for the selected metrics
  const getChartData = () => {
    const filteredData = filterData(filters);
    
    if (filteredData.length === 0) {
      return [];
    }
    
    // Prepare result dataset
    const result = seqLengths.map(length => ({
      length,
      ...selectedModels.reduce((acc, model) => {
        acc[model] = null;
        return acc;
      }, {})
    }));
    
    // Calculate averages for each model at each sequence length
    selectedModels.forEach(model => {
      const metricKey = `${model}_${selectedMetricType}`;
      
      seqLengths.forEach((length, lengthIndex) => {
        let sum = 0;
        let count = 0;
        
        filteredData.forEach(row => {
          if (row[metricKey]) {
            const values = parseList(row[metricKey]);
            
            // Check if this is a valid list with the right number of elements
            if (Array.isArray(values) && values.length > lengthIndex) {
              const value = values[lengthIndex];
              
              // Handle special cases for random_emission_acc and similar fields
              if (typeof row[metricKey] === 'number') {
                sum += row[metricKey];
                count++;
              }
              // Otherwise process normal array values
              else if (value !== null && typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                sum += value;
                count++;
              }
            }
          }
        });
        
        if (count > 0) {
          result[lengthIndex][model] = sum / count;
        }
      });
    });
    
    return result;
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  // Handle metric type selection
  const handleMetricTypeChange = (e) => {
    setSelectedMetricType(e.target.value);
    
    // Reset model selection when metric type changes to avoid invalid combinations
    setSelectedModels([]);
  };

  // Handle model selection/deselection
  const handleModelToggle = (model) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(m => m !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };

  // Get a summarized title based on current filters
  const getChartTitle = () => {
    const parts = [];
    
    if (filters.num_states !== 'all') parts.push(`States: ${filters.num_states}`);
    if (filters.num_observations !== 'all') parts.push(`Obs: ${filters.num_observations}`);
    if (filters.matrix_a !== 'all') parts.push(`A: ${filters.matrix_a}`);
    if (filters.matrix_b !== 'all') parts.push(`B: ${filters.matrix_b}`);
    if (filters.pi !== 'all') parts.push(`π: ${filters.pi}`);
    
    return parts.length > 0 
      ? `${selectedMetricType.toUpperCase()} - ${parts.join(', ')}` 
      : `${selectedMetricType.toUpperCase()} - All Configurations`;
  };

  // Get user-friendly metric name for display
  const getMetricDisplayName = (metricType) => {
    switch (metricType) {
      case 'acc': return 'Accuracy';
      case 'reverse_kl': return 'Reverse KL Divergence';
      case 'forward_kl': return 'Forward KL Divergence';
      case 'hellinger_distance': return 'Hellinger Distance';
      default: return metricType;
    }
  };

  // Get model display name
  const getModelDisplayName = (model) => {
    // Map internal model names to display names
    const displayNames = {
      'llm_emission': 'LLM',
      'random_emission': 'Random',
      '1-gram': '1-gram',
      '2-gram': '2-gram',
      '3-gram': '3-gram',
      '4-gram': '4-gram',
      'p_o_given_prev_h': 'p(o|h)',
      'p_o_t_given_prev_1_o': 'p(o|o-1)',
      'p_o_t_given_prev_2_o': 'p(o|o-2)',
      'p_o_t_given_prev_3_o': 'p(o|o-3)',
      'p_o_t_given_prev_4_o': 'p(o|o-4)',
      'p_o_t_given_prev_all_o': 'p(o|all o)',
      'viterbi': 'Viterbi',
      'bw': 'Baum-Welch'
    };
    
    return displayNames[model] || model;
  };

  // Format the tooltip based on metric type
  const formatTooltipValue = (value, metricType) => {
    if (value === null || value === undefined || !isFinite(value)) {
      return 'N/A';
    }
    
    switch (metricType) {
      case 'acc':
        return `${(value * 100).toFixed(2)}%`;
      case 'reverse_kl':
      case 'forward_kl': 
      case 'hellinger_distance':
        return value.toFixed(4);
      default:
        return value.toFixed(2);
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">Sequence Length: {label}</p>
          <div>
            {payload.map((entry, index) => (
              <div key={index} className="tooltip-item">
                <div 
                  className="tooltip-color" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="tooltip-name">{getModelDisplayName(entry.name)}:</span>
                <span className="tooltip-value">
                  {formatTooltipValue(entry.value, selectedMetricType)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Loading data...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const chartData = getChartData();

  return (
    <div className="hmm-visualizer">
      <h1>HMM Experiment Visualization</h1>
      
      {/* Filter controls */}
      <div className="filter-controls">
        <div>
          <label>Number of States:</label>
          <select 
            value={filters.num_states}
            onChange={(e) => handleFilterChange('num_states', e.target.value)}
          >
            <option value="all">All</option>
            {categories.num_states.map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Number of Observations:</label>
          <select 
            value={filters.num_observations}
            onChange={(e) => handleFilterChange('num_observations', e.target.value)}
          >
            <option value="all">All</option>
            {categories.num_observations.map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Entropy A:</label>
          <select 
            value={filters.matrix_a}
            onChange={(e) => handleFilterChange('matrix_a', e.target.value)}
          >
            <option value="all">All</option>
            {categories.matrix_a.map(type => (
              <option key={type} value={type}>H = {type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Entropy B:</label>
          <select 
            value={filters.matrix_b}
            onChange={(e) => handleFilterChange('matrix_b', e.target.value)}
          >
            <option value="all">All</option>
            {categories.matrix_b.map(type => (
              <option key={type} value={type}>H = {type}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>π Distribution:</label>
          <select 
            value={filters.pi}
            onChange={(e) => handleFilterChange('pi', e.target.value)}
          >
            <option value="all">All</option>
            {categories.pi.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Metric type selector */}
      <div className="metric-selector">
        <label className="metric-selector-label">Metric Type:</label>
        <div className="metric-options">
          {Object.keys(availableMetrics).map(metricType => (
            <div key={metricType} className="metric-option">
              <label>
                <input
                  type="radio"
                  name="metricType"
                  value={metricType}
                  checked={selectedMetricType === metricType}
                  onChange={handleMetricTypeChange}
                />
                <span>{getMetricDisplayName(metricType)}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Model selector */}
      <div className="model-selector">
        <label className="model-selector-label">Select Models to Compare:</label>
        <div className="model-options">
          {availableMetrics[selectedMetricType].map(model => (
            <div key={model} className="model-option">
              <label>
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model)}
                  onChange={() => handleModelToggle(model)}
                />
                <span>{getModelDisplayName(model)}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main chart */}
      <div className="chart-container">
        <h2 className="chart-title">{getChartTitle()}</h2>
        
        {selectedModels.length === 0 ? (
          <div className="chart-placeholder">
            Please select at least one model to display
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-placeholder">
            No data available for the selected filters
          </div>
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="length" 
                  label={{ value: 'Sequence Length', position: 'insideBottomRight', offset: -5 }}
                />
                <YAxis 
                  label={{ 
                    value: getMetricDisplayName(selectedMetricType), 
                    angle: -90, 
                    position: 'insideLeft' 
                  }}
                  domain={selectedMetricType === 'acc' ? [0, 1] : ['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedModels.map((model, index) => (
                  <Line
                    key={model}
                    type="monotone"
                    dataKey={model}
                    name={model}
                    strokeWidth={2}
                    stroke={colors[index % colors.length]}
                    activeDot={{ r: 8 }}
                    connectNulls
                  />
                ))}
                {selectedMetricType === 'acc' && (
                  <ReferenceLine y={1} stroke="green" strokeDasharray="3 3" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      
      {/* Data summary */}
      <div className="data-summary">
        <h2 className="data-summary-title">Data Summary</h2>
        <div className="data-summary-grid">
          <div className="data-summary-item">
            <h3>Total Configurations</h3>
            <p className="data-summary-value">{data.length}</p>
          </div>
          <div className="data-summary-item">
            <h3>Filtered Configurations</h3>
            <p className="data-summary-value">{filterData(filters).length}</p>
          </div>
          <div className="data-summary-item">
            <h3>Models Available</h3>
            <p className="data-summary-value">{availableMetrics[selectedMetricType].length}</p>
          </div>
          <div className="data-summary-item">
            <h3>Models Selected</h3>
            <p className="data-summary-value">{selectedModels.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HMMVisualizer;