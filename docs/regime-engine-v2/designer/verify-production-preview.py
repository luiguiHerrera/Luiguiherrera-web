"""Exercise actual production preview gates and public V1 pages over loopback HTTP."""
import datetime
import hashlib
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:3107'
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
    'scope': 'Local production build only. GET responses exercise the actual route guard for ES/EN, default/V1/V2 selectors and complete/stress fixture names. Both public dashboards remain V1 with their existing score/confidence labels and no design fixture or V2 surface marker. No deployment or production environment mutation.',
}
(OUT / 'production-preview-guard.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(0 if report['status'] == 'PASS' else 1)
