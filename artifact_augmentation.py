import os
import anthropic
import logging
import pandas as pd
from typing import Dict, Any

# Add basic logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

system = """You are an expert in analyzing artifacts from ancient civilizations. 
You have been asked to provide a compact summary of the artifact based on your expertise and the information provided to you.
Start all responses with "This artifact is" and then continue with your analysis.
"""


def load_artifacts(filepath: str, limit: int = 1) -> pd.DataFrame:
    """Load artifacts from a CSV file."""
    try:
        df = pd.read_csv(filepath, nrows=limit)
        return df
    except Exception as e:
        logger.error(f"Error loading artifacts: {str(e)}")
        return pd.DataFrame()

def construct_artifact_string(artifact: Dict[str, Any]) -> str:
    """Construct a string representation of the artifact."""
    artifact_str = "# Artifact\n\n"
    for key, value in artifact.items():
        artifact_str += f"## {key}\n\n{value}\n\n"
    return artifact_str

def prompt_llm(prompt: str) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY environment variable not set")
        return ""
    
    try:
        client = anthropic.Anthropic(
            api_key=api_key
        )
        
        response = client.messages.create(
  model="claude-3-sonnet-20240229",
            max_tokens=2048,
            system=system,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
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

def main():

    # Load artifacts
    artifacts = load_artifacts("limited_artifacts.csv", limit=1)
    
    if artifacts.empty:
        logger.error("No artifacts loaded. Exiting.")
        return

    # Process the first artifact
    first_artifact = artifacts.iloc[0].to_dict()
    summary = analyze_artifact(first_artifact)
    
    print("Artifact Summary:")
    print(summary)

if __name__ == "__main__":
    main()
