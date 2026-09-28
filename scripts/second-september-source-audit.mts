import './trends-test-register.mjs';
import {registerHooks} from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
registerHooks({resolve(s,c,n){if(s==='next/image') return n('next/image.js',c);return n(s,c);}});
const {default:React}=await import('react');
const {renderToStaticMarkup}=await import('react-dom/server');
const {secondSeptember2026Report:report,secondSeptember2026AutomaticReadings:automaticReadings}=await import('../lib/reports/second-september-2026.ts');
const {MarketReportContent}=await import('../components/reports/MarketReportContent.tsx');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'report-source-audit-'));
try {
 fs.writeFileSync(path.join(temp,'web.html'),renderToStaticMarkup(React.createElement(MarketReportContent,{report,automaticReadings})));
 fs.writeFileSync(path.join(temp,'model.json'),JSON.stringify({report,automaticReadings}));
 const r=spawnSync(process.env.REPORTS_PYTHON??'python3',['scripts/audit-report-source-links.py',temp],{stdio:'inherit'});
 if(r.status!==0) process.exitCode=1;
} finally {fs.rmSync(temp,{recursive:true,force:true});}
