/**
 * Category-based data configuration system
 * Each category maps to specific data sources and available variables
 */

export const DATA_CATEGORIES = {
  lambda2: {
    id: 'lambda2',
    label: 'Lambda2 Analysis',
    description: 'Second eigenvalue analysis for mixing time studies',
    dataSources: [
      {
        type: 'single_file',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/paper/lambda2_results.csv',
        publicPath: './data/paper/paper/lambda2_results.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      // LLM Models
      'llm_qwen_1_5b', 'llm_qwen_0_5b', 'llm_qwen_3b', 'llm_qwen_7b',
      'llm_llama_1b', 'llm_llama_3b', 'llm_llama_8b',
      // Baseline Models
      'random_emission', '1-gram', '2-gram', '3-gram', '4-gram',
      // Probabilistic Models
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_all_o',
      // Algorithm Models
      'viterbi', 'bw', 'lstm_emission'
    ],
    specialFields: ['lambda2', 'steady_state', 'U', 'Sigma', 'U_inv', 'A_entropy', 'B_entropy'],
    sequenceLengths: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
  },

  entropy: {
    id: 'entropy',
    label: 'Entropy Analysis',
    description: 'Matrix entropy analysis for transition and emission matrices',
    dataSources: [
      {
        type: 'single_file',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/entropy_results.csv',
        publicPath: './data/paper/entropy_results.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      'llm_qwen_1_5b', 'llm_qwen_0_5b', 'llm_qwen_3b', 'llm_qwen_7b',
      'llm_llama_1b', 'llm_llama_3b', 'llm_llama_8b',
      'random_emission', '1-gram', '2-gram', '3-gram', '4-gram',
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_all_o',
      'viterbi', 'bw', 'lstm_emission'
    ],
    specialFields: ['A_entropy', 'B_entropy', 'lambda2', 'steady_state'],
    sequenceLengths: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
  },

  steady_state: {
    id: 'steady_state',
    label: 'Steady State Analysis',
    description: 'Equilibrium distribution analysis',
    dataSources: [
      {
        type: 'single_file',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/steady_state_results.csv',
        publicPath: './data/paper/steady_state_results.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      'llm_qwen_1_5b', 'llm_qwen_0_5b', 'llm_qwen_3b', 'llm_qwen_7b',
      'llm_llama_1b', 'llm_llama_3b', 'llm_llama_8b',
      'random_emission', '1-gram', '2-gram', '3-gram', '4-gram',
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_all_o',
      'viterbi', 'bw', 'lstm_emission'
    ],
    specialFields: ['steady_state', 'lambda2', 'A_entropy', 'B_entropy'],
    sequenceLengths: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
  },

  llm_tokenization: {
    id: 'llm_tokenization',
    label: 'LLM Tokenization',
    description: 'LLM tokenization analysis with 4-state 4-emission configuration',
    dataSources: [
      {
        type: 'single_file',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/Qwen2.5-1.5B_11111_4096_4_state_4_emission_LLM_tokenization_2048.csv',
        publicPath: './data/paper/Qwen2.5-1.5B_11111_4096_4_state_4_emission_LLM_tokenization_2048.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      // Based on tokenization data, likely contains different model variants
      'llm_qwen_1_5b', 'random_emission', 'previous_emission',
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_5_o',
      'p_o_t_given_prev_6_o', 'p_o_t_given_prev_7_o', 'p_o_t_given_prev_8_o',
      'p_o_t_given_prev_all_o'
    ],
    fixedParameters: {
      num_states: 4,
      num_observations: 4
    },
    sequenceLengths: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048]
  },

  large_state: {
    id: 'large_state',
    label: 'Large State Analysis',
    description: 'Analysis with large state spaces (early experiments without lambda2/BW)',
    dataSources: [
      {
        type: 'directory',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/early_nolambda_nobw',
        publicPath: './data/paper/early_nolambda_nobw',
        pattern: '*.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      // These files seem to contain LLM models without lambda2/BW analysis
      'llm_emission', 'random_emission', 'previous_emission',
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_5_o',
      'p_o_t_given_prev_6_o', 'p_o_t_given_prev_7_o', 'p_o_t_given_prev_8_o',
      'p_o_t_given_prev_all_o'
    ],
    excludedModels: ['viterbi', 'bw'], // Based on "nolambda_nobw" naming
    sequenceLengths: [8, 16, 32, 64, 128, 256, 512, 1024], // Assuming 8 lengths based on pattern
    specialFeatures: ['expanded_states', 'expanded_observations']
  },

  two_states: {
    id: 'two_states',
    label: '2-State Analysis',
    description: 'Analysis with 2-emission configurations',
    dataSources: [
      {
        type: 'directory',
        path: '/Users/daiyijia/Desktop/websites/hmm-visualization/public/data/early_2_emissions',
        publicPath: './data/early_2_emissions',
        pattern: '*.csv'
      }
    ],
    primaryMetrics: ['acc', 'hellinger_distance', 'reverse_kl', 'forward_kl'],
    availableModels: [
      'llm_qwen_1_5b', 'llm_qwen_0_5b',
      'llm_llama_1b', 'llm_llama_3b', 'llm_llama_8b',
      'random_emission', '1-gram', '2-gram', '3-gram', '4-gram',
      'p_o_given_prev_h', 'p_o_t_given_prev_1_o', 'p_o_t_given_prev_2_o',
      'p_o_t_given_prev_3_o', 'p_o_t_given_prev_4_o', 'p_o_t_given_prev_all_o',
      'viterbi', 'bw', 'lstm_emission'
    ],
    fixedParameters: {
      num_observations: 2 // Based on "2_emissions" naming
    },
    sequenceLengths: [4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048],
    specialFeatures: ['multi_model_variants'] // Files contain different model sizes
  }
};

// Helper functions for category management
export function getCategoryById(categoryId) {
  return DATA_CATEGORIES[categoryId];
}

export function getAllCategories() {
  return Object.values(DATA_CATEGORIES);
}

export function getCategoryLabels() {
  return Object.values(DATA_CATEGORIES).map(cat => ({
    id: cat.id,
    label: cat.label,
    description: cat.description
  }));
}

// Get available models for a specific category
export function getAvailableModelsForCategory(categoryId) {
  const category = getCategoryById(categoryId);
  if (!category) return [];

  // Filter out excluded models if any
  let models = category.availableModels;
  if (category.excludedModels) {
    models = models.filter(model => !category.excludedModels.includes(model));
  }

  return models;
}

// Get data sources for a category
export function getDataSourcesForCategory(categoryId) {
  const category = getCategoryById(categoryId);
  return category ? category.dataSources : [];
}

// Check if a category has fixed parameters
export function getCategoryConstraints(categoryId) {
  const category = getCategoryById(categoryId);
  return category ? category.fixedParameters || {} : {};
}

// Get available metrics for a category
export function getAvailableMetricsForCategory(categoryId) {
  const category = getCategoryById(categoryId);
  return category ? category.primaryMetrics : ['acc', 'hellinger_distance'];
}

// Get sequence lengths for a category
export function getSequenceLengthsForCategory(categoryId) {
  const category = getCategoryById(categoryId);
  return category ? category.sequenceLengths : [8, 16, 32, 64, 128, 256, 512, 1024];
}