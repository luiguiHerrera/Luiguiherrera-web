"""P8 research acquisition only. Never imported by the application; no credentials.

Uses source paths already verified in the repository and Cboe's public archive UI.
Preserves the received bytes as gzip and records capture time, not historical publication.
"""
import concurrent.futures
import datetime as dt
import gzip
import hashlib
import json
import pathlib
import time
import urllib.parse
import urllib.request

BASE = pathlib.Path(__file__).resolve().parent
OUT = BASE / 'evidence'
PROTOCOL = json.loads((BASE / 'selection-protocol.json').read_text())
FREEZE = json.loads((BASE / 'protocol-freeze.json').read_text())
assert hashlib.sha256((BASE / 'selection-protocol.json').read_bytes()).hexdigest() == FREEZE['protocol_sha256']


def capture(name, url):
    metadata_file = OUT / (name + '.metadata.json')
    raw_file = OUT / (name + '.gz')
    if metadata_file.exists():
        metadata = json.loads(metadata_file.read_text())
        assert metadata['url'] == url
        if metadata['status'] == 'CAPTURED':
            raw = gzip.decompress(raw_file.read_bytes())
            assert hashlib.sha256(raw).hexdigest() == metadata['raw_sha256']
            return metadata, raw
        return metadata, None
    assert urllib.parse.urlparse(url).hostname in {'www-api.cboe.com', 'cdn.cboe.com', 'query1.finance.yahoo.com'}
    errors = []
    for attempt in range(2):
        started = dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'LuiguiHerrera-Regime-P8-Research/1.0', 'Accept': 'application/json,text/csv,*/*'})
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read(12_000_001)
                assert len(raw) <= 12_000_000, 'Payload size cap'
                ended = dt.datetime.now(dt.timezone.utc).isoformat()
                metadata = {'url': url, 'status': 'CAPTURED', 'http_status': response.status,
                            'capture_started_at': started, 'captured_at': ended, 'available_at': ended,
                            'availability_certainty': 'CONSERVATIVE_BOUND', 'source_published_at': None,
                            'historical_replay_class': 'R2', 'raw_sha256': hashlib.sha256(raw).hexdigest(),
                            'raw_bytes': len(raw), 'file': raw_file.name,
                            'http_date_not_publication': response.headers.get('Date'),
                            'last_modified_not_vintage_guarantee': response.headers.get('Last-Modified')}
            raw_file.write_bytes(gzip.compress(raw, mtime=0))
            metadata_file.write_text(json.dumps(metadata, indent=2) + '\n')
            return metadata, raw
        except Exception as error:
            errors.append(f'{type(error).__name__}: {error}')
            if attempt == 0:
                time.sleep(.5)
    metadata = {'url': url, 'status': 'UNAVAILABLE', 'errors': errors, 'file': None}
    metadata_file.write_text(json.dumps(metadata, indent=2) + '\n')
    return metadata, None


def main():
    OUT.mkdir(exist_ok=True)
    index_url = 'https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/'
    metadata, raw = capture('cfe-contract-index.json', index_url)
    assert raw, metadata
    index = json.loads(raw)
    contracts = []
    for year, rows in index.items():
        if not isinstance(rows, list):
            continue
        for row in rows:
            if row.get('duration_type') == 'M' and '2018-01-01' <= row['expire_date'] <= '2026-12-31':
                assert row.get('futures_root') == 'VX'
                assert row['path'].startswith('data/us/futures/market_statistics/historical_data/VX/')
                contracts.append(row)
    contracts = sorted({row['expire_date']: row for row in contracts}.values(), key=lambda row: row['expire_date'])
    assert contracts, 'No official monthly contracts identified'
    (OUT / 'selected-contracts.json').write_text(json.dumps(contracts, indent=2) + '\n')
    jobs = [('vx-' + row['expire_date'] + '.csv', 'https://cdn.cboe.com/' + row['path']) for row in contracts]
    jobs.append(('vix-history.csv', 'https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv'))
    start = int(dt.datetime(2018, 1, 1, tzinfo=dt.timezone.utc).timestamp())
    end = int(dt.datetime(2026, 9, 5, tzinfo=dt.timezone.utc).timestamp())
    for ticker in PROTOCOL['data_scope']['core_universe'] + ['SPY', 'RSP', 'IWM']:
        query = urllib.parse.urlencode({'period1': start, 'period2': end, 'interval': '1d', 'events': 'div,splits', 'includeAdjustedClose': 'true'})
        jobs.append((f'yahoo-{ticker}.json', f'https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?{query}'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda job: capture(*job)[0], jobs))
    manifest = {'scope': 'P8_RESEARCH_ONLY', 'protocol_sha256': FREEZE['protocol_sha256'],
                'historical_class': 'R2; no historical vintage publication proof',
                'contracts_selected': len(contracts), 'requests': len(results) + 1,
                'captured': sum(row['status'] == 'CAPTURED' for row in results) + 1,
                'errors': [row for row in results if row['status'] != 'CAPTURED'],
                'sources': [metadata] + results}
    (BASE / 'acquisition.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({key: value for key, value in manifest.items() if key != 'sources'}, indent=2))


if __name__ == '__main__':
    main()
