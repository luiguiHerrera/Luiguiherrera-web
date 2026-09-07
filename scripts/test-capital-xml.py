import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('sec_parser', Path(__file__).with_name('fetch-capital-disclosures.py'))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

class FilingParserTests(unittest.TestCase):
    def parse(self, raw, **overrides):
        meta = {'manager_id': 'test', 'CIK': '0000000001', 'quarter_end': '2026-06-30', 'filing_date': '2026-08-14', 'accession_number': '0000000001-26-000001', 'form_type': '13F-HR', 'source_url': 'https://www.sec.gov/Archives/edgar/data/1/000000000126000001/filing.txt', **overrides}
        return parser.parse_filing(raw, meta, {'manager_id': 'test', 'manager_name': 'Test only', 'CIK': '0000000001'})

    def raw(self, amendment='', put_call='', value='1000', count='1', total='1000'):
        return f'''<DOCUMENT><TYPE>13F-HR\n<FILENAME>primary_doc.xml\n<XML>
        <edgarSubmission xmlns="urn:sec:test"><submissionType>{"13F-HR/A" if amendment else "13F-HR"}</submissionType><periodOfReport>06-30-2026</periodOfReport><cik>1</cik><amendmentType>{amendment}</amendmentType><isConfidentialOmitted>false</isConfidentialOmitted><tableEntryTotal>{count}</tableEntryTotal><tableValueTotal>{total}</tableValueTotal></edgarSubmission></XML></DOCUMENT>
        <DOCUMENT><TYPE>INFORMATION TABLE\n<FILENAME>table.xml\n<XML><informationTable xmlns="urn:sec:13f"><infoTable><nameOfIssuer>A &amp; B</nameOfIssuer><titleOfClass>COM</titleOfClass><cusip>123456789</cusip><value>{value}</value><shrsOrPrnAmt><sshPrnamt>100</sshPrnamt><sshPrnamtType>SH</sshPrnamtType></shrsOrPrnAmt><putCall>{put_call}</putCall><investmentDiscretion>SOLE</investmentDiscretion></infoTable></informationTable></XML></DOCUMENT>'''

    def test_namespaces_entities_and_required_fields(self):
        filing = self.parse(self.raw())
        holding = filing['holdings'][0]
        self.assertTrue(filing['complete'])
        self.assertFalse(filing['confidential'])
        self.assertEqual(holding['issuer'], 'A & B')
        self.assertEqual(holding['reported_value'], 1000)
        self.assertEqual(holding['ticker'], None)
        self.assertTrue(holding['source_url'].endswith('/table.xml'))

    def test_dollar_units_and_historical_thousands(self):
        self.assertEqual(self.parse(self.raw(), filing_date='2022-11-14')['holdings'][0]['reported_value'], 1000000)
        self.assertEqual(self.parse(self.raw())['holdings'][0]['reported_value'], 1000)

    def test_amendment_types_and_options(self):
        for amendment, expected in [('RESTATEMENT', 'RESTATEMENT'), ('NEW HOLDINGS', 'NEW_HOLDINGS'), ('OTHER', 'UNKNOWN')]:
            self.assertEqual(self.parse(self.raw(amendment=amendment), form_type='13F-HR/A')['amendment'], expected)
        for option in ['Put', 'Call']:
            self.assertEqual(self.parse(self.raw(put_call=option))['holdings'][0]['put_call'], option.upper())

    def test_incomplete_mismatched_tables_and_identity_fail(self):
        for raw in [self.raw(count='2'), self.raw(total='1001.1'), self.raw().replace('<cik>1</cik>', '<cik>2</cik>'), self.raw().replace('06-30-2026', '03-31-2026'), '<DOCUMENT>missing table</DOCUMENT>']:
            with self.assertRaises(ValueError): self.parse(raw)

    def test_notice_with_reporting_manager_is_not_a_missing_table(self):
        raw = self.raw().split('</DOCUMENT>')[0] + '</DOCUMENT>'
        raw = raw.replace('<submissionType>13F-HR</submissionType>', '<submissionType>13F-NT</submissionType><reportType>13F NOTICE</reportType><otherManagersInfo><otherManager><cik>2026053</cik><name>PERSHING SQUARE INC.</name></otherManager></otherManagersInfo>')
        filing = self.parse(raw, form_type='13F-NT')
        self.assertTrue(filing['complete'])
        self.assertIsNone(filing['table_entry_total'])
        self.assertEqual(filing['reporting_managers'][0]['CIK'], '0002026053')

    def test_cover_form_must_match_submissions(self):
        with self.assertRaises(ValueError): self.parse(self.raw(), form_type='13F-NT')

    def test_dtd_and_entity_declarations_fail(self):
        with self.assertRaises(ValueError): parser.xml_root('<!DOCTYPE root [<!ENTITY ext SYSTEM "file:///etc/passwd">]><root>&ext;</root>')

if __name__ == '__main__': unittest.main()
