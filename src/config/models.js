/**
 * Centralized model configurations for HMM visualization
 */

// Available models for multi-model comparison
export const models = [
  { id: 'Qwen2.57B', file: 'Qwen2.5-7B.csv', label: 'Qwen 2.5 (7B)', size: '7B', family: 'qwen' },
  { id: 'Qwen2.53B', file: 'Qwen2.5-3B.csv', label: 'Qwen 2.5 (3B)', size: '3B', family: 'qwen' },
  { id: 'Qwen2.51.5B', file: 'Qwen2.5-1.5B.csv', label: 'Qwen 2.5 (1.5B)', size: '1.5B', family: 'qwen' },
  { id: 'Qwen2.50.5B', file: 'Qwen2.5-0.5B.csv', label: 'Qwen 2.5 (0.5B)', size: '0.5B', family: 'qwen' }
];

// LLM Models configuration
export const llmModels = [
  // Qwen models
  { id: 'llm_qwen_0_5b', displayName: 'Qwen 0.5B', family: 'qwen', size: '0.5B' },
  { id: 'llm_qwen_1_5b', displayName: 'Qwen 1.5B', family: 'qwen', size: '1.5B' },
  { id: 'llm_qwen_3b', displayName: 'Qwen 3B', family: 'qwen', size: '3B' },
  { id: 'llm_qwen_7b', displayName: 'Qwen 7B', family: 'qwen', size: '7B' },

  // Llama models
  { id: 'llm_llama_1b', displayName: 'Llama 1B', family: 'llama', size: '1B' },
  { id: 'llm_llama_3b', displayName: 'Llama 3B', family: 'llama', size: '3B' },
  { id: 'llm_llama_8b', displayName: 'Llama 8B', family: 'llama', size: '8B' }
];

// Baseline models configuration
export const baselineModels = [
  { id: 'random_emission', displayName: 'Random Emission', type: 'random' },
  { id: 'lstm_emission', displayName: 'LSTM Emission', type: 'neural' },
  { id: '1-gram', displayName: '1-gram', type: 'ngram' },
  { id: '2-gram', displayName: '2-gram', type: 'ngram' },
  { id: '3-gram', displayName: '3-gram', type: 'ngram' },
  { id: '4-gram', displayName: '4-gram', type: 'ngram' },
  { id: 'viterbi', displayName: 'Viterbi', type: 'algorithm' },
  { id: 'bw', displayName: 'Baum-Welch', type: 'algorithm' }
];

// Probabilistic models
export const probabilisticModels = [
  { id: 'p_o_given_prev_h', displayName: 'P(O|prev H)', type: 'conditional' },
  { id: 'p_o_t_given_prev_1_o', displayName: 'P(O_t|prev 1 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_2_o', displayName: 'P(O_t|prev 2 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_3_o', displayName: 'P(O_t|prev 3 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_4_o', displayName: 'P(O_t|prev 4 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_5_o', displayName: 'P(O_t|prev 5 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_6_o', displayName: 'P(O_t|prev 6 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_7_o', displayName: 'P(O_t|prev 7 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_8_o', displayName: 'P(O_t|prev 8 O)', type: 'conditional' },
  { id: 'p_o_t_given_prev_all_o', displayName: 'P(O_t|prev all O)', type: 'conditional' }
];

// Combined model list
export const allModels = [...llmModels, ...baselineModels, ...probabilisticModels];

/**
 * Get display name for any model ID
 */
export function getModelDisplayName(modelId) {
  // Check in all model arrays
  const model = allModels.find(m => m.id === modelId);
  if (model) return model.displayName;

  // Fallback: parse LLM model names
  if (modelId.startsWith('llm_')) {
    const parts = modelId.replace('llm_', '').split('_');
    const modelName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

    let sizeStr = '';
    if (parts.length > 1) {
      const sizeNumbers = parts.slice(1).join('.');
      sizeStr = sizeNumbers.replace('b', 'B');
    }

    return `${modelName} ${sizeStr}`;
  }

  // Return original ID if no match found
  return modelId;
}

/**
 * Get models by category
 */
export function getModelsByCategory(category) {
  switch (category) {
    case 'llm':
      return llmModels;
    case 'baseline':
      return baselineModels;
    case 'probabilistic':
      return probabilisticModels;
    case 'all':
      return allModels;
    default:
      return [];
  }
}

/**
 * Check if model is of specific type
 */
export function isModelType(modelId, type) {
  const model = allModels.find(m => m.id === modelId);
  return model ? model.type === type || model.family === type : false;
}