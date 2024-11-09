
import os
import anthropic
import logging

# Add basic logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def prompt_llm(prompt: str) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.info("ANTHROPIC_API_KEY environment variable not set")
        return ""
    
    try:
        client = anthropic.Anthropic(
            api_key=api_key
        )
        
        response = client.messages.create(   model="claude-3-5-sonnet-20241022",
            max_tokens=2048,
            system="Generate rich descriptions for videos of this tablet record",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text
    except anthropic.APIConnectionError:
        logger.info("Network error when calling Anthropic API")
        return ""
    except anthropic.RateLimitError:
        logger.info("Rate limit exceeded for Anthropic API")
        return ""
    except anthropic.APIStatusError as e:
        logger.info(f"API error from Anthropic: {str(e)}")
        return ""
    except Exception as e:
        logger.info(f"Unexpected error when calling Anthropic API: {str(e)}")
        return ""
    

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        prompt = sys.argv[1]
        response = prompt_llm(prompt)
        print(response)
    else:
        logger.error("No prompt provided as command line argument")