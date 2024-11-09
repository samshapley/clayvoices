import os
import anthropic
import logging
import pandas as pd
from typing import Dict, Any
from typing import Dict, Any, Generator
import sys

# Add basic logging configuration
logging.basicConfig(
    level=logging.WARNING,  # Changed from INFO to WARNING
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Disable httpx logging
logging.getLogger("httpx").setLevel(logging.WARNING)

system = """You are an expert in analyzing artifacts from ancient civilizations. 
You have been asked to provide a compact summary of the artifact based on your expertise and the information provided to you.
Start all responses with "This artifact is" and then continue with your analysis.
"""

def construct_artifact_string(artifact: Dict[str, Any]) -> str:
    """Construct a string representation of the artifact."""
    artifact_str = "# Artifact\n\n"
    for key, value in artifact.items():
        artifact_str += f"## {key}\n\n{value}\n\n"
    return artifact_str

def prompt_llm(prompt: str) -> Generator[str, None, None]:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        return ""
    
    try:
        client = anthropic.Anthropic(
            api_key=api_key
        )
        
        with client.messages.stream(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            system=system,
            messages=[
                {"role": "user", "content": prompt}
            ]
        ) as stream:
            for text in stream.text_stream:
                yield text

    except anthropic.APIConnectionError:
        logger.error("Network error when calling Anthropic API")
    except anthropic.RateLimitError:
        logger.error("Rate limit exceeded for Anthropic API")
    except anthropic.APIStatusError as e:
        logger.error(f"API error from Anthropic: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error when calling Anthropic API: {str(e)}")
    return ""

def analyze_artifact(artifact: Dict[str, Any]) -> str:
    """Analyze a single artifact using the LLM."""
    artifact_str = construct_artifact_string(artifact)
    prompt = f"{artifact_str}"
    return prompt_llm(prompt)

def load_artifact(filepath: str, artifact_id: str) -> pd.DataFrame:
    """Load artifacts from a CSV file, optionally filtering by artifact ID.
    
    Args:
        filepath: Path to the CSV file
        artifact_id: Artifact ID as a string
        
    Returns:
        DataFrame containing the matching artifact(s)
    """
    try:
        # Read CSV with artifact_id as string
        df = pd.read_csv(filepath, dtype={'artifact_id': str})
        
        # Simple string comparison
        filtered_df = df[df['artifact_id'] == str(artifact_id)]
        
        if filtered_df.empty:
            print("No matching artifact found")
        
        return filtered_df
        
    except Exception as e:
        logger.error(f"Error loading artifacts: {str(e)}")
        return pd.DataFrame()

def main():
    if len(sys.argv) != 2:
        print("Error: Please provide an artifact ID")
        sys.exit(1)
        
    artifact_id = sys.argv[1]
    artifacts = load_artifact("limited_artifacts.csv", artifact_id)
    
    if artifacts.empty:
        print(f"No artifact found with ID: {artifact_id}")
        sys.exit(1)

    artifact = artifacts.iloc[0].to_dict()
    for chunk in analyze_artifact(artifact):
        print(chunk, end='', flush=True)

if __name__ == "__main__":
    main()