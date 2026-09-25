import test from 'node:test';import assert from 'node:assert/strict';
import {probeBrowserHeaders} from '../scripts/probe-toolbar-policy.mjs';
const origin='https://luiguiherrera-toolbarfixture-luigui-herrera-s-projects.vercel.app';
for(const [name,options,expected]of [
 ['probe Document',{url:origin+'/page',origin,resourceType:'Document'},'1'],
 ['production',{url:origin,origin,resourceType:'Document',production:true},undefined],
 ['external Document',{url:'https://other.example',origin,resourceType:'Document'},undefined],
 ['redirect external',{url:'https://other.example/redirect',origin,resourceType:'Document'},undefined],
 ['same-origin script',{url:origin,origin,resourceType:'Script'},undefined],
 ['same-origin RSC',{url:origin,origin,resourceType:'XHR'},undefined],
])test(name+' has minimum toolbar header scope',()=>{const input={'X-Vercel-Skip-Toolbar':'hostile','x-vercel-trusted-oidc-idp-token':'synthetic',Accept:'text/html'};const output=probeBrowserHeaders(input,options);assert.equal(output['x-vercel-skip-toolbar'],expected);assert.equal(output['X-Vercel-Skip-Toolbar'],undefined);assert.equal(output['x-vercel-trusted-oidc-idp-token'],'synthetic');assert.equal(output.Accept,'text/html');assert.equal(input['X-Vercel-Skip-Toolbar'],'hostile');});
