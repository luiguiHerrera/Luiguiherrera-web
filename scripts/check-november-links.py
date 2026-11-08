"""Read-only link audit of the authorized November edition and approved delta."""
import concurrent.futures
import hashlib
import json
import re
import urllib.error
import urllib.request
from pathlib import Path

root = Path("docs/reports/primer-informe-noviembre-2026")
text = (root / "primer-informe-noviembre-2026-revisado-por-autor.md").read_text()
for change in json.loads((root / "editorial-delta.json").read_text())["substitutions"]:
    text = text.replace(change["before"], change["after"])
urls = sorted(set(re.findall(r"\]\((https?://[^)]+)\)", text)))


def check(url):
    result = {"url": url}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 report-link-audit"})
        with urllib.request.urlopen(request, timeout=25) as response:
            body = response.read(2000000)
            result.update(status=response.status, finalUrl=response.url,
                          bodyPrefixSha256=hashlib.sha256(body).hexdigest())
    except urllib.error.HTTPError as error:
        result.update(status=error.code, finalUrl=error.url)
    except Exception as error:
        result.update(status=None, error=str(error))
    status = result["status"]
    result["result"] = "PASS" if status and 200 <= status < 400 else "ACCESS_LIMITED" if status in (401, 403, 429) else "UNRESOLVED"
    return result


with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    checks = list(pool.map(check, urls))
out = {"checkedOn": "2026-11-03", "method": "GET; redirects followed; no content substitution", "links": checks}
(root / "link-audit.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"total": len(checks), "counts": {key: sum(x["result"] == key for x in checks) for key in ["PASS", "ACCESS_LIMITED", "UNRESOLVED"]}}))
