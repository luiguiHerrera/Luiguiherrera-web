"""Retired historical workspace verifier; original source remains in RC0."""

import sys

sys.stderr.write(
    'RETIRED_WORKSPACE_VERIFIER\n'
    'docs/regime-engine-v2/groweer/seal-manifest.py is a retired historical workspace verifier.\n'
    'No verification, evidence reads, or historical resealing were performed.\n'
    'Original source: git show f5fc7ecfd9e1f323d0ad3a43eccec1dbc500be1c:docs/regime-engine-v2/groweer/seal-manifest.py\n'
    'Run the portable candidate verifier explicitly from CHECKOUT:\n'
    'python3 docs/regime-engine-v2/release-candidate/run-verification.py --root CHECKOUT --output-dir AUDIT --profile candidate --gates all\n'
)
raise SystemExit(2)
