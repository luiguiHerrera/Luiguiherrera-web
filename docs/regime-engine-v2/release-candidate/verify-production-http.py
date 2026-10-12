"""Exercise actual production preview gates and public V1 pages over loopback HTTP."""
import argparse
import datetime
import hashlib
import json
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--origin', default='http://127.0.0.1:3107')
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
OUT = args.output_dir.resolve()
BASE = args.origin.rstrip('/')
parsed = urlsplit(BASE)
if parsed.scheme != 'http' or parsed.hostname not in {'127.0.0.1', 'localhost'} or parsed.port is None or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
    raise ValueError('Production QA requires a loopback HTTP origin with an explicit port.')
if 'regime-engine-v2' in OUT.parts:
    position = OUT.parts.index('regime-engine-v2')
    if len(OUT.parts) <= position + 1 or OUT.parts[position + 1] != 'release-candidate':
        raise ValueError('Never write HTTP evidence into a prior-stage package.')
OUT.mkdir(parents=True, exist_ok=True)
rows = []
cases = [(prefix + '/internal/regime-v2' + query, 404, locale)
         for prefix, locale in [('', 'es'), ('/en', 'en')]
         for query in ['', '?preview=v1', '?preview=v2&fixture=broad-complete', '?preview=v2&fixture=stress-absolute']]
cases += [('/dashboard', 200, 'es'), ('/en/dashboard', 200, 'en')]
for path, expected_status, locale in cases:
    request = urllib.request.Request(BASE + path, headers={'User-Agent': 'RegimeV2-Designer-Local-QA/1.0'})
    started = time.monotonic()
    try:
        try:
            response = urllib.request.urlopen(request, timeout=30)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read()
            text = body.decode('utf8', 'replace')
            row = {
                'path': path, 'http_status': response.status, 'expected_http_status': expected_status,
                'elapsed_ms': (time.monotonic() - started) * 1000,
                'body_bytes': len(body), 'body_sha256': hashlib.sha256(body).hexdigest(),
                'preview_marker_absent': 'data-design-preview' not in text,
                'v2_primary_surface_absent': 'data-v2-primary' not in text,
                'fixture_banner_absent': 'Deterministic V2 fixture.' not in text and 'Fixture determinístico V2.' not in text,
                'design_test_marker_absent': 'DESIGN_TEST' not in text,
            }
            if expected_status == 200:
                row['V1_score_label_present'] = 'Score' in text
                row['V1_confidence_label_present'] = ('Confianza' if locale == 'es' else 'Confidence') in text
            predicates = ['preview_marker_absent', 'v2_primary_surface_absent', 'fixture_banner_absent', 'design_test_marker_absent']
            if expected_status == 200:
                predicates += ['V1_score_label_present', 'V1_confidence_label_present']
            row['passed'] = row['http_status'] == expected_status and all(row[key] for key in predicates)
            rows.append(row)
    except (OSError, TimeoutError) as error:
        rows.append({'path': path, 'expected_http_status': expected_status, 'http_status': None,
                     'elapsed_ms': (time.monotonic() - started) * 1000,
                     'error': type(error).__name__ + ': ' + str(error), 'passed': False})
report = {
    'status': 'PASS' if all(row['passed'] for row in rows) else 'FAIL',
    'verified_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'server': BASE, 'node_env': 'production', 'V2_SHADOW': 'OFF',
    'actual_HTTP_requests': len(rows), 'passed': sum(row['passed'] for row in rows),
    'preview_404_cases': sum(row['passed'] for row in rows if row['expected_http_status'] == 404),
    'public_V1_200_cases': sum(row['passed'] for row in rows if row['expected_http_status'] == 200),
    'routes': rows,
    'scope': 'Exact candidate local production build only. GET responses exercise the actual route guard for ES/EN, default/V1/V2 selectors and complete/stress fixture names. Both public dashboards remain V1 with their existing score/confidence labels and no design fixture or V2 surface marker. No deployment or production environment mutation.',
}
(OUT / 'production-preview-guard.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['status'] == 'PASS' else 1)
