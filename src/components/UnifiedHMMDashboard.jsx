import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Label
} from 'recharts';
import { useCategoryData } from '../hooks/useCategoryData';
import {
  getCategoryLabels,
  getAvailableModelsForCategory,
  getAvailableMetricsForCategory,
  getSequenceLengthsForCategory
} from '../config/categories';
import {
  parseStringArray,
  isValidNumber,
  safeArrayAccess,
  getUniqueValues
} from '../utils/dataUtils';
import { getModelColor, CHART_COLORS } from '../config/constants';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './UnifiedHMMDashboard.css';

const UnifiedHMMDashboard = () => {
  // Category selection
  const [selectedCategory, setSelectedCategory] = useState('lambda2');
  const [availableCategories] = useState(getCategoryLabels());

  // Load data based on selected category
  const { data, loading, error, availableVariables, category } = useCategoryData(selectedCategory);

  // Filter states
  const [filters, setFilters] = useState({});
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('acc');
  const [comparisonMode, setComparisonMode] = useState('models'); // 'models' or 'metrics'

  // Available options based on current category and data
  const [availableOptions, setAvailableOptions] = useState({});

  // Chart data
  const [chartData, setChartData] = useState([]);

  // Update available options when data or category changes
  useEffect(() => {
    if (!data || data.length === 0 || !availableVariables) return;

    const options = {
      models: getAvailableModelsForCategory(selectedCategory),
      metrics: getAvailableMetricsForCategory(selectedCategory),
      sequenceLengths: getSequenceLengthsForCategory(selectedCategory)
    };

    // Add available variables from the loaded data (sorted)
    if (availableVariables.numStates) {
      options.numStates = [...availableVariables.numStates].sort((a, b) => a - b);
    }
    if (availableVariables.numObservations) {
      options.numObservations = [...availableVariables.numObservations].sort((a, b) => a - b);
    }
    if (availableVariables.aEntropy) {
      options.aEntropy = [...availableVariables.aEntropy]
        .sort((a, b) => a - b)
        .map(val => ({
          value: val,
          label: val < 0.01 ? '0.0' : val < 0.75 ? '0.5' : val < 1.25 ? '1.0' :
                 val < 1.75 ? '1.5' : val < 2.25 ? '2.0' : val < 2.75 ? '2.5' : '3.0'
        }));
    }
    if (availableVariables.bEntropy) {
      options.bEntropy = [...availableVariables.bEntropy]
        .sort((a, b) => a - b)
        .map(val => ({
          value: val,
          label: val < 0.01 ? '0.0' : val < 0.75 ? '0.5' : val < 1.25 ? '1.0' :
                 val < 1.75 ? '1.5' : val < 2.25 ? '2.0' : val < 2.75 ? '2.5' : '3.0'
        }));
    }
    if (availableVariables.lambda2) {
      options.lambda2 = [...availableVariables.lambda2].sort((a, b) => a - b);
    }
    if (availableVariables.sourceFiles) {
      options.sourceFiles = [...availableVariables.sourceFiles].sort();
    }

    setAvailableOptions(options);

    // Initialize default selections
    if (options.models && options.models.length > 0) {
      setSelectedModels(prev => prev.length > 0 ? prev : options.models.slice(0, 3));
    }
    if (options.metrics && options.metrics.length > 0) {
      setSelectedMetric(prev => options.metrics.includes(prev) ? prev : options.metrics[0]);
    }

  }, [data, availableVariables, selectedCategory]);

  // Update available filter options when one filter changes
  const updateFilterOptions = useCallback((changedFilter, changedValue) => {
    if (!data || data.length === 0) return;

    // Create new filter set with the changed value
    const newFilters = { ...filters, [changedFilter]: changedValue };

    // Filter data based on current selections (excluding null/empty values)
    let filteredData = data.filter(row => {
      for (const [key, value] of Object.entries(newFilters)) {
        if (value === null || value === undefined || value === '') continue;

        const rowValue = getRowValue(row, key);
        if (rowValue !== value) return false;
      }
      return true;
    });

    // Update available options for ALL filters based on filtered data
    const newAvailableOptions = { ...availableOptions };

    // Define all possible filter keys that might have available data
    const filterKeys = ['numStates', 'numObservations', 'aEntropy', 'bEntropy', 'lambda2', 'sourceFile'];

    filterKeys.forEach(filterKey => {
      // Get all available values for this filter from the filtered dataset
      const availableValues = getUniqueValues(filteredData, row => getRowValue(row, filterKey))
        .filter(val => val !== null && val !== undefined);

      if (availableValues.length === 0) return;

      if (filterKey === 'numStates' && availableVariables.numStates) {
        newAvailableOptions.numStates = availableValues.sort((a, b) => a - b);
      } else if (filterKey === 'numObservations' && availableVariables.numObservations) {
        newAvailableOptions.numObservations = availableValues.sort((a, b) => a - b);
      } else if (filterKey === 'aEntropy' && availableVariables.aEntropy) {
        newAvailableOptions.aEntropy = availableValues
          .sort((a, b) => a - b)
          .map(val => ({
            value: val,
            label: val < 0.01 ? '0.0' : val < 0.75 ? '0.5' : val < 1.25 ? '1.0' :
                   val < 1.75 ? '1.5' : val < 2.25 ? '2.0' : val < 2.75 ? '2.5' : '3.0'
          }));
      } else if (filterKey === 'bEntropy' && availableVariables.bEntropy) {
        newAvailableOptions.bEntropy = availableValues
          .sort((a, b) => a - b)
          .map(val => ({
            value: val,
            label: val < 0.01 ? '0.0' : val < 0.75 ? '0.5' : val < 1.25 ? '1.0' :
                   val < 1.75 ? '1.5' : val < 2.25 ? '2.0' : val < 2.75 ? '2.5' : '3.0'
          }));
      } else if (filterKey === 'lambda2' && availableVariables.lambda2) {
        newAvailableOptions.lambda2 = availableValues.sort((a, b) => a - b);
      } else if (filterKey === 'sourceFile' && availableVariables.sourceFiles) {
        newAvailableOptions.sourceFiles = availableValues.sort();
      }
    });

    setAvailableOptions(newAvailableOptions);
  }, [data, filters, availableVariables, availableOptions]);

  // Initialize dynamic filtering when data is first loaded (with empty filters)
  useEffect(() => {
    if (!data || data.length === 0 || !availableVariables) return;

    // Initialize with empty filters to show all available options
    updateFilterOptions('init', null);
  }, [data, availableVariables, updateFilterOptions]);

  // Helper function to get row value for different field names
  const getRowValue = (row, filterKey) => {
    switch (filterKey) {
      case 'numStates':
        return row.num_state || row.num_states;
      case 'numObservations':
        return row.num_observation || row.num_observations;
      case 'aEntropy':
        return row.A_entropy;
      case 'bEntropy':
        return row.B_entropy;
      case 'lambda2':
        return row.lambda2;
      case 'sourceFile':
        return row._sourceFile;
      default:
        return row[filterKey];
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }));
    updateFilterOptions(filterKey, value);
  };

  // Process data for visualization
  useEffect(() => {
    if (!data || data.length === 0 || !availableOptions.sequenceLengths) return;

    // Must have selected models to process data
    if (selectedModels.length === 0) {
      return;
    }

    // Filter data based on current filters
    let filteredData = data.filter(row => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === null || value === undefined || value === '') continue;

        const rowValue = getRowValue(row, key);
        if (rowValue !== value) return false;
      }
      return true;
    });

    // If no data after filtering, show empty chart
    if (filteredData.length === 0) {
      setChartData([]);
      return;
    }

    const sequenceLengths = availableOptions.sequenceLengths;
    const processedData = [];

    // Process data for each sequence length
    sequenceLengths.forEach((seqLength, idx) => {
      const dataPoint = { sequenceLength: seqLength };

      if (comparisonMode === 'models') {
        // Compare models for a single metric
        selectedModels.forEach(modelId => {
          const fieldName = `${modelId}_${selectedMetric}`;

          let sum = 0;
          let count = 0;

          filteredData.forEach(row => {
            const value = row[fieldName];
            if (value === undefined) return;

            if (typeof value === 'number' && isValidNumber(value)) {
              sum += value;
              count++;
            } else if (typeof value === 'string') {
              const values = parseStringArray(value);
              if (Array.isArray(values)) {
                const val = safeArrayAccess(values, idx);
                if (val !== null && isValidNumber(val)) {
                  sum += val;
                  count++;
                }
              }
            }
          });

          dataPoint[modelId] = count > 0 ? sum / count : null;
        });
      } else {
        // Compare metrics for a single model
        const modelId = selectedModels[0];
        if (modelId) {
          availableOptions.metrics.forEach(metric => {
            const fieldName = `${modelId}_${metric}`;

            let sum = 0;
            let count = 0;

            filteredData.forEach(row => {
              const value = row[fieldName];
              if (value === undefined) return;

              if (typeof value === 'number' && isValidNumber(value)) {
                sum += value;
                count++;
              } else if (typeof value === 'string') {
                const values = parseStringArray(value);
                if (Array.isArray(values)) {
                  const val = safeArrayAccess(values, idx);
                  if (val !== null && isValidNumber(val)) {
                    sum += val;
                    count++;
                  }
                }
              }
            });

            dataPoint[metric] = count > 0 ? sum / count : null;
          });
        }
      }

      processedData.push(dataPoint);
    });

    setChartData(processedData);
  }, [data, filters, selectedModels, selectedMetric, comparisonMode, availableOptions]);

  // Handle category change
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    setFilters({});
    setSelectedModels([]);
    setSelectedMetric('acc');
    setChartData([]);
    setAvailableOptions({}); // Reset available options
  };

  // Handle model selection
  const handleModelSelection = (modelId) => {
    setSelectedModels(prev => {
      if (comparisonMode === 'metrics') {
        return [modelId]; // Only one model for metric comparison
      } else {
        return prev.includes(modelId)
          ? prev.filter(m => m !== modelId)
          : [...prev, modelId];
      }
    });
  };

  const handleMetricSelection = (metric) => {
    setSelectedMetric(metric);
  };

  const toggleComparisonMode = () => {
    const newMode = comparisonMode === 'models' ? 'metrics' : 'models';
    setComparisonMode(newMode);

    if (newMode === 'metrics') {
      // For metric comparison, select only one model
      setSelectedModels(prev => prev.slice(0, 1));
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        message={`Loading ${category?.label || 'data'}...`}
        size="large"
      />
    );
  }

  if (error) {
    return (
      <ErrorMessage
        error={error}
        title="Failed to Load Data"
        variant="critical"
        showRetry={true}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">HMM Analysis Dashboard</h1>
        <p className="dashboard-subtitle">Unified interface for Hidden Markov Model analysis</p>
      </div>

      {/* Category Selection */}
      <div className="category-section">
        <h2 className="section-title">Research Category</h2>
        <div className="category-grid">
          {availableCategories.map(cat => (
            <button
              key={cat.id}
              className={`category-card ${selectedCategory === cat.id ? 'category-selected' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
            >
              <h3 className="category-title">{cat.label}</h3>
              <p className="category-description">{cat.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Filters */}
      {data.length > 0 && (
        <div className="filters-section">
          <h2 className="section-title">Filter Parameters</h2>
          <div className="filters-grid">
            {/* Render dynamic filter controls based on available options */}
            {availableOptions.numStates && (
              <div className="filter-group">
                <label className="filter-label">Number of States</label>
                <select
                  className="filter-select"
                  value={filters.numStates || ''}
                  onChange={(e) => handleFilterChange('numStates', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">All</option>
                  {availableOptions.numStates.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            {availableOptions.numObservations && (
              <div className="filter-group">
                <label className="filter-label">Number of Observations</label>
                <select
                  className="filter-select"
                  value={filters.numObservations || ''}
                  onChange={(e) => handleFilterChange('numObservations', e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">All</option>
                  {availableOptions.numObservations.map(value => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            {availableOptions.aEntropy && (
              <div className="filter-group">
                <label className="filter-label">A Matrix Entropy</label>
                <select
                  className="filter-select"
                  value={filters.aEntropy || ''}
                  onChange={(e) => handleFilterChange('aEntropy', e.target.value ? parseFloat(e.target.value) : null)}
                >
                  <option value="">All</option>
                  {availableOptions.aEntropy.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {availableOptions.bEntropy && (
              <div className="filter-group">
                <label className="filter-label">B Matrix Entropy</label>
                <select
                  className="filter-select"
                  value={filters.bEntropy || ''}
                  onChange={(e) => handleFilterChange('bEntropy', e.target.value ? parseFloat(e.target.value) : null)}
                >
                  <option value="">All</option>
                  {availableOptions.bEntropy.map(item => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>
            )}

            {availableOptions.lambda2 && (
              <div className="filter-group">
                <label className="filter-label">Lambda2 Value</label>
                <select
                  className="filter-select"
                  value={filters.lambda2 || ''}
                  onChange={(e) => handleFilterChange('lambda2', e.target.value ? parseFloat(e.target.value) : null)}
                >
                  <option value="">All</option>
                  {availableOptions.lambda2.map(value => (
                    <option key={value} value={value}>{value.toFixed(4)}</option>
                  ))}
                </select>
              </div>
            )}
            {availableOptions.sourceFiles && (
              <div className="filter-group">
                <label className="filter-label">Source File</label>
                <select
                  className="filter-select"
                  value={filters.sourceFile || ''}
                  onChange={(e) => handleFilterChange('sourceFile', e.target.value || null)}
                >
                  <option value="">All</option>
                  {availableOptions.sourceFiles.map(file => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comparison Mode and Model/Metric Selection */}
      {data.length > 0 && (
        <div className="selection-section">
          <div className="comparison-mode">
            <h2 className="section-title">Comparison Mode</h2>
            <div className="mode-buttons">
              <button
                className={`mode-button ${comparisonMode === 'models' ? 'active' : ''}`}
                onClick={toggleComparisonMode}
              >
                Compare Models
              </button>
              <button
                className={`mode-button ${comparisonMode === 'metrics' ? 'active' : ''}`}
                onClick={toggleComparisonMode}
              >
                Compare Metrics
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div className="model-selection">
            <h3 className="subsection-title">
              {comparisonMode === 'models' ? 'Select Models to Compare' : 'Select Model'}
            </h3>
            <div className="model-buttons">
              {availableOptions.models && availableOptions.models.slice(0, 12).map(modelId => (
                <button
                  key={modelId}
                  className={`model-button ${selectedModels.includes(modelId) ? 'selected' : ''}`}
                  onClick={() => handleModelSelection(modelId)}
                >
                  {modelId.replace(/_/g, ' ').replace(/llm /g, '').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Selection */}
          <div className="metric-selection">
            <h3 className="subsection-title">Select Metric</h3>
            <div className="metric-buttons">
              {availableOptions.metrics && availableOptions.metrics.map(metric => (
                <button
                  key={metric}
                  className={`metric-button ${selectedMetric === metric ? 'selected' : ''}`}
                  onClick={() => handleMetricSelection(metric)}
                >
                  {metric.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Visualization */}
      {chartData.length > 0 ? (
        <div className="visualization-section">
          <h2 className="section-title">Performance Analysis</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={500}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="sequenceLength"
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => value.toString()}
                >
                  <Label value="Sequence Length" position="insideBottom" offset={-10} />
                </XAxis>
                <YAxis>
                  <Label
                    value={selectedMetric.replace(/_/g, ' ').toUpperCase()}
                    position="insideLeft"
                    angle={-90}
                    style={{ textAnchor: 'middle' }}
                  />
                </YAxis>
                <Tooltip
                  formatter={(value, name) => [
                    value !== null ? value.toFixed(4) : 'N/A',
                    name.replace(/_/g, ' ').toUpperCase()
                  ]}
                />
                <Legend />

                {comparisonMode === 'models' ? (
                  selectedModels.map((modelId, index) => (
                    <Line
                      key={modelId}
                      type="monotone"
                      dataKey={modelId}
                      name={modelId.replace(/_/g, ' ').toUpperCase()}
                      stroke={getModelColor(modelId) || CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  ))
                ) : (
                  availableOptions.metrics && availableOptions.metrics.map((metric, index) => (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      name={metric.replace(/_/g, ' ').toUpperCase()}
                      stroke={CHART_COLORS[index % CHART_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls={false}
                    />
                  ))
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        data.length > 0 && selectedModels.length > 0 && (
          <ErrorMessage
            error="No data available with the current filter configuration. Please adjust your filters."
            title="No Data Found"
            variant="warning"
            showRetry={false}
          />
        )
      )}

      {/* Status Information */}
      {data.length > 0 && (
        <div className="status-section">
          <div className="status-info">
            <p><strong>Category:</strong> {category?.label}</p>
            <p><strong>Loaded Records:</strong> {data.length.toLocaleString()}</p>
            <p><strong>Available Models:</strong> {availableOptions.models?.length || 0}</p>
            <p><strong>Current Filters:</strong> {
              Object.entries(filters).filter(([k, v]) => v !== null && v !== undefined && v !== '').length
            } active</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedHMMDashboard;