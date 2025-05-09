import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import './GeneralEntropy.css';

const GeneralEntropy = () => {
  // Configuration state
  const [numState, setNumState] = useState(4);
  const [numObservation, setNumObservation] = useState(4);
  const [aEntropy, setAEntropy] = useState(null);
  const [bEntropy, setBEntropy] = useState(0);
  
  // Available configuration options
  const [availableNumStates, setAvailableNumStates] = useState([]);
  const [availableNumObservations, setAvailableNumObservations] = useState([]);
  const [availableAEntropies, setAvailableAEntropies] = useState([]);
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
  
  // Dataset selection
  const [selectedDataset, setSelectedDataset] = useState('both');
  const [datasets, setDatasets] = useState({
    original: null,
    new: null,
    combined: null
  });
  
  // Constants
  // Original models from the first dataset
  const originalModels = [
    'llm_emission',
    'bw',
    'viterbi',
    'p_o_t_given_prev_all_o',
    '2-gram',
    '1-gram',
    '3-gram',
    '4-gram',
    'p_o_given_prev_h',
    'p_o_t_given_prev_1_o',
    'p_o_t_given_prev_2_o',
    'p_o_t_given_prev_3_o',
    'p_o_t_given_prev_4_o',
    'random_emission'
  ];
  
  // New models (from the new dataset)
  const newModels = ['new_llm_emission'];
  
  // Combined models list
  const allModels = [...originalModels, ...newModels];
  
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
  
  // Update available A_entropy values when other parameters change
  useEffect(() => {
    if (Object.keys(configMap).length === 0) return;
    
    const key = `${numState}_${numObservation}_${bEntropy}`;
    if (configMap[key]) {
      const availableValues = configMap[key];
      setAvailableAEntropies(availableValues);
      
      // If current A_entropy is not in the list or not set, select the first one
      if (!availableValues.includes(aEntropy) || aEntropy === null) {
        setAEntropy(availableValues[0]);
      }
    } else {
      setAvailableAEntropies([]);
      setAEntropy(null);
    }
  }, [numState, numObservation, bEntropy, configMap, aEntropy]);
  
  // Process CSV data function
  const processCSVData = (data, modelPrefix = '') => {
    return data.map(row => {
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
          // For the original dataset, we check all models
          const modelsToCheck = modelPrefix ? 
            ['llm_emission'] :  // For new dataset, only check llm_emission
            originalModels;     // For original dataset, check all models
          
          for (const model of modelsToCheck) {
            const key = `${model}_${metric}`;
            if (row[key] !== undefined) {
              const values = parseArray(row[key]);
              const modelKey = modelPrefix ? `${modelPrefix}_${model}` : model;
              
              if (Array.isArray(values) && values.length > i) {
                dataPoint[modelKey] = values[i];
              } else if (!Array.isArray(values)) {
                dataPoint[modelKey] = values;
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
  };
  
  // Merge datasets based on matching configurations
  const mergeDatasets = (originalData, newData) => {
    if (!originalData || !newData) return originalData || newData || [];
    
    // Create a merged dataset
    const mergedData = [...originalData];
    
    // For each configuration in the new dataset
    newData.forEach(newItem => {
      // Find matching configuration in original dataset
      const matchIndex = originalData.findIndex(origItem => 
        origItem.config.num_state === newItem.config.num_state &&
        origItem.config.num_observation === newItem.config.num_observation &&
        Math.abs(origItem.config.A_entropy - newItem.config.A_entropy) < 0.0001 &&
        origItem.config.B_entropy === newItem.config.B_entropy
      );
      
      if (matchIndex >= 0) {
        // If matching config found, merge the chart data
        for (const metric of metrics) {
          for (let i = 0; i < mergedData[matchIndex].chartData[metric].length; i++) {
            // Add new model data to existing data point
            Object.assign(
              mergedData[matchIndex].chartData[metric][i],
              newItem.chartData[metric][i]
            );
          }
        }
      } else {
        // If no matching config, add the new data as is
        mergedData.push(newItem);
      }
    });
    
    return mergedData;
  };
  
  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Load original dataset
        const originalResponse = await fetch(`./data/Qwen2.5-1.5B_11111_4096_entropy_2048.csv`);
        const originalFileContent = await originalResponse.text();
        
        const originalParsedData = Papa.parse(originalFileContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true
        });
        
        if (originalParsedData.data.length === 0) {
          setLoading(false);
          return;
        }
        
        // Process original data
        const processedOriginalData = processCSVData(originalParsedData.data);
        
        // Try to load new dataset
        let processedNewData = [];
        try {
          const newResponse = await fetch(`./data/Qwen2.5-7B_11111_4096_entropy_2048.csv`);
          const newFileContent = await newResponse.text();
          
          const newParsedData = Papa.parse(newFileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
          });
          
          if (newParsedData.data.length > 0) {
            // Process new data with a prefix to distinguish it
            processedNewData = processCSVData(newParsedData.data, 'new');
          }
        } catch (error) {
          console.warn('New dataset could not be loaded:', error);
        }
        
        // Merge datasets
        const combinedData = mergeDatasets(processedOriginalData, processedNewData);
        
        // Store datasets separately
        setDatasets({
          original: processedOriginalData,
          new: processedNewData.length > 0 ? processedNewData : null,
          combined: combinedData
        });
        
        // Set the active dataset
        setAllData(combinedData);
        
        // Extract unique values for configuration parameters from combined data
        const uniqueNumStates = [...new Set(combinedData.map(item => item.config.num_state))];
        const uniqueNumObservations = [...new Set(combinedData.map(item => item.config.num_observation))];
        const uniqueBEntropies = [...new Set(combinedData.map(item => item.config.B_entropy))];
        
        setAvailableNumStates(uniqueNumStates);
        setAvailableNumObservations(uniqueNumObservations);
        setAvailableBEntropies(uniqueBEntropies);
        
        // Build configuration map
        const configMapping = {};
        combinedData.forEach(item => {
          const key = `${item.config.num_state}_${item.config.num_observation}_${item.config.B_entropy}`;
          if (!configMapping[key]) {
            configMapping[key] = [];
          }
          if (!configMapping[key].includes(item.config.A_entropy)) {
            configMapping[key].push(item.config.A_entropy);
          }
        });
        
        // Sort A_entropy values within each configuration
        Object.keys(configMapping).forEach(key => {
          configMapping[key].sort((a, b) => a - b);
        });
        
        setConfigMap(configMapping);
        
        // Set default selections
        if (uniqueNumStates.length > 0) setNumState(uniqueNumStates[0]);
        if (uniqueNumObservations.length > 0) setNumObservation(uniqueNumObservations[0]);
        if (uniqueBEntropies.length > 0) setBEntropy(uniqueBEntropies[0]);
        
        // Determine available models
        const availableModelList = [...originalModels];
        if (processedNewData.length > 0) {
          availableModelList.push('new_llm_emission');
        }
        
        setAvailableModels(availableModelList);
        // Select a few default models including the new one if available
        setSelectedModels([
          'llm_emission', 
          ...(processedNewData.length > 0 ? ['new_llm_emission'] : []),
          'viterbi',
          'bw'
        ].filter(m => availableModelList.includes(m)));
        
        setLoading(false);
      } catch (error) {
        console.error('Error processing data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle dataset selection change
  const handleDatasetChange = (dataset) => {
    setSelectedDataset(dataset);
    
    // Update the active dataset
    switch (dataset) {
      case 'original':
        setAllData(datasets.original || []);
        break;
      case 'new':
        setAllData(datasets.new || []);
        break;
      case 'both':
      default:
        setAllData(datasets.combined || []);
        break;
    }
  };
  
  // Update current data based on selected configuration
  useEffect(() => {
    if (allData.length === 0 || aEntropy === null) return;
    
    const matchingData = allData.find(item => 
      item.config.num_state === numState && 
      item.config.num_observation === numObservation && 
      Math.abs(item.config.A_entropy - aEntropy) < 0.0001 && // Use approximate equality for floating point
      item.config.B_entropy === bEntropy
    );
    
    if (matchingData) {
      setCurrentData(matchingData.chartData);
      setCurrentProperties(matchingData.config);
    } else {
      console.warn('No data found for selected configuration');
      setCurrentData(null);
    }
  }, [numState, numObservation, aEntropy, bEntropy, allData]);
  
  // Model names mapping for display
  const modelDisplayNames = {
    'llm_emission': 'LLM Emission (Original)',
    'new_llm_emission': 'LLM Emission (New)',
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
    'new_llm_emission': '#ff6b81', // Different color for new LLM
    'viterbi': '#ffc658',
    'bw': '#00c49f',
    '2-gram': '#57c754',
    'random_emission': '#82ca9d',
    '1-gram': '#57c754',
    '3-gram': '#57c754',
    '4-gram': '#57c754',
    'p_o_given_prev_h': '#e8d651',
    'p_o_t_given_prev_1_o': '#e8d651',
    'p_o_t_given_prev_2_o': '#e8d651',
    'p_o_t_given_prev_3_o': '#e8d651',
    'p_o_t_given_prev_4_o': '#e8d651',
    'p_o_t_given_prev_all_o': '#e8d651'
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
  
  // Format A_entropy value for display
  const formatAEntropy = (value) => {
    if (value === null || value === undefined) return '';
    return typeof value === 'number' ? value.toFixed(2) : value;
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
          <label className="config-label">A Entropy:</label>
          <select 
            className="config-select"
            value={aEntropy || ''}
            onChange={(e) => setAEntropy(parseFloat(e.target.value))}
            disabled={availableAEntropies.length === 0}
          >
            {availableAEntropies.map(value => (
              <option key={value} value={value}>{formatAEntropy(value)}</option>
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
  
  // Dataset selector
  const datasetSelector = (
    <div className="dataset-section">
      <h3 className="config-title">Dataset Selection</h3>
      <div className="dataset-buttons">
        <button
          className={`dataset-button ${selectedDataset === 'original' ? 'dataset-button-selected' : ''}`}
          onClick={() => handleDatasetChange('original')}
        >
          Original Dataset
        </button>
        {datasets.new && (
          <button
            className={`dataset-button ${selectedDataset === 'new' ? 'dataset-button-selected' : ''}`}
            onClick={() => handleDatasetChange('new')}
          >
            New Dataset
          </button>
        )}
        {datasets.new && (
          <button
            className={`dataset-button ${selectedDataset === 'both' ? 'dataset-button-selected' : ''}`}
            onClick={() => handleDatasetChange('both')}
          >
            Combined
          </button>
        )}
      </div>
    </div>
  );
  
  if (!currentData || !currentProperties) {
    return (
      <div className="no-data-message">
        <h2 className="no-data-title">No data available for the selected configuration</h2>
        <p>Please select different parameters.</p>
        
        {datasetSelector}
        {parameterSelector}
      </div>
    );
  }
  
  const chartTitle = `A Entropy Varying - ${selectedDataset === 'original' ? 'Original Dataset' : 
                                         selectedDataset === 'new' ? 'New Dataset' : 
                                         'Combined Datasets'}`;
  
  return (
    <div className="visualization-container">
      <h2 className="visualization-title">{chartTitle}</h2>
      
      {datasetSelector}
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
            <span className="badge-label">A Entropy:</span> {formatAEntropy(currentProperties.A_entropy)}
          </div>
          <div className="config-badge">
            <span className="badge-label">Steady State:</span> {formatValue(currentProperties.steady_state)}
          </div>
          <div className="config-badge">
            <span className="badge-label">Lambda2:</span> {formatValue(currentProperties.lambda2)}
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
              currentData[selectedMetric][0][model] !== undefined && (
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
              )
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
          <li>A_entropy represents transition matrix complexity</li>
          <li>B_entropy represents emission matrix complexity</li>
          <li>Lambda2 is the second largest eigenvalue of transition matrix</li>
          <li>Steady State represents the equilibrium distribution</li>
        </ul>
      </div>
    </div>
  );
};

export default GeneralEntropy;