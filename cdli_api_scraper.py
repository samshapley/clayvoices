import requests
import json
from typing import Dict, List, Any
import pandas as pd
from pathlib import Path
import io
import time
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class CDLIAPIScraper:
    BASE_URL = "https://cdli.mpiwg-berlin.mpg.de"
    
    def __init__(self):
        self.session = requests.Session()
    
    def _make_request(self, endpoint: str, params: Dict[str, Any] = None, headers: Dict[str, str] = None, max_retries: int = 3) -> requests.Response:
        url = f"{self.BASE_URL}{endpoint}"
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, params=params, headers=headers)
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                logging.error(f"Error occurred: {e}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logging.info(f"Retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                else:
                    logging.error("Max retries reached. Giving up.")
                    raise

    def get_metadata(self, artifact_id: str) -> Dict[str, Any]:
        logging.info(f"Attempting to scrape metadata for artifact ID: {artifact_id}")
        endpoint = f"/artifacts/{artifact_id}"
        headers = {"Accept": "application/json"}
        response = self._make_request(endpoint, headers=headers)
        return response.json()

    def get_linked_data(self, artifact_id: str, format: str = "jsonld") -> Dict[str, Any]:
        logging.info(f"Attempting to scrape linked data for artifact ID: {artifact_id}")
        endpoint = f"/artifacts/{artifact_id}"
        formats = {
            "jsonld": "application/ld+json",
            "rdf": "application/rdf+xml",
            "turtle": "text/turtle"
        }
        headers = {"Accept": formats.get(format, formats["jsonld"])}
        response = self._make_request(endpoint, headers=headers)
        return response.json() if format == "jsonld" else response.text

    def get_bibliography(self, artifact_id: str, format: str = "bibtex") -> str:
        logging.info(f"Attempting to scrape bibliography for artifact ID: {artifact_id}")
        endpoint = f"/artifacts/{artifact_id}/bibliography"
        formats = {
            "bibtex": "application/x-bibtex",
            "csl": "application/vnd.citationstyles.csl+json",
            "ris": "application/x-research-info-systems"
        }
        headers = {"Accept": formats.get(format, formats["bibtex"])}
        response = self._make_request(endpoint, headers=headers)
        return response.text

    def get_inscription(self, artifact_id: str, format: str = "atf") -> str:
        logging.info(f"Attempting to scrape inscription for artifact ID: {artifact_id}")
        endpoint = f"/artifacts/{artifact_id}/inscription"
        formats = {
            "atf": "text/x-c-atf",
            "cdli-conll": "text/x-cdli-conll",
            "conll-u": "text/x-conll-u"
        }
        headers = {"Accept": formats.get(format, formats["atf"])}
        response = self._make_request(endpoint, headers=headers)
        return response.text

    def get_tabular_export(self, export_type: str = "artifacts", format: str = "csv") -> pd.DataFrame:
        logging.info(f"Attempting to scrape tabular export for {export_type}")
        endpoint = f"/{export_type}"
        formats = {
            "csv": "text/csv",
            "tsv": "text/tab-separated-values",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        headers = {"Accept": formats.get(format, formats["csv"])}
        response = self._make_request(endpoint, headers=headers)
        
        if format == "xlsx":
            return pd.read_excel(io.BytesIO(response.content))
        elif format == "tsv":
            return pd.read_csv(io.StringIO(response.text), sep="\t")
        else:
            return pd.read_csv(io.StringIO(response.text))

    def get_all_artifacts(self, format: str = "csv") -> pd.DataFrame:
        logging.info("Attempting to scrape all artifacts with pagination")

        endpoint = "/artifacts"
        formats = {
            "csv": "text/csv",
            "tsv": "text/tab-separated-values",
            "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        headers = {"Accept": formats.get(format, formats["csv"])}
        
        all_data = []
        page = 1
        while True:
            try:
                params = {"page": page, "page_size": 1000}
                response = self._make_request(endpoint, params=params, headers=headers)
                
                if format == "xlsx":
                    df = pd.read_excel(io.BytesIO(response.content))
                elif format == "tsv":
                    df = pd.read_csv(io.StringIO(response.text), sep="\t")
                else:
                    df = pd.read_csv(io.StringIO(response.text))
                
                all_data.append(df)
                logging.info(f"Retrieved page {page} with {len(df)} records")
                page += 1
                
            except requests.exceptions.RequestException as e:
                if "404" in str(e):  # We've reached the end of available pages
                    logging.info("Reached the last page of results")
                    break
                else:  # Some other error occurred
                    raise
        
        final_df = pd.concat(all_data, ignore_index=True)
        logging.info(f"Total records retrieved: {len(final_df)}")
        return final_df

def save_to_file(data: Any, filename: str):
    path = Path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    
    if isinstance(data, pd.DataFrame):
        data.to_csv(filename, index=False)
    elif isinstance(data, (dict, list)):
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
    else:
        with open(filename, 'w') as f:
            f.write(str(data))

def main():
    scraper = CDLIAPIScraper()
    
    try:
        # Get and save all artifacts
        all_artifacts = scraper.get_all_artifacts()
        save_to_file(all_artifacts, "all_artifacts.csv")
        logging.info("Successfully retrieved and saved all artifacts")
        
        logging.info("Scraping completed successfully.")
    except Exception as e:
        logging.error(f"An error occurred during scraping: {e}")

if __name__ == "__main__":
    main()
