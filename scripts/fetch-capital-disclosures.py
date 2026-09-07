"""Capture public SEC evidence and parse 13F XML; standard library only.
Network is opt-in. 403/429 stop archive requests; missing tables stay unavailable.
"""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'lib/trends/capital'
OUTPUT = DATA / 'generated'


def xml_root(text):
    if '<!DOCTYPE' in text.upper() or '<!ENTITY' in text.upper():
        raise ValueError('DTD/entity declarations are not accepted')
    root = ET.fromstring(text)
    for item in root.iter():
        item.tag = item.tag.split('}')[-1]
    return root


def text_of(root, key, default=None):
    node = root.find('.//' + key)
    return node.text.strip() if node is not None and node.text else default


def parse_filing(raw, meta, manager):
    documents = re.findall(r'<DOCUMENT>(.*?)</DOCUMENT>', raw, re.S | re.I)
    cover, tables = None, []
    for document in documents:
        xml = re.search(r'<XML>\s*(.*?)\s*</XML>', document, re.S | re.I)
        filename = re.search(r'<FILENAME>([^\r\n]+)', document, re.I)
        if not xml:
            continue
        root = xml_root(xml.group(1))
        if root.tag == 'edgarSubmission':
            cover = root
        elif root.tag == 'informationTable':
            tables.append((root, filename.group(1).strip() if filename else None))
    if cover is None:
        raise ValueError('Missing cover')
    period = text_of(cover, 'periodOfReport')
    if period != meta['quarter_end']:
        try:
            period = dt.datetime.strptime(period, '%m-%d-%Y').date().isoformat()
        except (ValueError, TypeError):
            raise ValueError('Unrecognized report period')
    if period != meta['quarter_end']:
        raise ValueError('Cover period differs from submissions period')
    cik = (cover.findtext('./headerData/filerInfo/filer/credentials/cik') or cover.findtext('./cik') or '').strip().zfill(10)
    if cik != manager['CIK']:
        raise ValueError('Cover CIK differs from universe')
    if text_of(cover, 'submissionType') != meta['form_type']:
        raise ValueError('Cover form differs from submissions form')
    def manager_refs(xpath):
        return [{'CIK': text_of(node, 'cik').zfill(10) if text_of(node, 'cik') else None, 'name': text_of(node, 'name', ''), 'sequence_number': text_of(node, 'sequenceNumber'), 'file_number': text_of(node, 'form13FFileNumber')} for node in cover.findall(xpath)]
    provenance = {'report_type': text_of(cover, 'reportType', ''), 'reporting_managers': manager_refs('.//otherManagersInfo/otherManager'), 'included_managers': manager_refs('.//otherManagers2Info/otherManager2'), 'additional_information': text_of(cover, 'additionalInformation', ''), 'legal_name': text_of(cover, 'filingManager/name', '')}
    amendment_text = text_of(cover, 'amendmentType', '').upper()
    amendment = 'NONE' if not meta['form_type'].endswith('/A') else {'RESTATEMENT': 'RESTATEMENT', 'NEW HOLDINGS': 'NEW_HOLDINGS'}.get(amendment_text, 'UNKNOWN')
    if meta['form_type'].startswith('13F-NT'):
        if tables or provenance['report_type'] != '13F NOTICE':
            raise ValueError('Invalid notice structure')
        return {**meta, **provenance, 'amendment': amendment, 'confidential': None, 'complete': True, 'holdings': [], 'table_entry_total': None, 'table_value_total': None}
    if not tables:
        raise ValueError('Missing information table')
    confidential = text_of(cover, 'isConfidentialOmitted')
    confidential = False if confidential in ('false', '0') else True if confidential in ('true', '1') else None
    holdings = []
    for table, filename in tables:
        for info in table.findall('infoTable'):
            put_call = text_of(info, 'putCall')
            shares = float(text_of(info, 'shrsOrPrnAmt/sshPrnamt', 'nan'))
            value = float(text_of(info, 'value', 'nan'))
            # SEC changed reported value from thousands to dollars on 2023-01-03.
            if meta['filing_date'] < '2023-01-03':
                value *= 1000
            holdings.append({
                'manager_id': manager['manager_id'], 'manager_name': manager.get('legal_name', manager.get('manager_name')), 'CIK': manager['CIK'],
                'quarter_end': meta['quarter_end'], 'filing_date': meta['filing_date'], 'accession_number': meta['accession_number'], 'form_type': meta['form_type'],
                'issuer': text_of(info, 'nameOfIssuer', ''), 'ticker': None, 'CUSIP': text_of(info, 'cusip', '').upper(),
                'security_class': text_of(info, 'titleOfClass', ''), 'shares': shares,
                'share_type': text_of(info, 'shrsOrPrnAmt/sshPrnamtType'), 'reported_value': value, 'value_unit': 'USD',
                'put_call': put_call.upper() if put_call else None, 'investment_discretion': text_of(info, 'investmentDiscretion', ''),
                'other_manager': text_of(info, 'otherManager', ''),
                'source_url': meta['source_url'].rsplit('/', 1)[0] + '/' + filename if filename else meta['source_url'],
            })
    count = int(text_of(cover, 'tableEntryTotal', '-1'))
    total = float(text_of(cover, 'tableValueTotal', 'nan'))
    if meta['filing_date'] < '2023-01-03':
        total *= 1000
    if count != len(holdings) or abs(total - sum(h['reported_value'] for h in holdings)) > max(1, count):
        raise ValueError('Information table does not reconcile to cover totals')
    return {**meta, **provenance, 'amendment': amendment, 'confidential': confidential, 'complete': True, 'holdings': holdings, 'table_entry_total': count, 'table_value_total': total}


def run(fetch=False, universe_path=None, output_path=None):
    output = Path(output_path) if output_path else OUTPUT
    output.mkdir(parents=True, exist_ok=True)
    evidence_path = output / 'sec-evidence.json.gz'
    universe = json.loads(Path(universe_path or DATA / 'universe.json').read_text())
    config = json.loads((DATA / 'config.json').read_text())
    quarters = {config['quarter_end'], config['previous_quarter_end']}
    if fetch:
        evidence = {'as_of': dt.datetime.now(dt.timezone.utc).isoformat(), 'responses': {}, 'errors': []}
        archive_blocked = False
        user_agent = os.environ.get('SEC_USER_AGENT', 'LHI Trends research (https://www.luiguiherrera.com)')
        def get(url):
            nonlocal archive_blocked
            if '/Archives/' in url and archive_blocked:
                raise RuntimeError('Archive access stopped after SEC 403/429')
            time.sleep(0.15)
            try:
                request = urllib.request.Request(url, headers={'User-Agent': user_agent, 'Accept-Encoding': 'identity'})
                with urllib.request.urlopen(request, timeout=25) as response:
                    raw = response.read().decode('utf-8')
                evidence['responses'][url] = {'sha256': hashlib.sha256(raw.encode()).hexdigest(), 'body': raw, 'retrieved_at': dt.datetime.now(dt.timezone.utc).isoformat()}
                return raw
            except urllib.error.HTTPError as error:
                if error.code in (403, 429) and '/Archives/' in url:
                    archive_blocked = True
                evidence['errors'].append({'url': url, 'error': f'HTTP {error.code}'})
                raise
        for manager in universe['managers']:
            if manager['status'] in ('EXCLUDED', 'RETIRED', 'inactive'):
                continue
            try:
                submissions = json.loads(get(manager['source_url']))
                recent = submissions['filings']['recent']
                # Follow SEC's published historical files only when the requested
                # comparison predates the recent list. Never guess archive URLs.
                if not quarters.issubset({recent['reportDate'][i] for i, form in enumerate(recent['form']) if form.startswith('13F')}):
                    for archive in submissions['filings'].get('files', []):
                        if archive['filingTo'] >= min(quarters):
                            historical = json.loads(get('https://data.sec.gov/submissions/' + archive['name']))
                            for key in recent:
                                recent[key].extend(historical.get(key, []))
                for i, form in enumerate(recent['form']):
                    if form in ('13F-HR', '13F-HR/A', '13F-NT', '13F-NT/A') and recent['reportDate'][i] in quarters:
                        accession = recent['accessionNumber'][i]
                        url = f"https://www.sec.gov/Archives/edgar/data/{int(manager['CIK'])}/{accession.replace('-', '')}/{accession}.txt"
                        try:
                            get(url)
                        except Exception as error:
                            evidence['errors'].append({'url': url, 'error': str(error)})
            except Exception as error:
                evidence['errors'].append({'url': manager['source_url'], 'error': str(error)})
        evidence_path.write_bytes(gzip.compress(json.dumps(evidence, sort_keys=True).encode(), mtime=0))
    else:
        evidence = json.loads(gzip.decompress(evidence_path.read_bytes()))
    for response in evidence["responses"].values():
        if hashlib.sha256(response["body"].encode()).hexdigest() != response["sha256"]:
            raise ValueError("Evidence hash mismatch")
    filings, lookup_succeeded, identities = [], [], []
    for manager in universe['managers']:
        entry = evidence['responses'].get(manager['source_url'])
        if not entry:
            continue
        submissions = json.loads(entry['body'])
        if str(submissions['cik']).zfill(10) != manager['CIK']:
            raise ValueError('Submissions identity differs from registry')
        recent = submissions['filings']['recent']
        for archive in submissions['filings'].get('files', []):
            archived = evidence['responses'].get('https://data.sec.gov/submissions/' + archive['name'])
            if archived:
                for key, values in json.loads(archived['body']).items():
                    recent.setdefault(key, []).extend(values)
        lookup_succeeded.append(manager['manager_id'])
        history = sorted({recent['reportDate'][i] for i, form in enumerate(recent['form']) if form.startswith('13F') and recent['reportDate'][i]})
        identities.append({'manager_id': manager['manager_id'], 'CIK': manager['CIK'], 'legal_name': submissions['name'], 'history_quarters': len(history), 'latest_quarter': history[-1] if history else None, 'source_url': manager['source_url']})
        for i, form in enumerate(recent['form']):
            if form not in ('13F-HR', '13F-HR/A', '13F-NT', '13F-NT/A') or recent['reportDate'][i] not in quarters:
                continue
            accession = recent['accessionNumber'][i]
            url = f"https://www.sec.gov/Archives/edgar/data/{int(manager['CIK'])}/{accession.replace('-', '')}/{accession}.txt"
            meta = {'manager_id': manager['manager_id'], 'CIK': manager['CIK'], 'quarter_end': recent['reportDate'][i], 'filing_date': recent['filingDate'][i], 'accession_number': accession, 'form_type': form, 'source_url': url}
            filing = {**meta, 'amendment': 'UNKNOWN' if form.endswith('/A') else 'NONE', 'confidential': None, 'complete': False, 'holdings': []}
            raw = evidence['responses'].get(url)
            if raw:
                if hashlib.sha256(raw['body'].encode()).hexdigest() != raw['sha256']:
                    raise ValueError('Evidence hash mismatch')
                try:
                    filing = parse_filing(raw['body'], meta, manager)
                except Exception as error:
                    evidence['errors'].append({'url': url, 'error': str(error)})
            filings.append(filing)
    result = {'as_of': evidence['as_of'], 'filings': filings, 'lookup_succeeded': lookup_succeeded, 'identities': identities, 'diagnostics': evidence['errors']}
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--universe')
    parser.add_argument('--output')
    args = parser.parse_args()
    run(args.fetch, args.universe, args.output)
