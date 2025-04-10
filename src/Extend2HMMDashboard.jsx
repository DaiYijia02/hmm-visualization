import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Papa from 'papaparse';
import './ExtendHMMDashboard.css';

// Sequence lengths for x-axis
const seqLengths = [8, 16, 32, 64, 128, 256, 512, 1024];

// Methods to compare (with correct prefix mapping to CSV columns)
const methods = [
  'llm_emission', 'random_emission', 'previous_emission', 'p_o_given_prev_h', 
  'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o', 'p_o_t_given_prev_3_o',
  'p_o_t_given_prev_4_o', 'p_o_t_given_prev_5_o', 'p_o_t_given_prev_6_o',
  'p_o_t_given_prev_7_o', 'p_o_t_given_prev_8_o', 'p_o_t_given_prev_all_o'
];

// Method display names for prettier labels
const methodDisplayNames = {
  'llm_emission': 'LLM',
  'random_emission': 'Random',
  'previous_emission': 'Bigram',
  'p_o_given_prev_h': 'P(O|Prev H)',
  'p_o_t_given_prev_1_o': 'P(O|Prev 1 O)',
  'p_o_t_given_prev_2_o': 'P(O|Prev 2 O)',
  'p_o_t_given_prev_3_o': 'P(O|Prev 3 O)',
  'p_o_t_given_prev_4_o': 'P(O|Prev 4 O)',
  'p_o_t_given_prev_5_o': 'P(O|Prev 5 O)',
  'p_o_t_given_prev_6_o': 'P(O|Prev 6 O)',
  'p_o_t_given_prev_7_o': 'P(O|Prev 7 O)',
  'p_o_t_given_prev_8_o': 'P(O|Prev 8 O)',
  'p_o_t_given_prev_all_o': 'P(O|All Prev O)'
};

// Metric types
const metricTypes = ['acc', 'reverse_kl', 'forward_kl', 'hellinger_distance'];

// Colors for different methods
const colors = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', 
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#17becf', '#aec7e8', '#ffbb78', '#98df8a'
];

const Extend2HMMDashboard = () => {
  // Dataset selection
  const [selectedDataset, setSelectedDataset] = useState('expand_obs');
  
  // State for data and filters
  const [expand16StatesData, set16StatesData] = useState([]);
  const [expand64StatesData, set64StatesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [numStates, setNumStates] = useState('all');
  const [numObservations, setNumObservations] = useState('all');
  const [aCategory, setACategory] = useState('all');
  const [bCategory, setBCategory] = useState('all');
  const [piCategory, setPiCategory] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('acc');
  
  // Selected methods to display
  const [selectedMethods, setSelectedMethods] = useState(['llm_emission', 'random_emission', 'previous_emission', 'p_o_given_prev_h', 'p_o_t_given_prev_all_o']); // Start with main methods
  
  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    numStates: [],
    numObservations: [],
    aCategories: [],
    bCategories: [],
    piCategories: []
  });

  // Reset filters when changing datasets
  useEffect(() => {
    setNumStates('all');
    setNumObservations('all');
    setACategory('all');
    setBCategory('all');
    setPiCategory('all');
  }, [selectedDataset]);

  // Process a CSV file into a structured dataset
  const processCSVData = (results) => {
    return results.data
      .filter(row => row.num_states) // Filter out empty rows
      .map(row => {
        const newRow = { ...row };
        
        // Process string arrays
        Object.keys(newRow).forEach(key => {
          if (typeof newRow[key] === 'string' && newRow[key].startsWith('[') && newRow[key].endsWith(']')) {
            try {
              // Replace NaN and Infinity values
              const cleanString = newRow[key]
                .replace(/nan/g, 'null')
                .replace(/inf/g, 'null');
              newRow[key] = JSON.parse(cleanString);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
        });
        
        // Calculate entropy for A matrices
        try {
          const aMatrix = JSON.parse(row.A);
          
          // Calculate entropy for each row of the matrix
          const rowEntropies = aMatrix.map(rowProbs => {
            return -rowProbs.reduce((entropy, p) => {
              // Handle zero probabilities (log(0) is undefined)
              return entropy + (p > 0 ? p * Math.log2(p) : 0);
            }, 0);
          });
          
          // Average entropy across all rows
          const avgEntropy = rowEntropies.reduce((sum, e) => sum + e, 0) / aMatrix.length;
          
          // Store the actual entropy value
          newRow.A_entropy = avgEntropy;
          
          // Group into entropy ranges for filtering
          // The theoretical maximum entropy for n states is log2(n)
          const maxPossibleEntropy = Math.log2(aMatrix.length);
          // Normalize to 0-1 scale
          const normalizedEntropy = avgEntropy / maxPossibleEntropy;
          
          // Create entropy category based on normalized value
          newRow.A_category = `Entropy: ${avgEntropy.toFixed(2)} (${(normalizedEntropy * 100).toFixed(0)}%)`;
        } catch (e) {
          newRow.A_entropy = 0;
          newRow.A_category = "Unknown";
        }
        
        // Calculate entropy for B matrices
        try {
          const bMatrix = JSON.parse(row.B);
          
          // Calculate entropy for each row of the matrix
          const rowEntropies = bMatrix.map(rowProbs => {
            return -rowProbs.reduce((entropy, p) => {
              // Handle zero probabilities (log(0) is undefined)
              return entropy + (p > 0 ? p * Math.log2(p) : 0);
            }, 0);
          });
          
          // Average entropy across all rows
          const avgEntropy = rowEntropies.reduce((sum, e) => sum + e, 0) / bMatrix.length;
          
          // Store the actual entropy value
          newRow.B_entropy = avgEntropy;
          
          // Group into entropy ranges for filtering
          // The theoretical maximum entropy for n observations is log2(n)
          const maxPossibleEntropy = Math.log2(bMatrix[0].length);
          // Normalize to 0-1 scale
          const normalizedEntropy = avgEntropy / maxPossibleEntropy;
          
          // Create entropy category based on normalized value
          newRow.B_category = `Entropy: ${avgEntropy.toFixed(2)} (${(normalizedEntropy * 100).toFixed(0)}%)`;
        } catch (e) {
          newRow.B_entropy = 0;
          newRow.B_category = "Unknown";
        }
        
        // Categorize pi vectors
        try {
          const piVector = JSON.parse(row.pi);
          const max = Math.max(...piVector);
          newRow.pi_category = max > 0.99 ? "deterministic" : "uniform";
        } catch (e) {
          newRow.pi_category = "Unknown";
        }
        
        return newRow;
      });
  };

  // Extract filter options from data
  const extractFilterOptions = (data) => {
    // For A and B matrices, create entropy range options
    const createEntropyRanges = (entropyKey) => {
      const entropyValues = data.map(row => row[entropyKey]).filter(e => e !== undefined).sort((a, b) => a - b);
      
      if (entropyValues.length === 0) return [];
      
      // round to the nearest 0.5, and remove duplicates
      const roundedValues = [...new Set(entropyValues.map(value => Math.round(value / 0.5) * 0.5))]; 

      // sort the values
      const sortedValues = roundedValues.sort((a, b) => a - b);

      return sortedValues;
    };
    
    return {
      numStates: [...new Set(data.map(row => row.num_states))].sort((a, b) => a - b),
      numObservations: [...new Set(data.map(row => row.num_observations))].sort((a, b) => a - b),
      aCategories: createEntropyRanges('A_entropy'),
      bCategories: createEntropyRanges('B_entropy'),
      piCategories: [...new Set(data.map(row => row.pi_category))]
    };
  };

  // Load and parse data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Read both CSV files using fetch instead of window.fs
        const [expand16StatesResponse, expand64StatesResponse] = await Promise.all([
          fetch('./data/Qwen2.5-7B_16_states.csv'),
          fetch('./data/Qwen2.5-7B_64_states.csv')
        ]);
        
        const expand16StatesContent = await expand16StatesResponse.text();
        const expand64StatesContent = await expand64StatesResponse.text();
        
        // Parse the expand_obs CSV
        Papa.parse(expand16StatesContent, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            const processedData = processCSVData(results);
            set16StatesData(processedData);
            
            // Parse the expand_state CSV
            Papa.parse(expand64StatesContent, {
              header: true,
              dynamicTyping: true,
              complete: (results) => {
                const processedData = processCSVData(results);
                set64StatesData(processedData);
                
                // Set filter options based on the selected dataset
                setFilterOptions(
                  extractFilterOptions(selectedDataset === '16_states' ? processedData : expand64StatesData)
                );
                
                setLoading(false);
              },
              error: (error) => {
                setError(`Error parsing expand_64_states CSV: ${error.message}`);
                setLoading(false);
              }
            });
          },
          error: (error) => {
            setError(`Error parsing expand_16_states CSV: ${error.message}`);
            setLoading(false);
          }
        });
      } catch (error) {
        setError(`Error loading data: ${error.message}`);
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Update filter options when dataset changes
  useEffect(() => {
    if (expand16StatesData.length > 0 && expand64StatesData.length > 0) {
      setFilterOptions(
        extractFilterOptions(selectedDataset === '16_states' ? expand16StatesData : expand64StatesData)
      );
      
      // Log some sample data to debug column names
      const sampleData = selectedDataset === '16_states' ? expand16StatesData[0] : expand64StatesData[0];
      console.log("Sample data columns:", Object.keys(sampleData).filter(key => key.includes('_acc')));
      
      // Reset selected methods to the most important ones for comparison
      setSelectedMethods(['llm_emission', 'random_emission', 'previous_emission', 'p_o_given_prev_h', 'p_o_t_given_prev_all_o']);
    }
  }, [selectedDataset, expand16StatesData, expand64StatesData]);
  
  // Get the current dataset
  const currentData = selectedDataset === '16_states' ? expand16StatesData : expand64StatesData;
  
  // Group entropy categories into ranges for easier filtering
  const groupEntropyCategories = (data) => {
    // Collect all unique entropy values
    const aEntropies = data.map(row => row.A_entropy).filter(e => e !== undefined).sort((a, b) => a - b);
    const bEntropies = data.map(row => row.B_entropy).filter(e => e !== undefined).sort((a, b) => a - b);
    
    // Create entropy ranges (quartiles)
    const createRanges = (values) => {
      if (values.length === 0) return [];
      
      // round to the nearest 0.5, and remove duplicates
      const roundedValues = [...new Set(values.map(value => Math.round(value / 0.5) * 0.5))]; 

      // sort the values
      const sortedValues = roundedValues.sort((a, b) => a - b);

      return sortedValues;
    };
    
    return {
      aRanges: createRanges(aEntropies),
      bRanges: createRanges(bEntropies)
    };
  };
  
  const entropyRanges = groupEntropyCategories(currentData);
  
  // Filter data based on selections
  const filteredData = currentData.filter(row => {
    // Basic filters for states, observations, pi
    const basicFilters = 
      (numStates === 'all' || row.num_states === parseInt(numStates)) &&
      (numObservations === 'all' || row.num_observations === parseInt(numObservations)) &&
      (piCategory === 'all' || row.pi_category === piCategory);
    
    // A entropy filter
    let aFilter = aCategory === 'all';
    if (!aFilter && entropyRanges.aRanges.length > 0) {
      // Find the range that matches the selected category
      const selectedRange = entropyRanges.aRanges.find(range => range === parseFloat(aCategory));
      if (selectedRange) {
        aFilter = row.A_entropy >= selectedRange-0.1 && row.A_entropy <= selectedRange+0.1;
      }
    }
    
    // B entropy filter
    let bFilter = bCategory === 'all';
    if (!bFilter && entropyRanges.bRanges.length > 0) {
      // Find the range that matches the selected category
      const selectedRange = entropyRanges.bRanges.find(range => range === parseFloat(bCategory));
      if (selectedRange) {
        bFilter = row.B_entropy >= selectedRange-0.1 && row.B_entropy <= selectedRange+0.1;
      }
    }
    
    return basicFilters && aFilter && bFilter;
  });
  
  // Prepare chart data
  const prepareChartData = () => {
    if (filteredData.length === 0) return [];
    
    // Average the values for each method and sequence length
    const chartData = seqLengths.map((length, index) => {
      const dataPoint = { name: length };
      
      selectedMethods.forEach(method => {
        // Use proper column naming convention from the CSV
        const columnName = `${method}_${selectedMetric}`;
        
        // Log for debugging
        if (index === 0) {
          console.log(`Looking for column: ${columnName}`);
        }
        
        // Calculate average for this method and sequence length
        const values = filteredData
          .map(row => {
            // Handle string arrays
            if (typeof row[columnName] === 'string' && row[columnName].startsWith('[')) {
              try {
                const arr = JSON.parse(row[columnName].replace(/nan/g, 'null').replace(/inf/g, 'null'));
                return arr[index] !== null ? arr[index] : 0;
              } catch (e) {
                return 0;
              }
            }
            // Handle already parsed arrays
            else if (Array.isArray(row[columnName])) {
              return row[columnName][index] !== null ? row[columnName][index] : 0;
            }
            // Handle scalar values
            else if (typeof row[columnName] === 'number') {
              return row[columnName];
            }
            return 0;
          })
          .filter(val => !isNaN(val) && val !== null);
        
        if (values.length > 0) {
          dataPoint[method] = values.reduce((sum, val) => sum + val, 0) / values.length;
        } else {
          dataPoint[method] = 0;
        }
      });
      
      return dataPoint;
    });
    
    return chartData;
  };
  
  const chartData = prepareChartData();
  
  const getMetricTitle = () => {
    switch(selectedMetric) {
      case 'acc': return 'Accuracy';
      case 'reverse_kl': return 'Reverse KL Divergence';
      case 'forward_kl': return 'Forward KL Divergence';
      case 'hellinger_distance': return 'Hellinger Distance';
      default: return selectedMetric;
    }
  };

  // Toggle method selection
  const toggleMethod = (method) => {
    if (selectedMethods.includes(method)) {
      setSelectedMethods(selectedMethods.filter(m => m !== method));
    } else {
      setSelectedMethods([...selectedMethods, method]);
    }
  };
  
  if (loading) {
    return <div className="loading-message">Loading data...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="container">
      <h1 className="title">Extend HMM Results Visualization II</h1>
      
      <div className="dataset-selector">
        <label className="form-label">Dataset</label>
        <div className="dataset-options">
          <label className="radio-item">
            <input
              type="radio"
              className="form-radio"
              name="dataset"
              value="16_states"
              checked={selectedDataset === '16_states'}
              onChange={() => setSelectedDataset('16_states')}
            />
            <span>16 States</span>
          </label>
          <label className="radio-item">
            <input
              type="radio"
              className="form-radio"
              name="dataset"
              value="64_states"
              checked={selectedDataset === '64_states'}
              onChange={() => setSelectedDataset('64_states')}
            />
            <span>64 States</span>
          </label>
        </div>
      </div>
      
      <div className="filter-section">
        {/* Filter controls */}
        <div className="form-group">
          <label className="form-label">Number of States</label>
          <select 
            className="form-select"
            value={numStates}
            onChange={e => setNumStates(e.target.value)}
          >
            <option value="all">All</option>
            {filterOptions.numStates.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Number of Observations</label>
          <select 
            className="form-select"
            value={numObservations}
            onChange={e => setNumObservations(e.target.value)}
          >
            <option value="all">All</option>
            {filterOptions.numObservations.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">A Matrix Entropy</label>
          <select 
            className="form-select"
            value={aCategory}
            onChange={e => setACategory(e.target.value)}
          >
            <option value="all">All</option>
            {filterOptions.aCategories.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">B Matrix Entropy</label>
          <select 
            className="form-select"
            value={bCategory}
            onChange={e => setBCategory(e.target.value)}
          >
            <option value="all">All</option>
            {filterOptions.bCategories.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Pi Type</label>
          <select 
            className="form-select"
            value={piCategory}
            onChange={e => setPiCategory(e.target.value)}
          >
            <option value="all">All</option>
            {filterOptions.piCategories.map(value => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="metric-selector">
        <label className="form-label">Metric:</label>
        <div className="metric-options">
          {metricTypes.map(metric => (
            <label key={metric} className="radio-item">
              <input
                type="radio"
                className="form-radio"
                name="metric"
                value={metric}
                checked={selectedMetric === metric}
                onChange={() => setSelectedMetric(metric)}
              />
              <span>
                {metric === 'acc' ? 'Accuracy' : 
                 metric === 'reverse_kl' ? 'Reverse KL' : 
                 metric === 'forward_kl' ? 'Forward KL' : 
                 'Hellinger Distance'}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Methods to Display:</label>
        <div className="checkbox-grid">
          {methods.map(method => (
            <label key={method} className="checkbox-item">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={selectedMethods.includes(method)}
                onChange={() => toggleMethod(method)}
              />
              <span>{methodDisplayNames[method] || method}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="info-panel">
        <p>
          <strong>Current Selection:</strong> {selectedDataset === '16_states' ? '16 States' : '64 States'} dataset,
          comparing {getMetricTitle()} for 
          {numStates === 'all' ? ' all state counts' : ` ${numStates} states`}, 
          {numObservations === 'all' ? ' all observation counts' : ` ${numObservations} observations`}, 
          {aCategory === 'all' ? ' all A entropy ranges' : ` A entropy range ${aCategory}`}, 
          {bCategory === 'all' ? ' all B entropy ranges' : ` B entropy range ${bCategory}`}, 
          {piCategory === 'all' ? ' all pi types' : ` ${piCategory} pi vectors`}
        </p>
        <p><strong>Data points:</strong> {filteredData.length}</p>
        
        {filteredData.length > 0 && (
          <div className="stats-item">
            <p><strong>Entropy Statistics:</strong></p>
            <p>
              A Matrix: Avg Entropy = {
                (filteredData.reduce((sum, row) => sum + (row.A_entropy || 0), 0) / filteredData.length).toFixed(2)
              }, Range = {
                Math.min(...filteredData.map(row => row.A_entropy || 0)).toFixed(2)
              } - {
                Math.max(...filteredData.map(row => row.A_entropy || 0)).toFixed(2)
              }
            </p>
            <p>
              B Matrix: Avg Entropy = {
                (filteredData.reduce((sum, row) => sum + (row.B_entropy || 0), 0) / filteredData.length).toFixed(2)
              }, Range = {
                Math.min(...filteredData.map(row => row.B_entropy || 0)).toFixed(2)
              } - {
                Math.max(...filteredData.map(row => row.B_entropy || 0)).toFixed(2)
              }
            </p>
          </div>
        )}
      </div>
      
      {filteredData.length > 0 ? (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: 'Sequence Length', position: 'insideBottomRight', offset: -10 }} 
              />
              <YAxis 
                label={{ 
                  value: getMetricTitle(), 
                  angle: -90, 
                  position: 'insideLeft' 
                }} 
              />
              <Tooltip />
              <Legend />
              {selectedMethods.map((method, index) => (
                <Line
                  key={method}
                  type="monotone"
                  dataKey={method}
                  name={methodDisplayNames[method] || method}
                  strokeWidth={2}
                  stroke={colors[index % colors.length]}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="no-data-message">No data matches the selected filters</div>
      )}
    </div>
  );
};

export default Extend2HMMDashboard;