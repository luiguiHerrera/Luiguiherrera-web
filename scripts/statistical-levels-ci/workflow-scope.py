"""Route website CI separately from native SL qualification; issue no authority."""
import json
import os
from pathlib import Path

from admission import Git, bootstrap


def native_scope(git, head, ref, event):
    if ref != 'refs/heads/vercel-deployment' or event == 'pull_request':
        return {'native': False, 'reason': 'WEBSITE_CONTEXT'}
    try:
        root, _ = bootstrap(git, head)
    except ValueError:
        return {'native': False, 'reason': 'OUTSIDE_REGISTERED_NATIVE_LINEAGE'}
    return {'native': True, 'reason': 'REGISTERED_NATIVE_LINEAGE', 'root': root}


def main():
    git = Git(Path.cwd())
    head = git.text('rev-parse', 'HEAD')
    if head != os.environ['GITHUB_SHA']:
        raise ValueError('WRONG_TESTED_SHA')
    result = native_scope(git, head, os.environ['GITHUB_REF'], os.environ['GITHUB_EVENT_NAME'])
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('native=' + str(result['native']).lower() + '\n')
    print(json.dumps({**result, 'head_sha': head, 'qualification_issued': False}))


if __name__ == '__main__':
    main()
