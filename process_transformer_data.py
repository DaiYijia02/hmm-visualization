import pandas as pd
import json
import numpy as np

# Read the CSV file
df = pd.read_csv('public/data/trained/transformer_11111_4_entropy_64.csv')

# Metric columns to process
metric_cols = [
    'transformer_emission_acc',
    'transformer_emission_prob',
    'transformer_emission_reverse_kl',
    'transformer_emission_forward_kl',
    'transformer_emission_hellinger_distance'
]

# Process each row
for idx, row in df.iterrows():
    for col in metric_cols:
        value = row[col]

        # Parse the string representation of nested array
        try:
            # Handle string representation of nested lists
            if isinstance(value, str) and value.startswith('[['):
                # Parse the nested array
                nested_array = json.loads(value.replace("'", '"'))

                # Check if it's a 2D array
                if isinstance(nested_array, list) and len(nested_array) > 0 and isinstance(nested_array[0], list):
                    # It's a 2D array - average across runs (axis 0)
                    arr = np.array(nested_array)

                    # Handle inf and nan values
                    if col in ['transformer_emission_reverse_kl', 'transformer_emission_forward_kl']:
                        # For KL divergence, inf and nan are common - skip averaging
                        averaged = nested_array[0]  # Just take first run
                    else:
                        # Average across runs
                        averaged = np.nanmean(arr, axis=0).tolist()

                    # Update the dataframe with the 1D array
                    df.at[idx, col] = json.dumps(averaged)
                    print(f"Row {idx}, {col}: Averaged {len(nested_array)} runs into {len(averaged)} values")
        except Exception as e:
            print(f"Error processing row {idx}, column {col}: {e}")
            continue

# Save the processed data
output_file = 'public/data/trained/transformer_11111_4_entropy_64.csv'
df.to_csv(output_file, index=False)
print(f"\nProcessed data saved to {output_file}")
print(f"Total rows: {len(df)}")