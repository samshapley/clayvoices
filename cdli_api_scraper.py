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
    
    artifact_id = "1"
    logging.info(f"Attempting to scrape data for artifact ID: {artifact_id}")
    
    try:
        # Get and save metadata
        metadata = scraper.get_metadata(artifact_id)
        save_to_file(metadata, f"metadata_{artifact_id}.json")
        logging.info(f"Successfully retrieved and saved metadata for {artifact_id}")
        
        # Get and save linked data
        linked_data = scraper.get_linked_data(artifact_id)
        save_to_file(linked_data, f"linked_data_{artifact_id}.json")
        logging.info(f"Successfully retrieved and saved linked data for {artifact_id}")
        
        # Get and save bibliography
        bibliography = scraper.get_bibliography(artifact_id)
        save_to_file(bibliography, f"bibliography_{artifact_id}.bib")
        logging.info(f"Successfully retrieved and saved bibliography for {artifact_id}")
        
        # Get and save inscription
        inscription = scraper.get_inscription(artifact_id)
        save_to_file(inscription, f"inscription_{artifact_id}.atf")
        logging.info(f"Successfully retrieved and saved inscription for {artifact_id}")
        
        # Get and save tabular export
        tabular_export = scraper.get_tabular_export()
        save_to_file(tabular_export, "artifacts_export.csv")
        logging.info("Successfully retrieved and saved tabular export")
        
        logging.info("Scraping completed successfully.")
    except Exception as e:
        logging.error(f"An error occurred during scraping: {e}")

if __name__ == "__main__":
    main()