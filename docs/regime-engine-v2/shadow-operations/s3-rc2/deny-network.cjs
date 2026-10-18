'use strict';
/* eslint-disable @typescript-eslint/no-require-imports -- Synchronous CommonJS is required for the inherited Node --require audit preload. */
/** Verification instrumentation, never imported by the product.
 * Load once with NODE_OPTIONS=--require=<absolute path>. Child Node processes
 * and Workers inherit the preload. Loopback and Unix IPC remain available for
 * Next/Turbopack. Tests may explicitly replace writable mocks such as fetch.
 * This is a Node API guard, not a kernel/native/non-Node network sandbox.
 */
const marker = Symbol.for('regime-v2.rc2.network-guard');
if (!globalThis[marker]) {
  const fs = require('node:fs');
  const path = require('node:path');
  const http = require('node:http');
  const https = require('node:https');
  const net = require('node:net');
  const tls = require('node:tls');
  const { syncBuiltinESMExports } = require('node:module');
  const { threadId } = require('node:worker_threads');
  const state = { policy: 'NODE_OUTBOUND_DENY_LOOPBACK_ALLOWED', denied: [] };
  Object.defineProperty(globalThis, marker, { value: state });
  const log = process.env.REGIME_NETWORK_GUARD_LOG;
  if (log && !path.isAbsolute(log)) throw new Error('REGIME_NETWORK_GUARD_LOG must be an absolute audit output path');
  function record(event, layer) {
    // No address, URL, query, header, payload, environment or credential values.
    if (log) fs.appendFileSync(log, JSON.stringify({ event, layer, pid: process.pid, threadId }) + '\n', { mode: 0o600 });
  }
  const loopback = host => ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host || '').toLowerCase());
  function denied(layer) {
    state.denied.push(layer); record('OUTBOUND_NETWORK_DENIED', layer);
    const error = new Error('Outbound network disabled for RC2 verification');
    error.code = 'REGIME_RC2_NETWORK_DENIED';
    throw error;
  }
  function parsed(value) { try { return new URL(value); } catch { return null; } }
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async function(input, ...args) {
    const url = parsed(input instanceof URL ? input.href : typeof input === 'string' ? input : input?.url);
    if (url && ['http:', 'https:'].includes(url.protocol) && !loopback(url.hostname)) denied('fetch');
    return originalFetch.call(this, input, ...args);
  };
  function httpHost(args, protocol) {
    const first = args[0], url = first instanceof URL || typeof first === 'string' ? parsed(String(first)) : null;
    const options = first && typeof first === 'object' && !(first instanceof URL) ? first
      : args[1] && typeof args[1] === 'object' && !(args[1] instanceof URL) ? args[1] : {};
    if (options.socketPath) return null;
    const host = options.hostname || options.host || url?.hostname || 'localhost';
    if (String(host).includes(':') && !['::1', '[::1]'].includes(host)) return parsed(`${protocol}//${host}`)?.hostname || host;
    return host;
  }
  for (const [api, protocol, label] of [[http, 'http:', 'http'], [https, 'https:', 'https']]) {
    for (const method of ['request', 'get']) {
      const original = api[method];
      api[method] = function(...args) {
        const host = httpHost(args, protocol);
        if (host !== null && !loopback(host)) denied(`${label}.${method}`);
        return original.apply(this, args);
      };
    }
  }
  function socketHost(args) {
    if (Array.isArray(args[0])) return socketHost(args[0]);
    const first = args[0];
    if (typeof first === 'string' && !/^\d+$/.test(first)) return null; // Unix/named pipe path.
    const options = first && typeof first === 'object' ? first : args[1] && typeof args[1] === 'object' ? args[1] : {};
    if (options.path) return null;
    return options.host || options.hostname || options.socket?.remoteAddress || (typeof args[1] === 'string' ? args[1] : 'localhost');
  }
  for (const [api, method, label] of [[net, 'connect', 'net.connect'], [net, 'createConnection', 'net.createConnection'], [net.Socket.prototype, 'connect', 'net.Socket.connect'], [tls, 'connect', 'tls.connect']]) {
    const original = api[method];
    api[method] = function(...args) {
      const host = socketHost(args);
      if (host !== null && !loopback(host)) denied(label);
      return original.apply(this, args);
    };
  }
  syncBuiltinESMExports();
  record('NETWORK_GUARD_LOADED', 'bootstrap');
}
