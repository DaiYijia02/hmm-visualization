/**
 * Centralized constants for HMM visualization
 */

// Sequence lengths used across visualizations
export const SEQUENCE_LENGTHS = [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

// Alternative sequence lengths for some visualizations
export const ALT_SEQUENCE_LENGTHS = [8, 16, 32, 64, 128, 256, 512, 1024];

// Metric types for model evaluation
export const METRIC_TYPES = [
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
export const METRIC_MEASURES = [
  { id: 'acc', label: 'Accuracy' },
  { id: 'reverse_kl', label: 'Reverse KL Divergence' },
  { id: 'forward_kl', label: 'Forward KL Divergence' },
  { id: 'hellinger_distance', label: 'Hellinger Distance' }
];

// Available metrics for different visualizations
export const AVAILABLE_METRICS = ['acc', 'hellinger_distance'];

// Color palettes for charts
export const MODEL_COLORS = {
  // Qwen models - shades of pink/magenta
  'Qwen2.57B': '#1f77b4',  // blue
  'Qwen2.53B': '#ff7f0e',  // orange
  'Qwen2.51.5B': '#2ca02c', // green
  'Qwen2.50.5B': '#d62728',  // red

  // LLM Qwen models
  'llm_qwen_0_5b': '#f687b3',
  'llm_qwen_1_5b': '#d53f8c',
  'llm_qwen_3b': '#b83280',
  'llm_qwen_7b': '#97266d',

  // LLM Llama models - shades of purple
  'llm_llama_1b': '#9f7aea',
  'llm_llama_3b': '#805ad5',
  'llm_llama_8b': '#6b46c1'
};

export const BASELINE_COLORS = {
  'random_emission': '#e53e3e',
  '1-gram': '#38a169',
  '2-gram': '#2f855a',
  '3-gram': '#276749',
  '4-gram': '#22543d'
};

export const OTHER_COLORS = {
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

// General chart colors for when specific model colors aren't available
export const CHART_COLORS = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#aec7e8", "#ffbb78", "#98df8a"
];

/**
 * Get color for a specific model
 */
export function getModelColor(modelId) {
  return MODEL_COLORS[modelId] ||
         BASELINE_COLORS[modelId] ||
         OTHER_COLORS[modelId] ||
         '#718096'; // default gray
}

// Data file paths
export const DATA_FILES = {
  MULTI_MODEL: {
    'Qwen2.57B': 'Qwen2.5-7B.csv',
    'Qwen2.53B': 'Qwen2.5-3B.csv',
    'Qwen2.51.5B': 'Qwen2.5-1.5B.csv',
    'Qwen2.50.5B': 'Qwen2.5-0.5B.csv'
  },
  LAMBDA2: 'lambda2_results.csv',
  ENTROPY: 'entropy_results.csv',
  STEADY_STATE: 'steady_state_results.csv',
  EXTEND: 'extend_results.csv',
  EXTEND2: 'extend2_results.csv',
  HMM_320: '320-Qwen2.5-1.5B.csv',
  HMM_327: '327-matrix.csv'
};

// Default parameter ranges
export const PARAMETER_RANGES = {
  NUM_STATES: [2, 3, 4, 5, 6, 8, 10],
  NUM_OBSERVATIONS: [2, 3, 4, 5, 6, 8, 10],
  ENTROPY_CATEGORIES: ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0"],
  PI_TYPES: ["deterministic", "uniform"]
};

// Chart configuration
export const CHART_CONFIG = {
  MARGIN: { top: 5, right: 30, left: 20, bottom: 30 },
  DOT_RADIUS: 4,
  ACTIVE_DOT_RADIUS: 8,
  STROKE_WIDTH: 2,
  TOOLTIP_PRECISION: 4
};

// Loading and error messages
export const MESSAGES = {
  LOADING: 'Loading data...',
  LOADING_MULTI: 'Loading data from multiple models...',
  NO_DATA: 'No data available with the current filters',
  ERROR_PREFIX: 'Error loading data: ',
  ERROR_PARSING: 'Error parsing CSV data: '
};