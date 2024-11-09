import pandas as pd

def load_limited_artifacts(file_path='limited_artifacts.csv', limit=100):
    """
    Load the first 100 rows from the artifacts CSV file
    """
    try:
        # Read the CSV file and limit to first 100 rows
        df = pd.read_csv(file_path, nrows=limit)
        
        # Save the limited dataset to a new CSV file
        output_file = 'limited_artifacts.csv'
        df.to_csv(output_file, index=False)
        print(f"Successfully created {output_file} with {len(df)} rows")
        return df
        
    except FileNotFoundError:
        print(f"Error: Could not find {file_path}")
        return None
    except Exception as e:
        print(f"Error loading file: {str(e)}")
        return None

if __name__ == "__main__":
    # Load and limit the artifacts
    artifacts_df = load_limited_artifacts()
    
    # Display basic information about the loaded data
    if artifacts_df is not None:
        print("\nDataset Info:")
        print(f"Number of rows: {len(artifacts_df)}")
        print(f"Columns: {list(artifacts_df.columns)}")