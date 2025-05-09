import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const GeneralLambda = () => {
  // Configuration state
  const [numState, setNumState] = useState(4);
  const [numObservation, setNumObservation] = useState(4);
  const [lambda2, setLambda2] = useState(null);
  const [bEntropy, setBEntropy] = useState(0);
  
  // Available configuration options
  const [availableNumStates, setAvailableNumStates] = useState([]);
  const [availableNumObservations, setAvailableNumObservations] = useState([]);
  const [availableLambda2s, setAvailableLambda2s] = useState([]);
  const [availableBEntropies, setAvailableBEntropies] = useState([]);
  
  // Configuration mappings
  const [configMap, setConfigMap] = useState({});
  
  // Data state
  const [allData, setAllData] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [currentProperties, setCurrentProperties] = useState(null);
  
  // Display state
  const [selectedMetric, setSelectedMetric] = useState('acc');
  const [selectedModelType, setSelectedModelType] = useState('llm');
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Categorize models
  const [llmModels, setLlmModels] = useState([]);
  const [baselineModels, setBaselineModels] = useState([]);
  
  // Constants
  const metrics = ['acc', 'hellinger_distance'];
  const sequenceLengths = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  
  // Parse array strings helper function
  const parseArray = (str) => {
    if (typeof str === 'string' && str.includes('[') && str.includes(']')) {
      try {
        return JSON.parse(str.replace(/\s+/g, ''));
      } catch (e) {
        // Try extracting values manually
        const match = str.match(/\[(.*?)\]/);
        if (match && match[1]) {
          return match[1].split(',').map(item => parseFloat(item.trim()));
        }
        return str;
      }
    }
    return str;
  };
  
  // Update available lambda2 values when other parameters change
  useEffect(() => {
    if (Object.keys(configMap).length === 0) return;
    
    const key = `${numState}_${numObservation}_${bEntropy}`;
    if (configMap[key]) {
      const availableValues = configMap[key];
      setAvailableLambda2s(availableValues);
      
      // If current lambda2 is not in the list or not set, select the first one
      if (!availableValues.includes(lambda2) || lambda2 === null) {
        setLambda2(availableValues[0]);
      }
    } else {
      setAvailableLambda2s([]);
      setLambda2(null);
    }
  }, [numState, numObservation, bEntropy, configMap, lambda2]);
  
  // Set available models based on selected model type
  useEffect(() => {
    let models = [];
    switch (selectedModelType) {
      case 'llm':
        models = llmModels;
        break;
      case 'baseline':
        models = baselineModels;
        break;
      case 'all':
        models = [...llmModels, ...baselineModels];
        break;
      default:
        models = llmModels;
    }
    
    setAvailableModels(models);
    // Select first 5 models or all if less than 5
    setSelectedModels(models.slice(0, Math.min(5, models.length)));
  }, [selectedModelType, llmModels, baselineModels]);
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch the CSV file
        const response = await fetch('./data/lambda2_results.csv');
        const fileContent = await response.text();
        
        const parsedData = Papa.parse(fileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        if (parsedData.data.length === 0) {
          setLoading(false);
          return;
        }
        
        // Extract unique values for configuration parameters
        const uniqueNumStates = [...new Set(parsedData.data.map(row => row.num_state))];
        const uniqueNumObservations = [...new Set(parsedData.data.map(row => row.num_observation))];
        const uniqueBEntropies = [...new Set(parsedData.data.map(row => row.B_entropy))];
        
        setAvailableNumStates(uniqueNumStates);
        setAvailableNumObservations(uniqueNumObservations);
        setAvailableBEntropies(uniqueBEntropies);
        
        // Build configuration map
        const configMapping = {};
        parsedData.data.forEach(row => {
          const key = `${row.num_state}_${row.num_observation}_${row.B_entropy}`;
          if (!configMapping[key]) {
            configMapping[key] = [];
          }
          if (!configMapping[key].includes(row.lambda2)) {
            configMapping[key].push(row.lambda2);
          }
        });
        
        // Sort lambda2 values within each configuration
        Object.keys(configMapping).forEach(key => {
          configMapping[key].sort((a, b) => a - b);
        });
        
        setConfigMap(configMapping);
        
        // Categorize models
        const llmModelsTemp = [];
        const baselineModelsTemp = [];
        
        parsedData.meta.fields
          .filter(field => field.endsWith('_acc'))
          .forEach(field => {
            const model = field.replace('_acc', '');
            if (model.startsWith('llm_')) {
              llmModelsTemp.push(model);
            } else {
              baselineModelsTemp.push(model);
            }
          });
        
        setLlmModels(llmModelsTemp);
        setBaselineModels(baselineModelsTemp);
        
        // Process all rows
        const processedData = parsedData.data.map(row => {
          const config = {
            num_state: row.num_state,
            num_observation: row.num_observation,
            A_entropy: row.A_entropy,
            B_entropy: row.B_entropy,
            steady_state: row.steady_state, 
            lambda2: row.lambda2
          };
          
          // Prepare chart data for this configuration
          const chartData = {};
          for (const metric of metrics) {
            chartData[metric] = [];
            
            // For each sequence length
            for (let i = 0; i < sequenceLengths.length; i++) {
              const dataPoint = { sequenceLength: sequenceLengths[i] };
              
              // Add model values for this sequence length
              const allModels = [...llmModelsTemp, ...baselineModelsTemp];
              
              for (const model of allModels) {
                const key = `${model}_${metric}`;
                if (row[key] !== undefined) {
                  const values = parseArray(row[key]);
                  if (Array.isArray(values) && values.length > i) {
                    dataPoint[model] = values[i];
                  } else if (!Array.isArray(values)) {
                    dataPoint[model] = values;
                  }
                }
              }
              
              chartData[metric].push(dataPoint);
            }
          }
          
          return {
            config,
            chartData
          };
        });
        
        setAllData(processedData);
        
        // Set default selections
        if (uniqueNumStates.length > 0) setNumState(uniqueNumStates[0]);
        if (uniqueNumObservations.length > 0) setNumObservation(uniqueNumObservations[0]);
        if (uniqueBEntropies.length > 0) setBEntropy(uniqueBEntropies[0]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error processing data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Update current data based on selected configuration
  useEffect(() => {
    if (allData.length === 0 || lambda2 === null) return;
    
    const matchingData = allData.find(item => 
      item.config.num_state === numState && 
      item.config.num_observation === numObservation && 
      Math.abs(item.config.lambda2 - lambda2) < 0.0001 && // Use approximate equality for floating point
      item.config.B_entropy === bEntropy
    );
    
    if (matchingData) {
      setCurrentData(matchingData.chartData);
      setCurrentProperties(matchingData.config);
    } else {
      console.warn('No data found for selected configuration');
      setCurrentData(null);
    }
  }, [numState, numObservation, lambda2, bEntropy, allData]);
  
  // Model names mapping for display
  const getModelDisplayName = (modelId) => {
    if (modelId.startsWith('llm_')) {
      // Format LLM model names (e.g., llm_qwen_1_5b -> Qwen 1.5B)
      const parts = modelId.replace('llm_', '').split('_');
      const modelName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      
      // Handle size format (e.g., 1_5b -> 1.5B)
      let sizeStr = '';
      if (parts.length > 1) {
        const sizeNumbers = parts.slice(1).join('.');
        sizeStr = sizeNumbers.replace('b', 'B');
      }
      
      return `${modelName} ${sizeStr}`;
    }
    
    // Handle special cases
    const specialCases = {
      'random_emission': 'Random Emission',
      'lstm_emission': 'LSTM Emission',
      'p_o_given_prev_h': 'P(O|prev H)',
      'p_o_t_given_prev_1_o': 'P(O_t|prev 1 O)',
      'p_o_t_given_prev_2_o': 'P(O_t|prev 2 O)',
      'p_o_t_given_prev_3_o': 'P(O_t|prev 3 O)',
      'p_o_t_given_prev_4_o': 'P(O_t|prev 4 O)',
      'p_o_t_given_prev_all_o': 'P(O_t|prev all O)',
      'viterbi': 'Viterbi',
      'bw': 'Baum-Welch',
      '1-gram': '1-gram',
      '2-gram': '2-gram',
      '3-gram': '3-gram',
      '4-gram': '4-gram'
    };
    
    return specialCases[modelId] || modelId;
  };
  
  // Color mapping for models
  const getModelColor = (modelId) => {
    // LLM model colors - use a gradient of purples
    if (modelId.startsWith('llm_llama')) {
      if (modelId.includes('1b')) return '#9f7aea';
      if (modelId.includes('3b')) return '#805ad5';
      if (modelId.includes('8b')) return '#6b46c1';
      return '#553c9a'; // default llama color
    }
    
    if (modelId.startsWith('llm_qwen')) {
      if (modelId.includes('0_5b')) return '#f687b3';
      if (modelId.includes('1_5b')) return '#d53f8c';
      if (modelId.includes('3b')) return '#b83280';
      if (modelId.includes('7b')) return '#97266d';
      return '#702459'; // default qwen color
    }
    
    // Special case for baseline models
    const baselineColors = {
      'random_emission': '#e53e3e',
      '1-gram': '#38a169',
      '2-gram': '#2f855a',
      '3-gram': '#276749',
      '4-gram': '#22543d'
    };
    
    // Special case for other models
    const otherColors = {
      'lstm_emission': '#4299e1',
      'viterbi': '#f6ad55',
      'bw': '#00c49f',
      'p_o_given_prev_h': '#f6e05e',
      'p_o_t_given_prev_1_o': '#ecc94b',
      'p_o_t_given_prev_2_o': '#d69e2e',
      'p_o_t_given_prev_3_o': '#b7791f',
      'p_o_t_given_prev_4_o': '#975a16',
      'p_o_t_given_prev_all_o': '#744210'
    };
    
    return baselineColors[modelId] || otherColors[modelId] || '#718096'; // default gray
  };
  
  // Metric display names
  const metricDisplayNames = {
    'acc': 'Accuracy',
    'hellinger_distance': 'Hellinger Distance'
  };
  
  const toggleModelSelection = (model) => {
    if (selectedModels.includes(model)) {
      setSelectedModels(selectedModels.filter(m => m !== model));
    } else {
      setSelectedModels([...selectedModels, model]);
    }
  };
  
  if (loading) {
    return (
      <div className="loading-message">
        <h2>Loading data...</h2>
        <p>Please wait while we process the lambda2 results.</p>
      </div>
    );
  }
  
  // Format lambda2 value for display
  const formatLambda2 = (value) => {
    if (value === null || value === undefined) return '';
    return typeof value === 'number' ? value.toFixed(4) : value;
  };
  
  // Format floating point or array values for display
  const formatValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') return value.toFixed(4);
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      try {
        // first value of the array
        return value.split(',')[0];
      } catch (e) {
        return value;
      }
    }
    return value;
  };
  
  const parameterSelector = (
    <div className="config-section">
      <h3 className="config-title">Configuration Settings</h3>
      <div className="config-grid">
        <div className="config-item">
          <label className="config-label">Number of States:</label>
          <select 
            className="config-select"
            value={numState}
            onChange={(e) => setNumState(parseInt(e.target.value))}
          >
            {availableNumStates.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="config-item">
          <label className="config-label">Number of Observations:</label>
          <select 
            className="config-select"
            value={numObservation}
            onChange={(e) => setNumObservation(parseInt(e.target.value))}
          >
            {availableNumObservations.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="config-item">
          <label className="config-label">Lambda2:</label>
          <select 
            className="config-select"
            value={lambda2 || ''}
            onChange={(e) => setLambda2(parseFloat(e.target.value))}
            disabled={availableLambda2s.length === 0}
          >
            {availableLambda2s.map(value => (
              <option key={value} value={value}>{formatLambda2(value)}</option>
            ))}
          </select>
        </div>
        
        <div className="config-item">
          <label className="config-label">B Entropy:</label>
          <select 
            className="config-select"
            value={bEntropy}
            onChange={(e) => setBEntropy(parseInt(e.target.value))}
          >
            {availableBEntropies.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
  
  if (!currentData || !currentProperties) {
    return (
      <div className="no-data-message">
        <h2 className="no-data-title">No data available for the selected configuration</h2>
        <p>Please select different parameters.</p>
        
        {parameterSelector}
      </div>
    );
  }
  
  return (
    <div className="visualization-container">
      <h2 className="visualization-title">Lambda2 Visualization</h2>
      
      {parameterSelector}
      
      <div className="current-config">
        <h3 className="config-title">Current Configuration</h3>
        <div className="config-badges">
          <div className="config-badge">
            <span className="badge-label">States:</span> {currentProperties.num_state}
          </div>
          <div className="config-badge">
            <span className="badge-label">Observations:</span> {currentProperties.num_observation}
          </div>
          <div className="config-badge">
            <span className="badge-label">Lambda2:</span> {formatLambda2(currentProperties.lambda2)}
          </div>
          <div className="config-badge">
            <span className="badge-label">A Entropy:</span> {formatValue(currentProperties.A_entropy)}
          </div>
          <div className="config-badge">
            <span className="badge-label">Steady State:</span> {formatValue(currentProperties.steady_state)}
          </div>
          <div className="config-badge">
            <span className="badge-label">B Entropy:</span> {currentProperties.B_entropy}
          </div>
        </div>
      </div>
      
      <div className="metrics-section">
        <h3 className="config-title">Metrics</h3>
        <div className="metrics-buttons">
          {Object.keys(metricDisplayNames).map(metric => (
            <button
              key={metric}
              className={`metric-button ${selectedMetric === metric ? 'metric-button-selected' : 'metric-button-unselected'}`}
              onClick={() => setSelectedMetric(metric)}
            >
              {metricDisplayNames[metric]}
            </button>
          ))}
        </div>
      </div>
      
      <div className="models-section">
        <h3 className="config-title">Model Categories</h3>
        <div className="model-category-buttons">
          <button
            className={`model-button ${selectedModelType === 'all' ? 'model-button-selected' : ''}`}
            onClick={() => setSelectedModelType('all')}
          >
            All Models
          </button>
          <button
            className={`model-button ${selectedModelType === 'llm' ? 'model-button-selected' : ''}`}
            onClick={() => setSelectedModelType('llm')}
          >
            LLM Models
          </button>
          <button
            className={`model-button ${selectedModelType === 'baseline' ? 'model-button-selected' : ''}`}
            onClick={() => setSelectedModelType('baseline')}
          >
            Baseline Models
          </button>
        </div>
        
        <h3 className="config-title">Selected Models</h3>
        <div className="model-buttons">
          {availableModels.map(model => (
            <button
              key={model}
              className={`model-button ${selectedModels.includes(model) ? 'model-button-selected' : ''}`}
              onClick={() => toggleModelSelection(model)}
              style={{ borderColor: getModelColor(model) }}
            >
              {getModelDisplayName(model)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={currentData[selectedMetric]}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="sequenceLength" 
              label={{ value: 'Sequence Length', position: 'insideBottomRight', offset: -10 }}
              scale="log"
              domain={['dataMin', 'dataMax']}
              type="number"
              ticks={sequenceLengths}
            />
            <YAxis 
              label={{ 
                value: metricDisplayNames[selectedMetric], 
                angle: -90, 
                position: 'insideLeft' 
              }} 
              domain={selectedMetric === 'acc' ? [0, 1] : [0, 'auto']}
            />
            <Tooltip />
            <Legend />
            {selectedModels.map(model => (
              <Line
                key={model}
                type="monotone"
                dataKey={model}
                name={getModelDisplayName(model)}
                stroke={getModelColor(model)}
                activeDot={{ r: 8 }}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="notes-section">
        <p>Notes:</p>
        <ul className="notes-list">
          <li>For accuracy, higher values are better</li>
          <li>For Hellinger distance, lower values are better</li>
          <li>X-axis uses logarithmic scale</li>
          <li>Lambda2 is the second largest eigenvalue of transition matrix (affects mixing time)</li>
          <li>A_entropy represents transition matrix complexity</li>
          <li>B_entropy represents emission matrix complexity</li>
          <li>Steady State represents the equilibrium distribution</li>
        </ul>
      </div>
    </div>
  );
};

export default GeneralLambda;