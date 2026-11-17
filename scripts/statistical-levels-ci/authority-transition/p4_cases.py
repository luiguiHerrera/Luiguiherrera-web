"""In-memory Git successors over real read-only ancestry; no commits are written."""
import ast
import copy
import hashlib
import json
import re
import socket
import unittest
from unittest.mock import patch
from models import *
RESULT={'scope':'LOCAL_P4_ADMISSION_NOT_HOSTED','remote_attempts':0}
def deny_network(*args,**kwargs):RESULT['remote_attempts']+=1;raise AssertionError('NETWORK_FORBIDDEN')
def tree_hash(entries):
    root={}
    for name,(mode,oid) in entries.items():
        cur=root;parts=name.split('/')
        for part in parts[:-1]:cur=cur.setdefault(part,{})
        cur[parts[-1]]=(mode,oid)
    def walk(node):
        rows=[]
        for name,v in node.items():
            directory=isinstance(v,dict);mode,oid=('40000',walk(v)) if directory else v
            rows.append(((name+'/' if directory else name).encode(),mode.encode()+b' '+name.encode()+b'\0'+bytes.fromhex(oid)))
        body=b''.join(v for _,v in sorted(rows));return hashlib.sha1(b'tree '+str(len(body)).encode()+b'\0'+body).hexdigest()
    return walk(root)
class MemoryGit:
    def __init__(self):self.real=a.Git(REPO);self.nodes={};self.root=REPO
    def tree(self,sha):return self.nodes[sha]['tree'] if sha in self.nodes else self.real.tree(sha)
    def parents(self,sha):return [self.nodes[sha]['parent']] if sha in self.nodes else self.real.parents(sha)
    def blob(self,sha,name):
        if sha not in self.nodes:return self.real.blob(sha,name)
        node=self.nodes[sha];return node['files'][name] if name in node['files'] else self.blob(node['parent'],name)
    def commit(self,parent,files,identity='Codex <codex@openai.com> 1794917400 +0000',message='Local model only'):
        entries=dict(self.tree(parent))
        entries.update({n:('100644',blob(b)) for n,b in files.items()})
        th=tree_hash(entries);raw=f'tree {th}\nparent {parent}\nauthor {identity}\ncommitter {identity}\n\n{message}\n'.encode()
        sha=hashlib.sha1(b'commit '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        self.nodes[sha]={'parent':parent,'tree':entries,'tree_sha':th,'raw':raw,'files':files}
        return sha
    def text(self,*args):
        if args[0]=='rev-parse' and args[1].endswith('^{tree}') and args[1][:-7] in self.nodes:return self.nodes[args[1][:-7]]['tree_sha']
        return self(*args).decode().strip()
    def __call__(self,*args):
        if args[:2]==('cat-file','commit') and args[2] in self.nodes:return self.nodes[args[2]]['raw']
        return self.real(*args)
def seal(files):
    blank=re.sub(a.LINEAGE_PIN,lambda m:m[1]+b'0'*64+m[2],files[a.CI])
    rows=[{'path':n,'mode':'100644','sha256':a.digest(blank if n==a.CI else b)} for n,b in sorted(files.items())]
    pin=a.digest(json.dumps(rows,sort_keys=True,separators=(',',':')).encode())
    return {**files,a.CI:re.sub(a.LINEAGE_PIN,lambda m:m[1]+pin.encode()+m[2],blank)}
def fixture():
    g=MemoryGit();editorial=g.commit(EP,E_BLOBS,IDENTITY['author'],IDENTITY['message']);assert editorial==E
    entry=json.loads((REPO/a.LINEAGE_REGISTRY).read_text())[-1]
    files={name:(REPO/name).read_bytes() for name in entry['rebind']['files']}
    root=g.commit(E,files,entry['rebind']['author'],entry['rebind']['message'])
    return g,root,entry,files

class P4Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.g,cls.root,cls.entry,cls.files=fixture()
    def test_exact_editorial_and_technical_admission(self):
        self.assertEqual(a.bootstrap(self.g,self.root),(self.root,[]))
        self.assertEqual(a.bootstrap(self.g,H),(H,[]))
        self.assertEqual(self.g.blob(self.root,'scripts/statistical-levels-release/policy.json'),self.g.blob(H,'scripts/statistical-levels-release/policy.json'))
        self.assertEqual(self.g.blob(self.root,'scripts/statistical-levels-ci/policy-migration.json'),self.g.blob(H,'scripts/statistical-levels-ci/policy-migration.json'))
        RESULT.update(editorial_sha=E,editorial_tree=E_TREE,technical_root_model=self.root,source_delta_paths=len(E_BLOBS),technical_delta_paths=sorted(self.files),original_baseline=X)
    def test_exact_data_parent_is_distinct_from_historical_root(self):
        self.assertNotEqual(EP,H)
        self.assertEqual(self.g.parents(EP),[H])
        self.assertEqual(a.bootstrap(self.g,EP),(H,[EP]))
        self.assertEqual(self.g.parents(E),[EP])
        self.assertEqual(self.g.parents(self.root),[E])
        self.assertEqual(self.entry['parent'],EP)
        self.assertEqual(self.entry['previous_rebind'],H)
        self.assertEqual(self.g.text('rev-parse',EP+'^{tree}'),'d878568938014b697193a5468f9d07359146154c')
    def test_old_parent_and_unsealed_data_parent_cannot_admit_editorial(self):
        next_data=self.g.commit(EP,{n:self.g.blob(EP,n)+b'\n' for n in a.paths(self.g)})
        for parent in [H,next_data]:
            changed=self.g.commit(parent,E_BLOBS,IDENTITY['author'],IDENTITY['message'])
            entry=copy.deepcopy(self.entry);entry['parent']=parent;entry['editorial']['sha']=changed
            with self.subTest(parent=parent),self.assertRaises(ValueError):a.validate_lineage_editorial(self.g,entry)
    def test_historical_root_cannot_be_replaced_by_editorial_parent(self):
        entry=copy.deepcopy(self.entry);entry['previous_rebind']=EP
        with self.assertRaisesRegex(ValueError,'EXTRAORDINARY_LINEAGE'):a.validate_lineage_editorial(self.g,entry)
    def test_snapshot_identity_rejects_each_altered_baseline_blob(self):
        for name in sorted(a.paths(self.g)):
            original=self.g.nodes[E]['files'][name]
            try:
                self.g.nodes[E]['files'][name]=original+b'\n'
                with self.subTest(path=name),self.assertRaisesRegex(ValueError,'EXTRAORDINARY_SNAPSHOT_IDENTITY'):
                    a.validate_lineage_editorial(self.g,self.entry)
            finally:self.g.nodes[E]['files'][name]=original
    def test_editorial_alone_and_old_admission_reject(self):
        with self.assertRaises(ValueError):a.bootstrap(self.g,E)
        with self.assertRaises(ValueError):old_a.bootstrap(self.g,self.root)
    def test_original_82_snapshot_and_next_packages_unchanged(self):
        for n in a.paths(self.g):self.assertEqual(self.g.blob(E,n),self.g.blob(X,n))
        for n in ['package.json','package-lock.json']:self.assertEqual(self.g.blob(E,n),self.g.blob(H,n))
    def test_release_input_manifest_and_freeze_parity(self):
        pkg='scripts/statistical-levels-release/';g=self.g;r=self.root
        inputs=json.loads(g.blob(r,pkg+'source-inputs.json'));self.assertEqual(len(inputs),78)
        for n,h in inputs.items():self.assertEqual(a.digest(g.blob(r,n)),h)
        manifest=json.loads(g.blob(r,pkg+'source-manifest.json'));self.assertEqual(len(manifest),111)
        for n,h in manifest.items():self.assertEqual(a.digest(g.blob(r,pkg+n)),h)
        workflow=g.blob(r,'.github/workflows/statistical-levels-release.yml');pins=re.findall(rb'EXPECTED_SOURCE_SUMS: ([a-f0-9]{64})',workflow)
        self.assertEqual(len(pins),10);self.assertEqual(set(p.decode() for p in pins),{a.digest(g.blob(r,pkg+'SOURCE_SHA256SUMS'))})
        frozen=json.loads(g.blob(r,pkg+'workflow-freeze.json'));self.assertEqual(frozen['workflow_sha256'],a.digest(workflow))
    def test_data_successor_policy_unchanged(self):
        data={n:self.g.blob(self.root,n)+b'\n' for n in a.paths(self.g)}
        daily=self.g.commit(self.root,data)
        self.assertEqual(a.bootstrap(self.g,daily),(self.root,[daily]))
        bad=self.g.commit(self.root,{next(iter(data)):next(iter(data.values()))})
        with self.assertRaises(ValueError):a.bootstrap(self.g,bad)
        code=self.g.commit(self.root,{'public/llms.txt':b'UNAUTHORIZED'})
        with self.assertRaises(ValueError):a.bootstrap(self.g,code)
        # Metadata/producer/source constraints remain byte-for-byte as AST.
        old_nodes={n.name:ast.dump(n) for n in ast.parse(git('show',H+':scripts/statistical-levels-ci/admission.py').decode()).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
        new_nodes={n.name:ast.dump(n) for n in ast.parse((ROOT.parent/'admission.py').read_text()).body if isinstance(n,(ast.FunctionDef,ast.ClassDef))}
        for n in ['validate_data','bind_receipt','commit_identity','parent_ci','validate_daily_selection','producer_run','run_identity','current_ref','paths','delta']:
            self.assertEqual(old_nodes[n],new_nodes[n],n)
    def test_exception_identity_scope_and_parent_cannot_expand(self):
        for kind in ['parent','scope','mode','hash','header','previous']:
            entry=copy.deepcopy(self.entry)
            if kind=='parent':entry['parent']=X
            elif kind=='scope':entry['editorial']['delta'].pop(next(iter(entry['editorial']['delta'])))
            elif kind=='mode':next(iter(entry['editorial']['delta'].values()))['mode']='100755'
            elif kind=='hash':next(iter(entry['editorial']['delta'].values()))['sha256']='0'*64
            elif kind=='header':entry['editorial']['message']+=' changed'
            else:entry['previous_rebind']=X
            with self.subTest(kind=kind),self.assertRaises(ValueError):a.validate_lineage_editorial(self.g,entry)
    def test_control_delta_policy_and_workflow_mutations_rejected(self):
        for name in ['package.json','scripts/statistical-levels-release/policy.json',a.CI]:
            files=dict(self.files);files[name]=self.g.blob(E,name)+b'\n'
            # Even self-consistently sealed changes retain the fixed boundaries.
            files=seal(files);root=self.g.commit(E,files,self.entry['rebind']['author'],self.entry['rebind']['message'])
            with self.subTest(path=name),self.assertRaises(ValueError):a.bootstrap(self.g,root)
    def test_second_editorial_cannot_follow_exception(self):
        files={n:self.g.blob(self.root,n)+b'\n' for n in a.paths(self.g)}
        daily=self.g.commit(self.root,files)
        e2=self.g.commit(daily,{'public/llms.txt':self.g.blob(daily,'public/llms.txt')+b'\n'})
        with self.assertRaises(ValueError):a.bootstrap(self.g,e2)
    def test_no_release_authority_issued_by_admission(self):
        src=(ROOT.parent/'admission.py').read_text()
        self.assertIn("'release_authority_issued': False",src)
        self.assertIn("'publication_authority': 'EXTERNAL_EXACT_FOUNDER_AUTHORIZATION'",src)
        self.assertEqual(c.EDITORIAL_AUTHORIZATION,None)

    def test_historical_fixture_admission_is_exact_two_line_selector_only(self):
        self.assertEqual(len(a.EXTRAORDINARY_HISTORICAL_FIXTURES),5)
        for name in sorted(a.EXTRAORDINARY_HISTORICAL_FIXTURES):
            git_name='git' if name.endswith('/test_lineage_admission.py') else 'f.git'
            addition=f"        if {git_name}.parents(cls.root) == [a.EXTRAORDINARY_EDITORIAL['sha']]:\n            cls.root = a.EXTRAORDINARY_HISTORY_ROOT\n".encode()
            current=self.files[name]
            self.assertEqual(current.count(addition),1,name)
            self.assertEqual(current.replace(addition,b'',1),self.g.blob(E,name),name)
            for changed in [current+b'\n',current.replace(b'a.EXTRAORDINARY_HISTORY_ROOT',b'a.EXTRAORDINARY_BASELINE'),current.replace(b"== [a.EXTRAORDINARY_EDITORIAL['sha']]",b'!= []')]:
                files={**self.files,name:changed}
                root=self.g.commit(E,seal(files),self.entry['rebind']['author'],self.entry['rebind']['message'])
                with self.subTest(path=name),self.assertRaisesRegex(ValueError,'EXTRAORDINARY_HISTORICAL_SELECTOR'):
                    a.bootstrap(self.g,root)

    def test_each_historical_fixture_is_mandatory_and_cannot_be_removed(self):
        for name in sorted(a.EXTRAORDINARY_HISTORICAL_FIXTURES):
            files=dict(self.files);files.pop(name);registry=json.loads(files[a.LINEAGE_REGISTRY]);registry[-1]['rebind']['files'].remove(name)
            files[a.LINEAGE_REGISTRY]=(json.dumps(registry,indent=2)+'\n').encode()
            root=self.g.commit(E,seal(files),self.entry['rebind']['author'],self.entry['rebind']['message'])
            with self.subTest(path=name),self.assertRaisesRegex(ValueError,'LINEAGE_REBIND_SCOPE'):
                a.bootstrap(self.g,root)

    def test_new_coverage_files_cannot_be_missing_or_expanded(self):
        for kind in ['missing','extra']:
            files=dict(self.files);entry=copy.deepcopy(self.entry)
            if kind=='missing':
                name=next(iter(a.EXTRAORDINARY_TEST_FILES));files.pop(name);entry['rebind']['files'].remove(name)
            else:
                name='scripts/statistical-levels-ci/authority-transition/unauthorized.py';files[name]=b'pass\n';entry['rebind']['files']=sorted([*entry['rebind']['files'],name])
            registry=json.loads(files[a.LINEAGE_REGISTRY]);registry[-1]=entry;files[a.LINEAGE_REGISTRY]=(json.dumps(registry,indent=2)+'\n').encode()
            root=self.g.commit(E,seal(files),entry['rebind']['author'],entry['rebind']['message'])
            with self.subTest(kind=kind),self.assertRaisesRegex(ValueError,'LINEAGE_REBIND_SCOPE'):a.bootstrap(self.g,root)
    def test_ci_supplement_cannot_be_omitted_skipped_or_allowed_to_fail(self):
        for mutation in [b'',a.EXTRAORDINARY_CI_TEST_STEP.replace(b'        shell:',b'        if: false\n        shell:'),a.EXTRAORDINARY_CI_TEST_STEP.replace(b'        shell:',b'        continue-on-error: true\n        shell:'),a.EXTRAORDINARY_CI_TEST_STEP.replace(b'python3 -B',b'true # python3 -B')]:
            files=dict(self.files);files[a.CI]=files[a.CI].replace(a.EXTRAORDINARY_CI_TEST_STEP,mutation)
            root=self.g.commit(E,seal(files),self.entry['rebind']['author'],self.entry['rebind']['message'])
            with self.subTest(mutation=mutation),self.assertRaisesRegex(ValueError,'EXTRAORDINARY_CI_TEST_STEP'):a.bootstrap(self.g,root)
    def test_ci_pin_count_cannot_relax_or_change_other_coverage(self):
        for old,new in [(b'len(pins)==10',b'len(pins)>=7'),(b"('python-main.log',145)",b"('python-main.log',144)"),(b'"${#release_tests[@]}" -eq 40',b'"${#release_tests[@]}" -eq 39')]:
            files=dict(self.files);assert old in files[a.CI];files[a.CI]=files[a.CI].replace(old,new)
            root=self.g.commit(E,seal(files),self.entry['rebind']['author'],self.entry['rebind']['message'])
            with self.subTest(old=old),self.assertRaisesRegex(ValueError,'EXTRAORDINARY_WORKFLOW_PINS|LINEAGE_CI_SCOPE'):a.bootstrap(self.g,root)
    def test_actual_checkout_data_matches_baseline_or_admitted_data_successor(self):
        head=git('rev-parse','HEAD').decode().strip()
        if head in [H,EP,self.root]:reference=X
        else:
            admitted,chain=a.bootstrap(a.Git(REPO),head);self.assertEqual(admitted,self.root);self.assertTrue(chain);reference=head
        for name in a.paths(self.g):self.assertEqual((REPO/name).read_bytes(),git('show',reference+':'+name),name)
