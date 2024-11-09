import unittest
from unittest.mock import patch, Mock
import pandas as pd
import io
import logging
from cdli_api_scraper import CDLIAPIScraper

class TestCDLIAPIScraper(unittest.TestCase):
    def setUp(self):
        self.scraper = CDLIAPIScraper()
        # Add logging configuration
        logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
        self.logger = logging.getLogger(__name__)

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_metadata(self, mock_get):
        self.logger.info("Running test_get_metadata")
        mock_response = Mock()
        mock_response.json.return_value = {"id": "P000001", "type": "artifact"}
        mock_get.return_value = mock_response

        result = self.scraper.get_metadata("P000001")
        self.assertEqual(result, {"id": "P000001", "type": "artifact"})
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts/P000001",
            params=None,
            headers={"Accept": "application/json"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_linked_data(self, mock_get):
        self.logger.info("Running test_get_linked_data")
        mock_response = Mock()
        mock_response.json.return_value = {"@context": "...", "@id": "..."}
        mock_get.return_value = mock_response

        result = self.scraper.get_linked_data("P000001")
        self.assertEqual(result, {"@context": "...", "@id": "..."})
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts/P000001",
            params=None,
            headers={"Accept": "application/ld+json"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_bibliography(self, mock_get):
        self.logger.info("Running test_get_bibliography")
        mock_response = Mock()
        mock_response.text = "@article{...}"
        mock_get.return_value = mock_response

        result = self.scraper.get_bibliography("P000001")
        self.assertEqual(result, "@article{...}")
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts/P000001/bibliography",
            params=None,
            headers={"Accept": "application/x-bibtex"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_inscription(self, mock_get):
        self.logger.info("Running test_get_inscription")
        mock_response = Mock()
        mock_response.text = "&P000001 = ..."
        mock_get.return_value = mock_response

        result = self.scraper.get_inscription("P000001")
        self.assertEqual(result, "&P000001 = ...")
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts/P000001/inscription",
            params=None,
            headers={"Accept": "text/x-c-atf"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_tabular_export_csv(self, mock_get):
        self.logger.info("Running test_get_tabular_export_csv")
        mock_response = Mock()
        mock_response.text = "id,type\nP000001,artifact"
        mock_get.return_value = mock_response

        result = self.scraper.get_tabular_export(format="csv")
        self.assertIsInstance(result, pd.DataFrame)
        self.assertEqual(result.shape, (1, 2))
        self.assertEqual(result.iloc[0]['id'], 'P000001')
        self.assertEqual(result.iloc[0]['type'], 'artifact')
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts",
            params=None,
            headers={"Accept": "text/csv"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    def test_get_tabular_export_tsv(self, mock_get):
        self.logger.info("Running test_get_tabular_export_tsv")
        mock_response = Mock()
        mock_response.text = "id\ttype\nP000001\tartifact"
        mock_get.return_value = mock_response

        result = self.scraper.get_tabular_export(format="tsv")
        self.assertIsInstance(result, pd.DataFrame)
        self.assertEqual(result.shape, (1, 2))
        self.assertEqual(result.iloc[0]['id'], 'P000001')
        self.assertEqual(result.iloc[0]['type'], 'artifact')
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts",
            params=None,
            headers={"Accept": "text/tab-separated-values"}
        )

    @patch('cdli_api_scraper.requests.Session.get')
    @patch('pandas.read_excel')
    def test_get_tabular_export_xlsx(self, mock_read_excel, mock_get):
        self.logger.info("Running test_get_tabular_export_xlsx")
        mock_response = Mock()
        mock_response.content = b"excel_content"
        mock_get.return_value = mock_response

        mock_df = pd.DataFrame({'id': ['P000001'], 'type': ['artifact']})
        mock_read_excel.return_value = mock_df

        result = self.scraper.get_tabular_export(format="xlsx")
        self.assertIsInstance(result, pd.DataFrame)
        self.assertEqual(result.shape, (1, 2))
        self.assertEqual(result.iloc[0]['id'], 'P000001')
        self.assertEqual(result.iloc[0]['type'], 'artifact')
        mock_get.assert_called_once_with(
            "https://cdli.mpiwg-berlin.mpg.de/artifacts",
            params=None,
            headers={"Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        )
        mock_read_excel.assert_called_once()

if __name__ == '__main__':
    unittest.main()