"""Independent reconstruction from retained SEC XML, without importing the parser.
Checks the production snapshot and recorded manual samples. No network or writes.
"""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
import gzip, hashlib, json, re, xml.etree.ElementTree as ET
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'lib/trends/capital'
snapshot = json.loads(gzip.decompress((DATA / 'generated/snapshot.json.gz').read_bytes()))
evidence = json.loads(gzip.decompress((DATA / 'generated/sec-evidence.json.gz').read_bytes()))
manual = json.loads((ROOT / 'docs/trends/pilot-validation.json').read_text())
filings = {}
for url, response in evidence['responses'].items():
    assert hashlib.sha256(response['body'].encode()).hexdigest() == response['sha256'], url
    if not url.endswith('.txt'):
        continue
    roots = [ET.fromstring(xml.strip()) for xml in re.findall(r'<XML>(.*?)</XML>', response['body'], re.S)]
    for root in roots:
        for element in root.iter(): element.tag = element.tag.split('}')[-1]
    cover = next(root for root in roots if root.tag == 'edgarSubmission')
    form = cover.findtext('./headerData/submissionType')
    if form.startswith('13F-NT'):
        continue
    rows = [row for root in roots if root.tag == 'informationTable' for row in root.findall('infoTable')]
    assert len(rows) == int(cover.findtext('.//tableEntryTotal')), url
    assert abs(sum(Decimal(row.findtext('value')) for row in rows) - Decimal(cover.findtext('.//tableValueTotal'))) <= len(rows), url
    positions = defaultdict(Decimal)
    for row in rows:
        key = '|'.join([row.findtext('cusip').upper(), (row.findtext('putCall') or 'LONG').upper(), row.findtext('./shrsOrPrnAmt/sshPrnamtType')])
        positions[key] += Decimal(row.findtext('./shrsOrPrnAmt/sshPrnamt'))
    filings[url] = dict(positions)
expected = {m['manager_id'] for m in snapshot['universe']['managers'] if m['filing_expected']}
current_holders = defaultdict(set)
verified_managers = 0
for quarter in snapshot['current']:
    if quarter['manager_id'] not in expected or quarter['status'] != 'available':
        continue
    # Current eligible sample has original HR filings only; amended First Eagle
    # is withheld. This deliberately avoids reusing the production selector.
    documents = quarter['filings']
    assert len(documents) == 1 and documents[0]['form_type'] == '13F-HR'
    positions = filings[documents[0]['source_url']]
    derived = {f"{p['CUSIP']}|{p['put_call'] or 'LONG'}|{p['share_type']}": Decimal(str(p['shares'])) for p in quarter['positions']}
    assert positions == derived, quarter['manager_id']
    for key in positions: current_holders[key].add(quarter['manager_id'])
    verified_managers += 1
assert verified_managers == snapshot['coverage']['eligible_disclosed_managers']
for company in snapshot['companies']:
    holders = current_holders[company['id']]
    assert set(company['manager_ids']) == holders
    assert company['managers'] == len(holders)
    assert company['eligible_disclosed_managers'] == verified_managers
    assert abs(company['percent_disclosed'] - len(holders) / verified_managers * 100) < 1e-10
for case in manual['manual_checks']:
    for value in case['values']:
        assert filings[value['filing_url']][case['CUSIP'] + '|LONG|SH'] == Decimal(value['shares'])
for movement in snapshot['movements']:
    if movement['confidence'] != 'REVIEWED': continue
    old = sum(filings[url].get(movement['security_key'],Decimal(0)) for url in movement['previous_sources'])
    new = sum(filings[url].get(movement['security_key'],Decimal(0)) for url in movement['current_sources'])
    assert old == Decimal(movement['previous_shares']) and new == Decimal(movement['current_shares'])
    assert new-old == Decimal(movement['raw_delta'])
    assert old * Decimal(movement['corporate_action_adjustment']['share_factor']) == Decimal(movement['normalized_previous_shares'])
print(json.dumps({'state':'PASS','independently_reconstructed_managers':verified_managers,'reconstructed_security_rows':len(snapshot['companies']),'manual_securities':len(manual['manual_checks']),'reviewed_movements':sum(m['confidence']=='REVIEWED' for m in snapshot['movements'])}))
