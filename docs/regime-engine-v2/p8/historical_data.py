"""Normalizes preserved P8 research bytes; never fetches or backfills missing rows."""
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import pathlib
from reference_model import TICKERS, PRICE_BASIS, finite, extract

BASE = pathlib.Path(__file__).resolve().parent
EVIDENCE = BASE / 'evidence'


def source(name):
    metadata = json.loads((EVIDENCE / (name + '.metadata.json')).read_text())
    if metadata['status'] != 'CAPTURED':
        return metadata, None
    raw = gzip.decompress((EVIDENCE / (name + '.gz')).read_bytes())
    assert hashlib.sha256(raw).hexdigest() == metadata['raw_sha256']
    return metadata, raw


def row_metadata(date, metadata):
    return {'date': date, 'observation_date': date,
            'observation_end_at': date + 'T23:59:59.999999Z',
            'source_published_at': None, 'captured_at': metadata['captured_at'],
            'available_at': metadata['available_at'], 'availability_certainty': 'CONSERVATIVE_BOUND'}


def adjusted_value(result, index):
    """Provider-native field only; a valid quoted close cannot repair absent adjclose."""
    arrays = result.get('indicators', {}).get('adjclose') or [{}]
    values = arrays[0].get('adjclose') or []
    value = values[index] if index < len(values) else None
    return value if finite(value) and value > 0 else None


class History:
    def __init__(self):
        self.equity = {}
        self.audit = {'price_inputs': {}, 'vix': {}, 'vx': {}, 'missing_is_not_backfilled': True}
        for ticker in TICKERS + ['SPY', 'RSP', 'IWM']:
            metadata, raw = source(f'yahoo-{ticker}.json')
            assert raw, metadata
            payload = json.loads(raw)
            assert not payload['chart']['error']
            result = payload['chart']['result'][0]
            quote = result['indicators']['quote'][0]
            adjusted = result['indicators'].get('adjclose', [{}])[0].get('adjclose', [])
            rows = {}
            missing_adjusted = []
            differences = []
            for i, timestamp in enumerate(result['timestamp']):
                date = dt.datetime.fromtimestamp(timestamp, dt.timezone.utc).date().isoformat()
                if date > '2026-09-04':
                    continue
                value = adjusted_value(result, i)
                close = quote['close'][i]
                if not finite(value) or value <= 0:
                    missing_adjusted.append(date)
                    value = None  # Explicit missing; not quote.close.
                rows[date] = dict(row_metadata(date, metadata), adjusted_close=value, source_close=close)
                if finite(value) and finite(close) and abs(value - close) > 1e-6:
                    differences.append(date)
            self.equity[ticker] = {'source_id': 'YAHOO_CHART_ADJCLOSE', 'source_field': 'chart.result[0].indicators.adjclose[0].adjclose',
                                   'series_type': 'ETF_ADJUSTED_PRICE', 'price_basis': PRICE_BASIS, 'currency': result['meta']['currency'],
                                   'available_at': metadata['available_at'], 'availability_certainty': 'CONSERVATIVE_BOUND',
                                   'rows_by_date': rows}
            assert result['meta']['currency'] == 'USD'
            actions = []
            for kind, events in result.get('events', {}).items():
                for event in events.values():
                    date = dt.datetime.fromtimestamp(event['date'], dt.timezone.utc).date().isoformat()
                    if date <= '2026-09-04':
                        actions.append({'date': date, 'type': kind, 'details': event})
            self.audit['price_inputs'][ticker] = {'source_sha256': metadata['raw_sha256'], 'rows': len(rows),
                'first': min(rows), 'last': max(rows), 'missing_adjusted_dates': missing_adjusted,
                'dates_where_adjusted_differs_from_source_close': len(differences),
                'corporate_action_count': len(actions), 'corporate_action_examples': sorted(actions, key=lambda x: x['date'])[-4:]}
        self.calendar = sorted(self.equity['SPY']['rows_by_date'])
        metadata, raw = source('vix-history.csv')
        assert raw, metadata
        vix = {}
        for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
            date = dt.datetime.strptime(row['DATE'], '%m/%d/%Y').date().isoformat()
            if date <= '2026-09-04':
                value = float(row['CLOSE'])
                vix[date] = dict(row_metadata(date, metadata), value=value if finite(value) and value > 0 else None)
        self.vix = {'source_id': 'CBOE_OFFICIAL_VIX_CLOSE', 'series_type': 'OFFICIAL_VIX_INDEX', 'rows_by_date': vix}
        self.audit['vix'] = {'rows': len(vix), 'first': min(vix), 'last': max(vix), 'source_sha256': metadata['raw_sha256']}
        self.contracts = json.loads((EVIDENCE / 'selected-contracts.json').read_text())
        self.vx = {}
        for contract in self.contracts:
            expiry = contract['expire_date']
            metadata, raw = source('vx-' + expiry + '.csv')
            rows = {}
            if raw:
                for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
                    date = row['Trade Date']
                    if date <= '2026-09-04' and date < expiry:
                        value = float(row['Settle'])
                        rows[date] = value if finite(value) and value > 0 else None
            self.vx[expiry] = {'contract': contract, 'metadata': metadata, 'rows': rows}
        self.audit['vx'] = {'contracts': len(self.vx), 'definition': 'Official Settle, not Close; expected monthly slots kept even if a settlement is missing.'}

    def frame(self, index, mode='R2'):
        date = self.calendar[index]
        sessions = self.calendar[max(0, index-63):index+1]
        equity = {}
        for ticker in TICKERS:
            packet = self.equity[ticker]
            equity[ticker] = {key: value for key, value in packet.items() if key != 'rows_by_date'}
            equity[ticker]['rows'] = [packet['rows_by_date'][day] for day in sessions if day in packet['rows_by_date']]
        vix = {key: value for key, value in self.vix.items() if key != 'rows_by_date'}
        vix['rows'] = [self.vix['rows_by_date'][day] for day in sessions[-6:] if day in self.vix['rows_by_date']]
        # Catalog first, then row value. Missing VX1 must not silently promote VX2 into VX1.
        expected = [row for row in self.contracts if row['expire_date'] > date][:9]
        contracts = []
        captures = []
        for row in expected:
            data = self.vx[row['expire_date']]
            contracts.append({'symbol': 'VX/' + row['product_display'].split('/')[-1], 'expiration_date': row['expire_date'], 'settlement': data['rows'].get(date)})
            if data['metadata'].get('available_at'):
                captures.append(data['metadata']['available_at'])
        vx = {'series_type': 'OFFICIAL_MONTHLY_VX_SETTLEMENT', 'observation_date': date,
              'observation_end_at': date + 'T23:59:59.999999Z', 'source_published_at': None,
              'available_at': max(captures) if captures else None, 'availability_certainty': 'CONSERVATIVE_BOUND',
              'expected_contracts': [{'symbol': row['symbol'], 'expiration_date': row['expiration_date']} for row in contracts], 'contracts': contracts}
        return {'mode': mode, 'target_session': date, 'as_of': date + 'T23:59:59.999999Z',
                'expected_sessions': sessions, 'equity': equity, 'vix': vix, 'vx': vx, 'satellites': {}}

    def features(self):
        results = []
        for index, date in enumerate(self.calendar):
            if '2019-01-01' <= date <= '2026-09-04':
                features, reasons = extract(self.frame(index))
                results.append({'date': date, 'features': features, 'missing_reasons': reasons})
        return results
