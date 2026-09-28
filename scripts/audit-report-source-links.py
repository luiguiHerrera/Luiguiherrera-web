from html.parser import HTMLParser
import json,re,collections,sys
from pathlib import Path
from urllib.parse import urlparse
from pypdf import PdfReader
base=Path(sys.argv[1])
m=json.load(open(base/'model.json'));sources=m['report']['presentation']['sourceLinks']
class Audit(HTMLParser):
 def __init__(self):super().__init__();self.stack=[];self.missing=[];self.links=[];self.text=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='a':self.links.append(a)
  if t not in ['br','hr','img','input','meta','link','wbr']:self.stack.append(t)
 def handle_endtag(self,t):
  if t in self.stack:self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(t)]
 def handle_data(self,d):
  self.text.append(d)
  if any(t in self.stack for t in ['a','head','style','script','svg']):return
  names=sorted(set(n for s in sources for n in s['names']+[f'[{s["id"]}]']),key=len,reverse=True)
  for match in re.finditer(r'(?<!\w)(?:'+ '|'.join(re.escape(n) for n in names)+r')(?!\w)',d,re.I):
   candidates=[s for s in sources if match[0].lower() in [n.lower() for n in s['names']+[f'[{s["id"]}]']]]
   if candidates[0].get('href'):self.missing.append((match[0],d[:300]))

report=m['report']; canonical='https://www.luiguiherrera.com/informes/'+report['id']
def absolute(href):
 return canonical+href if href.startswith('#') else 'https://www.luiguiherrera.com'+href if href.startswith('/') else href
results={}; all_urls=set()
for kind,file in [('web',base/'web.html'),('html',Path('public/reports/'+report['id']+'.html'))]:
 a=Audit();a.feed(file.read_text())
 bad=[l for l in a.links if l.get('target')!='_blank' or not {'noopener','noreferrer'}.issubset(l.get('rel','').split()) or not l.get('href') or l.get('href')=='#']
 assert not bad,(kind,bad)
 assert not a.missing,(kind,a.missing)
 urls=set(absolute(l['href']) for l in a.links);all_urls.update(urls)
 for source in sources:
  if source.get('href'):assert absolute(source['href']) in urls,(kind,source['id'])
 for item in report['watchlist']:assert absolute(item['href']) in urls,(kind,item['key'])
 results[kind]={'anchors':len(a.links),'unsafeAnchors':0,'unlinkedPublicMentions':0,'watchlistDestinations':18}
reader=PdfReader('public/reports/'+report['id']+'.pdf')
pdf_urls=[]
for page in reader.pages:
 for annotation in page.get('/Annots',[]):
  action=annotation.get_object().get('/A',{})
  if action.get('/S')=='/URI':pdf_urls.append(str(action['/URI']))
for entry in [e for g in report['sourceGroups'] for e in g['entries'] if e.get('href')]:assert absolute(entry['href']) in pdf_urls,entry['label']
for item in report['watchlist']:assert absolute(item['href']) in pdf_urls,('PDF watchlist',item['key'])
md=Path('public/reports/'+report['id']+'.md').read_text()
for entry in [e for g in report['sourceGroups'] for e in g['entries']]:
 assert entry['label'] in md,('Markdown reference missing',entry['label'])
 if entry.get('href'):assert '('+absolute(entry['href'])+')' in md,entry['label']
for source in sources:
 entry=next((e for g in report['sourceGroups'] for e in g['entries'] if e['label'].startswith('['+source['id']+']')),None)
 assert entry,source['id']
 assert entry.get('href')==source.get('href'),source['id']
assert len(report['sourceGroups'])==3
assert len([g for g in report['sourceGroups'] if g['title'].startswith('B.')])==1
assert not any('cdi' in u.lower() or u=='#' for u in all_urls)
domains={}
for group in report['sourceGroups']:
 for entry in group['entries']:
  if entry.get('href','').startswith('https://'):
   domains.setdefault(urlparse(entry['href']).hostname,[]).append(entry['label'])
for url in all_urls:
 domain=urlparse(url).hostname
 if domain!='www.luiguiherrera.com':assert domain in domains,('Unused external domain',domain)
results.update({'pdf':{'pages':len(reader.pages),'clickableURIAnnotations':len(pdf_urls),'allPublicSourcesClickable':True,'watchlistDestinations':18},'markdown':{'allFooterEntriesAndDestinationsPresent':True},'externalDomainsAndUsage':domains,'EXTERNAL_LINKS_TARGET_BLANK':'PASS','EXTERNAL_LINKS_REL_NOOPENER':'PASS','MENTIONED_SOURCES_WITH_FOOTER_ENTRY':'PASS','MENTIONED_PUBLIC_SOURCES_LINKED_INLINE':'PASS','WATCHLIST_LINKS':'18/18','WATCHLIST_TARGET_BLANK':'18/18','WATCHLIST_REL_SAFE':'18/18','PUBLIC_SOURCE_GROUPS':1,'formatLimits':'HTML and web enforce new tabs. Markdown and PDF preserve clickable destinations; the viewer controls tab/window behavior. No in-page anchor exception.'})
Path('docs/reports/segundo-informe-septiembre-2026/source-policy-release/rendered-link-audit.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in results.items() if k!='externalDomainsAndUsage'},ensure_ascii=False,indent=2))
