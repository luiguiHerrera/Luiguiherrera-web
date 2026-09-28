export type ReportSourceLink = { id: string; names: string[]; href?: string };
export type SourceSegment = { text: string; href?: string; sourceId?: string };
const escapePattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Literal mentions and citation IDs; a citation in the paragraph disambiguates repeat publishers. */
export function sourceSegments(text: string, sources: ReportSourceLink[]): SourceSegment[] {
  if (!sources.length) return [{text}];
  const names = [...new Set(sources.flatMap(s => [...s.names, `[${s.id}]`]))].sort((a,b)=>b.length-a.length);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escapePattern).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const result: SourceSegment[]=[];let end=0;
  for (const match of text.matchAll(pattern)) {
    const value=match[0],start=match.index!;
    if(start>end) result.push({text:text.slice(end,start)});
    const candidates=sources.filter(s=>`[${s.id}]`.toLowerCase()===value.toLowerCase()||s.names.some(n=>n.toLowerCase()===value.toLowerCase()));
    const source=candidates.find(s=>text.includes(`[${s.id}]`))??candidates[0];
    result.push({text:value,...(source?.href ? {href:source.href,sourceId:source.id}: {})});end=start+value.length;
  }
  if(end<text.length) result.push({text:text.slice(end)});
  return result;
}

const site = 'https://www.luiguiherrera.com';
export const absoluteReportLink = (href: string, canonical: string) => href.startsWith('#') ? canonical + href : href.startsWith('/') ? site + href : href;
const escapeHtml = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const decodeHtml = (value: string) => value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
/** Generated HTML only: preserve markup, never nest anchors or alter scripts/styles/metadata. */
export function sourcePolicyHtml(html: string, sources: ReportSourceLink[], canonical: string): string {
  const stack: string[]=[];
  return html.split(/(<[^>]*>)/g).map(part=>{
    if(part.startsWith('<')) {
      const tag=part.match(/^<\/?([a-z][\w-]*)\b/i)?.[1]?.toLowerCase();
      if(tag && /^<\//.test(part)) {const i=stack.lastIndexOf(tag);if(i>=0)stack.splice(i);}
      else if(tag && !['meta','link','br','hr','img','input','source','wbr'].includes(tag) && !part.endsWith('/>')) stack.push(tag);
      if(tag==='a' && !part.startsWith('</')) return part.replace(/\s(?:target|rel|download)\s*=\s*(?:"[^"]*"|'[^']*')/gi,'').replace(/href="([^"]+)"/i,(_,href)=>`href="${escapeHtml(absoluteReportLink(decodeHtml(href),canonical))}"`).replace(/>$/,' target="_blank" rel="noopener noreferrer">');
      return part;
    }
    if(stack.some(tag=>['a','head','script','style','svg'].includes(tag))) return part;
    return sourceSegments(decodeHtml(part),sources).map(s=>s.href ? `<a href="${escapeHtml(absoluteReportLink(s.href,canonical))}" target="_blank" rel="noopener noreferrer" data-source-id="${s.sourceId}">${escapeHtml(s.text)}</a>` : escapeHtml(s.text)).join('');
  }).join('');
}
/** Keep existing Markdown links (including nested citation brackets), images and URLs intact. */
export function sourcePolicyMarkdown(markdown: string, sources: ReportSourceLink[], canonical: string): string {
  return markdown.split(/(\n\s*\n)/g).map(paragraph => paragraph.split(/(!?\[(?:[^\[\]]|\[[^\]]*\])*\]\([^\s)]+\)|https?:\/\/[^\s)]+)/g).map((part,i)=>i%2 ? part : sourceSegments(part,sources).map(s=>s.href ? `[${s.text}](${absoluteReportLink(s.href,canonical)})` : s.text).join('')).join('')).join('');
}
