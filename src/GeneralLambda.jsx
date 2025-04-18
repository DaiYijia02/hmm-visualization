import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import './GeneralEntropy.css';

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
  const [selectedModels, setSelectedModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Constants
  const models = [
    'llm_emission',
    'random_emission',
    '1-gram',
    '2-gram',
    '3-gram',
    '4-gram',
    'p_o_given_prev_h',
    'p_o_t_given_prev_1_o',
    'p_o_t_given_prev_2_o',
    'p_o_t_given_prev_3_o',
    'p_o_t_given_prev_4_o',
    'p_o_t_given_prev_all_o',
    'viterbi',
    'bw'
  ];
  
  const metrics = ['acc', 'hellinger_distance'];
  const sequenceLengths = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
  
  // Parse array strings helper function
  const parseArray = (str) => {
    if (typeof str === 'string' && str.includes('[') && str.includes(']')) {
      try {
        return JSON.parse(str);
      } catch (e) {
        // Clean string and try again
        const cleanStr = str.replace(/\s+/g, '');
        try {
          return JSON.parse(cleanStr);
        } catch (e2) {
          // Try extracting values manually
          const match = cleanStr.match(/\[(.*?)\]/);
          if (match && match[1]) {
            return match[1].split(',').map(item => parseFloat(item));
          }
          return str;
        }
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
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Use fetch instead of window.fs.readFile
        const response = await fetch(`./data/Qwen2.5-1.5B_11111_4096_lambda2_2048.csv`);
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
        
        // Process all rows
        const processedData = parsedData.data.map(row => {
          const config = {
            num_state: row.num_state,
            num_observation: row.num_observation,
            A_entropy: row.A_entropy,
            B_entropy: row.B_entropy,
            steady_state: row.steady_state, // Include steady_state
            lambda2: row.lambda2 // Include lambda2
          };
          
          // Prepare chart data for this configuration
          const chartData = {};
          for (const metric of metrics) {
            chartData[metric] = [];
            
            // For each sequence length
            for (let i = 0; i < sequenceLengths.length; i++) {
              const dataPoint = { sequenceLength: sequenceLengths[i] };
              
              // Add model values for this sequence length
              for (const model of models) {
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
        
        // A_entropy will be set by the useEffect that depends on the above values
        
        setAvailableModels(models);
        setSelectedModels(models.slice(0, 5)); // Select first 5 models by default
        
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
  const modelDisplayNames = {
    'llm_emission': 'LLM Emission',
    'random_emission': 'Random Emission',
    '1-gram': '1-gram',
    '2-gram': '2-gram',
    '3-gram': '3-gram',
    '4-gram': '4-gram',
    'p_o_given_prev_h': 'P(O|prev H)',
    'p_o_t_given_prev_1_o': 'P(O_t|prev 1 O)',
    'p_o_t_given_prev_2_o': 'P(O_t|prev 2 O)',
    'p_o_t_given_prev_3_o': 'P(O_t|prev 3 O)',
    'p_o_t_given_prev_4_o': 'P(O_t|prev 4 O)',
    'p_o_t_given_prev_all_o': 'P(O_t|prev all O)',
    'viterbi': 'Viterbi',
    'bw': 'Baum-Welch'
  };
  
  // Color mapping for models
  const colorMap = {
    'llm_emission': '#8884d8',
    'random_emission': '#82ca9d',
    '1-gram': '#ffc658',
    '2-gram': '#ff7300',
    '3-gram': '#0088fe',
    '4-gram': '#00c49f',
    'p_o_given_prev_h': '#ffbb28',
    'p_o_t_given_prev_1_o': '#ff8042',
    'p_o_t_given_prev_2_o': '#ff8042',
    'p_o_t_given_prev_3_o': '#ff8042',
    'p_o_t_given_prev_4_o': '#ff8042',
    'p_o_t_given_prev_all_o': '#ff8042',
    'viterbi': '#a4de6c',
    'bw': '#d0ed57'
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
    return <div className="loading-message">Loading data...</div>;
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
  
  const chartTitle = `Lambda2 Varying`;
  
  return (
    <div className="visualization-container">
      <h2 className="visualization-title">{chartTitle}</h2>
      
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
        <h3 className="config-title">Models</h3>
        <div className="model-buttons">
          {availableModels.map(model => (
            <button
              key={model}
              className={`model-button ${selectedModels.includes(model) ? 'model-button-selected' : ''}`}
              onClick={() => toggleModelSelection(model)}
              style={{ borderColor: colorMap[model] }}
            >
              {modelDisplayNames[model]}
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
                name={modelDisplayNames[model]}
                stroke={colorMap[model]}
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