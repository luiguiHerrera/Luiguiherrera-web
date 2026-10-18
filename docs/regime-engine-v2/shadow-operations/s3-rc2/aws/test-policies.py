#!/usr/bin/env python3
"""Portable offline policy audit. No AWS, network, credentials or absolute paths.

The evaluator supports only the operators present in this exact policy package.
It models authorization separately from S3 conditional object state. Neither
layer is an AWS IAM simulator, an OIDC test, or a production-prefix canary.
"""
import argparse
import copy
from decimal import Decimal, InvalidOperation
import fnmatch
import hashlib
import json
from pathlib import Path
import unittest

HERE = Path(__file__).resolve().parent
BUCKET = 'arn:aws:s3:::lh-regime-v2-shadow-732159826922-us-east-1'
PROBE_ROLE = 'arn:aws:iam::732159826922:role/RegimeV2S3Probe'
SHADOW_ROLE = 'arn:aws:iam::732159826922:role/RegimeV2ShadowWriter'
PROVIDER = 'arn:aws:iam::732159826922:oidc-provider/token.actions.githubusercontent.com'
SUB = 'repo:luiguiHerrera/Luiguiherrera-web:ref:refs/heads/vercel-deployment'
PROBE = BUCKET + '/regime-v2/_probe/123456-1/'
OBS = BUCKET + '/regime-v2/observations/'
RUN = BUCKET + '/regime-v2/runs/'
LATEST = BUCKET + '/regime-v2/indexes/latest.json'
METADATA = {'s3:GetBucketVersioning', 's3:GetBucketPublicAccessBlock', 's3:GetEncryptionConfiguration'}

def read(relative):
    return json.loads((HERE / relative).read_bytes())

OLD = read('accepted-probe/bucket-policy.json')
COMBINED = read('policies/combined-bucket.json')
PROBE_POLICY = read('accepted-probe/writer-policy.json')
SHADOW_POLICY = read('policies/shadow-writer.json')
SHADOW_TRUST = read('policies/shadow-trust.json')
FROZEN_CASES = read('accepted-probe/matrix.json')['cases']

def values(value):
    return value if isinstance(value, list) else [value]

def match(value, patterns, insensitive=False):
    return any(fnmatch.fnmatchcase(value.lower() if insensitive else value,
                                 pattern.lower() if insensitive else pattern)
               for pattern in values(patterns))

def condition(block, context):
    results = []
    for operator, fields in block.items():
        if operator not in {'Null', 'Bool', 'StringEquals', 'StringNotEquals', 'StringLike', 'NumericLessThanEquals'}:
            raise ValueError('Unsupported policy operator: ' + operator)
        for key, expected in fields.items():
            actual = context.get(key)
            if operator == 'Null':
                if expected not in ['true', 'false']:
                    raise ValueError('Unsupported Null value')
                result = (key not in context or actual is None) == (expected == 'true')
            elif operator == 'Bool':
                result = key in context and str(actual).lower() == str(expected).lower()
            elif operator == 'StringEquals':
                result = key in context and actual in values(expected)
            elif operator == 'StringLike':
                result = isinstance(actual, str) and match(actual, expected)
            elif operator == 'NumericLessThanEquals':
                try:
                    number, bound = Decimal(str(actual)), Decimal(str(expected))
                    result = key in context and number.is_finite() and bound.is_finite() and number <= bound
                except (InvalidOperation, TypeError, ValueError):
                    result = False
            else:
                result = key not in context or actual not in values(expected)
            results.append(result)
    return all(results)

def applies(statement, action, resource, principal, context, trust=False):
    if not match(action, statement['Action'], insensitive=True):
        return False
    if not trust:
        if 'Resource' in statement and not match(resource, statement['Resource']):
            return False
        if 'NotResource' in statement and match(resource, statement['NotResource']):
            return False
    expected = statement.get('Principal', '*')
    if expected != '*':
        wanted = expected.get('Federated' if trust else 'AWS')
        if principal not in values(wanted):
            return False
    return condition(statement.get('Condition', {}), context)

def evaluate(role, action, resource, context=None, identity=None, bucket=None):
    context = {'aws:SecureTransport': True, **(context or {})}
    if identity is None:
        identity = {PROBE_ROLE: PROBE_POLICY, SHADOW_ROLE: SHADOW_POLICY}[role]
    statements = list(identity['Statement'])
    # A bucket policy never governs objects in another bucket despite NotResource.
    if resource == BUCKET or resource.startswith(BUCKET + '/'):
        statements += (COMBINED if bucket is None else bucket)['Statement']
    matched = [s for s in statements if applies(s, action, resource, role, context)]
    if any(s['Effect'] == 'Deny' for s in matched):
        return 'EXPLICIT_DENY'
    return 'ALLOW_REQUEST' if any(s['Effect'] == 'Allow' for s in matched) else 'IMPLICIT_DENY'

def trust(context=None, principal=PROVIDER, action='sts:AssumeRoleWithWebIdentity'):
    context = {'token.actions.githubusercontent.com:sub': SUB,
               'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'} if context is None else context
    return any(s['Effect'] == 'Allow' and applies(s, action, '', principal, context, trust=True)
               for s in SHADOW_TRUST['Statement'])

CASES = []
def case(name, role, action, resource, expected, context=None):
    CASES.append({'name': name, 'role': role, 'action': action, 'resource': resource,
                  'context': context or {}, 'expected': expected})

for old in FROZEN_CASES:
    case('probe regression: ' + old['name'], PROBE_ROLE, old['action'], old['resource'], old['expected'], old['context'])
for prefix in [OBS, RUN]:
    for suffix in ['record.json', 'nested/session-or-capture.json']:
        key = prefix + suffix
        case('immutable create ' + key, SHADOW_ROLE, 's3:PutObject', key, 'ALLOW_REQUEST', {'s3:if-none-match': '*'})
        case('immutable missing condition ' + key, SHADOW_ROLE, 's3:PutObject', key, 'EXPLICIT_DENY')
        case('immutable CAS rejected ' + key, SHADOW_ROLE, 's3:PutObject', key, 'EXPLICIT_DENY', {'s3:if-match': 'etag'})
        case('immutable wrong create value ' + key, SHADOW_ROLE, 's3:PutObject', key, 'EXPLICIT_DENY', {'s3:if-none-match': 'not-star'})
        case('immutable wrong create plus CAS ' + key, SHADOW_ROLE, 's3:PutObject', key, 'EXPLICIT_DENY', {'s3:if-none-match': 'not-star', 's3:if-match': 'etag'})
        case('immutable null create header ' + key, SHADOW_ROLE, 's3:PutObject', key, 'EXPLICIT_DENY', {'s3:if-none-match': None})
        case('read immutable ' + key, SHADOW_ROLE, 's3:GetObject', key, 'ALLOW_REQUEST')
case('latest first create', SHADOW_ROLE, 's3:PutObject', LATEST, 'ALLOW_REQUEST', {'s3:if-none-match': '*'})
case('latest CAS current ETag authorization', SHADOW_ROLE, 's3:PutObject', LATEST, 'ALLOW_REQUEST', {'s3:if-match': 'current'})
case('latest CAS stale ETag admitted to S3 condition evaluation', SHADOW_ROLE, 's3:PutObject', LATEST, 'ALLOW_REQUEST', {'s3:if-match': 'stale'})
case('latest missing condition', SHADOW_ROLE, 's3:PutObject', LATEST, 'EXPLICIT_DENY')
case('latest both headers null', SHADOW_ROLE, 's3:PutObject', LATEST, 'EXPLICIT_DENY', {'s3:if-match': None, 's3:if-none-match': None})
case('read latest', SHADOW_ROLE, 's3:GetObject', LATEST, 'ALLOW_REQUEST')
for resource in [PROBE+'immutable.json', PROBE+'latest.json', BUCKET+'/regime-v2/_probe/',
                 BUCKET+'/regime-v2/observations-escape/a.json', BUCKET+'/regime-v2/runs-escape/a.json',
                 BUCKET+'/regime-v2/indexes/other.json', LATEST+'/child', LATEST.replace('latest', 'Latest'),
                 BUCKET+'/sessions/a.json', BUCKET+'/captures/a.json', BUCKET+'/failures/a.json',
                 BUCKET+'-other/regime-v2/observations/a.json']:
    for action in ['s3:GetObject', 's3:PutObject']:
        case('shadow namespace denied ' + action + ' ' + resource, SHADOW_ROLE, action, resource, 'IMPLICIT_DENY', {'s3:if-none-match': '*'})
for action in METADATA:
    case('shadow metadata allowed ' + action, SHADOW_ROLE, action, BUCKET, 'ALLOW_REQUEST')
    case('shadow other bucket metadata denied ' + action, SHADOW_ROLE, action, BUCKET+'-other', 'IMPLICIT_DENY')
for prefix in ['regime-v2/observations/a.json','regime-v2/observations/nested/session.json','regime-v2/runs/a.json','regime-v2/indexes/latest.json']:
    case('bounded exact JSON list '+prefix, SHADOW_ROLE,'s3:ListBucket',BUCKET,'ALLOW_REQUEST',{'s3:prefix':prefix,'s3:max-keys':'1'})
    case('probe role gets no new bounded list '+prefix, PROBE_ROLE,'s3:ListBucket',BUCKET,'IMPLICIT_DENY',{'s3:prefix':prefix,'s3:max-keys':'1'})
    for limit in [None,'2','1000','not-a-number']:
        context={'s3:prefix':prefix}
        if limit is not None:context['s3:max-keys']=limit
        case('bounded list invalid/missing max-keys '+prefix+' '+str(limit),SHADOW_ROLE,'s3:ListBucket',BUCKET,'IMPLICIT_DENY',context)
for prefix in ['', 'regime-v2/', 'regime-v2/observations/', 'regime-v2/runs/', 'regime-v2/_probe/a.json',
               'regime-v2/indexes/other.json','regime-v2/observations/a.txt','other/a.json',None]:
    context={'s3:max-keys':'1'}
    if prefix is not None:context['s3:prefix']=prefix
    case('unscoped or other list denied '+str(prefix),SHADOW_ROLE,'s3:ListBucket',BUCKET,'IMPLICIT_DENY',context)
case('bounded list another bucket denied',SHADOW_ROLE,'s3:ListBucket',BUCKET+'-other','IMPLICIT_DENY',{'s3:prefix':'regime-v2/observations/a.json','s3:max-keys':'1'})
case('bounded list HTTPS required',SHADOW_ROLE,'s3:ListBucket',BUCKET,'EXPLICIT_DENY',{'s3:prefix':'regime-v2/observations/a.json','s3:max-keys':'1','aws:SecureTransport':False})
for action in ['ListBucket', 'ListBucketVersions', 'ListBucketMultipartUploads', 'GetBucketLocation', 'GetBucketPolicy',
               'GetBucketObjectLockConfiguration', 'GetLifecycleConfiguration', 'PutBucketPolicy', 'PutBucketAcl',
               'PutBucketVersioning', 'PutBucketPublicAccessBlock', 'PutEncryptionConfiguration', 'PutLifecycleConfiguration', 'DeleteBucket']:
    case('shadow bucket admin or unused denied '+action, SHADOW_ROLE, 's3:'+action, BUCKET, 'IMPLICIT_DENY')
for action in ['GetObjectVersion', 'PutObjectAcl', 'PutObjectTagging', 'PutObjectRetention', 'PutObjectLegalHold']:
    case('shadow unused object action denied '+action, SHADOW_ROLE, 's3:'+action, OBS+'a.json', 'IMPLICIT_DENY')
for action in ['DeleteObject', 'DeleteObjectVersion']:
    for resource in [OBS+'a.json', RUN+'a.json', LATEST, PROBE+'a.json', BUCKET+'-other/a.json']:
        case('shadow delete anywhere denied '+action+' '+resource, SHADOW_ROLE, 's3:'+action, resource, 'EXPLICIT_DENY')
for action, resource, headers in [('s3:GetObject', OBS+'a.json', {}), ('s3:PutObject', OBS+'a.json', {'s3:if-none-match':'*'}),
                                   ('s3:PutObject', LATEST, {'s3:if-match':'current'}), ('s3:GetBucketVersioning', BUCKET, {})]:
    case('shadow HTTPS required '+action, SHADOW_ROLE, action, resource, 'EXPLICIT_DENY', {'aws:SecureTransport':False, **headers})

class FakeConditionalS3:
    """Explicitly synthetic service-state model; not evidence of AWS execution."""
    def __init__(self):
        self.objects = {}
    def put(self, key, body, headers):
        if evaluate(SHADOW_ROLE, 's3:PutObject', key, headers) != 'ALLOW_REQUEST':
            return 403
        current = self.objects.get(key)
        if 's3:if-none-match' in headers:
            if headers['s3:if-none-match'] != '*':
                return 400
            if current is not None:
                return 412
        if 's3:if-match' in headers and (current is None or headers['s3:if-match'] != current['etag']):
            return 412
        self.objects[key] = {'body':body, 'etag':hashlib.sha256(body.encode()).hexdigest()}
        return 200

class PolicyTests(unittest.TestCase):
    def test_01_accepted_policy_bytes_match_manifest(self):
        for name, expected in read('accepted-probe/manifest.json')['files'].items():
            self.assertEqual(hashlib.sha256((HERE/'accepted-probe'/name).read_bytes()).hexdigest(), expected)
    def test_02_original_bucket_statements_exactly_retained(self):
        self.assertEqual(COMBINED['Statement'][:len(OLD['Statement'])], OLD['Statement'])
        self.assertEqual(COMBINED['Version'], OLD['Version'])
        self.assertEqual(len(COMBINED['Statement']), len(OLD['Statement'])+2)
    def test_03_probe_matrix_old_and_combined_identical(self):
        self.assertEqual(len(FROZEN_CASES), 63)
        for c in FROZEN_CASES:
            with self.subTest(c['name']):
                previous = evaluate(PROBE_ROLE,c['action'],c['resource'],c['context'],bucket=OLD)
                self.assertEqual(previous,c['expected'])
                self.assertEqual(evaluate(PROBE_ROLE,c['action'],c['resource'],c['context']),previous)
    def test_04_complete_offline_authorization_matrix(self):
        for c in CASES:
            with self.subTest(c['name']):
                self.assertEqual(evaluate(c['role'],c['action'],c['resource'],c['context']),c['expected'])
    def test_05_shadow_allow_scope_exact(self):
        allow=[s for s in SHADOW_POLICY['Statement'] if s['Effect']=='Allow']
        self.assertEqual(len(allow),3)
        self.assertEqual(set(allow[0]['Action']),METADATA)
        self.assertEqual(allow[0]['Resource'],BUCKET)
        self.assertEqual(set(allow[1]['Action']),{'s3:GetObject','s3:PutObject'})
        self.assertEqual(set(allow[1]['Resource']),{OBS+'*',RUN+'*',LATEST})
        self.assertEqual(allow[2]['Action'],'s3:ListBucket')
        self.assertEqual(allow[2]['Resource'],BUCKET)
        self.assertEqual(allow[2]['Condition'],{'StringLike':{'s3:prefix':['regime-v2/observations/*.json','regime-v2/runs/*.json','regime-v2/indexes/latest.json']},'NumericLessThanEquals':{'s3:max-keys':'1'}})
        self.assertFalse(any('*' in a for s in allow for a in values(s['Action'])))
    def test_06_trust_exact_accepted_bytes(self):
        self.assertEqual((HERE/'policies/shadow-trust.json').read_bytes(),(HERE/'accepted-probe/trust-policy.json').read_bytes())
        self.assertTrue(trust())
    def test_07_trust_rejects_missing_wrong_audience_repo_branch_provider(self):
        good={'token.actions.githubusercontent.com:sub':SUB,'token.actions.githubusercontent.com:aud':'sts.amazonaws.com'}
        for changed in [{},{'token.actions.githubusercontent.com:sub':SUB},{'token.actions.githubusercontent.com:aud':'sts.amazonaws.com'},
                        {**good,'token.actions.githubusercontent.com:aud':'other'},
                        *[{**good,'token.actions.githubusercontent.com:sub':s} for s in [SUB.replace('vercel-deployment','main'),SUB.replace('Luiguiherrera-web','other'),SUB.replace('luiguiHerrera/','other/'),'repo:luiguiHerrera/Luiguiherrera-web:pull_request','repo:luiguiHerrera/Luiguiherrera-web:environment:production','repo:*/*']]]:
            with self.subTest(changed):self.assertFalse(trust(changed))
        self.assertFalse(trust(principal=PROVIDER.replace('732159826922','111122223333')))
        self.assertFalse(trust(action='sts:AssumeRole'))
    def test_08_bucket_extension_has_only_production_denies(self):
        self.assertTrue(all(s['Effect']=='Deny' for s in COMBINED['Statement']))
        for statement in COMBINED['Statement'][4:]:
            self.assertEqual(statement['Principal'],'*')
            self.assertEqual(statement['Action'],'s3:PutObject')
            for resource in values(statement['Resource']):
                self.assertIn(resource,{OBS+'*',RUN+'*',LATEST})
                self.assertFalse(match(PROBE+'anything.json',resource))
    def test_09_delete_deny_survives_hypothetical_accidental_allow(self):
        altered=copy.deepcopy(SHADOW_POLICY)
        altered['Statement'].append({'Effect':'Allow','Action':['s3:DeleteObject','s3:DeleteObjectVersion'],'Resource':'*'})
        for action in ['s3:DeleteObject','s3:DeleteObjectVersion']:
            for key in [OBS+'a.json',PROBE+'a.json',BUCKET+'-other/a.json']:
                self.assertEqual(evaluate(SHADOW_ROLE,action,key,identity=altered),'EXPLICIT_DENY')
    def test_10_bucket_governance_survives_hypothetical_unconditional_identity_allow(self):
        identity={'Statement':[{'Effect':'Allow','Action':'s3:PutObject','Resource':BUCKET+'/*'}]}
        for key in [OBS+'a.json',RUN+'a.json',LATEST]:
            self.assertEqual(evaluate(SHADOW_ROLE,'s3:PutObject',key,identity=identity),'EXPLICIT_DENY')
    def test_11_null_pair_is_and_not_or(self):
        block={'Null':{'s3:if-none-match':'true','s3:if-match':'true'}}
        self.assertTrue(condition(block,{}))
        self.assertFalse(condition(block,{'s3:if-none-match':'*'}))
        self.assertFalse(condition(block,{'s3:if-match':'etag'}))
    def test_12_unknown_condition_operators_fail_closed(self):
        with self.assertRaises(ValueError):condition({'NotARealOperator':{'key':'value'}},{})
        with self.assertRaises(ValueError):condition({'Null':{'key':'typo'}},{})
    def test_13_synthetic_immutable_duplicate_create_returns_412_preserves_body(self):
        for key in [OBS+'a.json',RUN+'a.json']:
            s3=FakeConditionalS3()
            self.assertEqual(s3.put(key,'original',{'s3:if-none-match':'*'}),200)
            self.assertEqual(s3.put(key,'changed',{'s3:if-none-match':'*'}),412)
            self.assertEqual(s3.put(key,'changed',{}),403)
            self.assertEqual(s3.put(key,'changed',{'s3:if-match':s3.objects[key]['etag']}),403)
            self.assertEqual(s3.objects[key]['body'],'original')
    def test_14_synthetic_latest_create_cas_stale_and_unconditional(self):
        s3=FakeConditionalS3()
        self.assertEqual(s3.put(LATEST,'first',{'s3:if-none-match':'*'}),200)
        first=s3.objects[LATEST]['etag']
        self.assertEqual(s3.put(LATEST,'second',{'s3:if-match':first}),200)
        self.assertEqual(s3.put(LATEST,'stale',{'s3:if-match':first}),412)
        self.assertEqual(s3.put(LATEST,'blind',{}),403)
        self.assertEqual(s3.objects[LATEST]['body'],'second')
    def test_15_synthetic_invalid_latest_create_value_is_not_a_success(self):
        s3=FakeConditionalS3()
        # Header presence is IAM-authorized; only '*' is a valid S3 create value.
        self.assertEqual(evaluate(SHADOW_ROLE,'s3:PutObject',LATEST,{'s3:if-none-match':'wrong'}),'ALLOW_REQUEST')
        self.assertEqual(s3.put(LATEST,'invalid',{'s3:if-none-match':'wrong'}),400)
        self.assertNotIn(LATEST,s3.objects)
    def test_16_new_statements_do_not_change_any_probe_namespace_decision(self):
        for action in ['s3:GetObject','s3:PutObject','s3:DeleteObject','s3:DeleteObjectVersion']:
            for suffix in ['latest.json','immutable.json','future.json','nested/latest.json']:
                for context in [{},{'s3:if-none-match':'*'},{'s3:if-none-match':'wrong'},{'s3:if-match':'etag'},{'aws:SecureTransport':False}]:
                    self.assertEqual(evaluate(PROBE_ROLE,action,PROBE+suffix,context),evaluate(PROBE_ROLE,action,PROBE+suffix,context,bucket=OLD))
    def test_17_list_requires_both_prefix_and_numeric_bound(self):
        self.assertEqual(evaluate(SHADOW_ROLE,'s3:ListBucket',BUCKET,{'s3:prefix':'regime-v2/observations/a.json','s3:max-keys':1}),'ALLOW_REQUEST')
        self.assertEqual(evaluate(SHADOW_ROLE,'s3:ListBucket',BUCKET,{'s3:prefix':'regime-v2/observations/a.json'}),'IMPLICIT_DENY')
        self.assertEqual(evaluate(SHADOW_ROLE,'s3:ListBucket',BUCKET,{'s3:max-keys':1}),'IMPLICIT_DENY')
        self.assertEqual(evaluate(SHADOW_ROLE,'s3:ListBucket',BUCKET,{'s3:prefix':'regime-v2/observations/a.json','s3:max-keys':2}),'IMPLICIT_DENY')
    def test_18_bounded_list_never_changes_probe_identity_or_allows_probe_prefix(self):
        for role in [PROBE_ROLE,SHADOW_ROLE]:
            self.assertEqual(evaluate(role,'s3:ListBucket',BUCKET,{'s3:prefix':'regime-v2/_probe/a.json','s3:max-keys':1}),'IMPLICIT_DENY')
        self.assertFalse(any(s['Effect']=='Allow' and 's3:ListBucket' in values(s['Action']) for s in PROBE_POLICY['Statement']))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,help='Optional new report file; no output file is written by default.')
    args=parser.parse_args()
    if args.output is not None and args.output.exists():
        parser.error('output already exists; retain historical reports')
    result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(PolicyTests))
    files=[*sorted((HERE/'accepted-probe').glob('*.json')),*sorted((HERE/'policies').glob('*.json'))]
    report={'schemaVersion':1,'scope':'OFFLINE_EXACT_POLICY_PACKAGE_AND_SYNTHETIC_SERVICE_MODEL',
            'status':'PASS' if result.wasSuccessful() else 'FAIL','testMethods':result.testsRun,
            'failures':len(result.failures),'errors':len(result.errors),'authorizationRows':len(CASES),
            'frozenProbeRows':len(FROZEN_CASES),'probeNamespaceCrossProductComparisons':80,
            'cases':[{**c,'observed':evaluate(c['role'],c['action'],c['resource'],c['context'])} for c in CASES],
            'filesSha256':{str(p.relative_to(HERE)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},
            'awsRequests':0,'awsMutations':0,'shadowWriterOidcLive':'NOT_RUN','remoteProductionPrefixCanary':'NOT_RUN',
            'limitations':['Authorization matching uses the canonical role identity and only the operators in these files.',
                           'An IAM-authorized duplicate create or stale ETag request is rejected by S3 preconditions; the stateful tests here are synthetic.',
                           'AWS IAM role simulation does not support resource-based policies; identity-only simulation is not proof of bucket conditions.']}
    if args.output is not None:
        args.output.parent.mkdir(parents=True,exist_ok=True)
        with args.output.open('x') as output:output.write(json.dumps(report,indent=2)+'\n')
    print(json.dumps({key:report[key] for key in ['status','testMethods','failures','errors','authorizationRows','frozenProbeRows','awsRequests','awsMutations']}))
    return 0 if result.wasSuccessful() else 1

if __name__=='__main__':
    raise SystemExit(main())
