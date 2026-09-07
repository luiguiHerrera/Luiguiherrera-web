import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';

export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
export const newRunId = () => new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID();
export function requireValue(condition, code) { if (!condition) throw new Error(code); }

export function runtimeConfig(env = process.env, real = false) {
  requireValue(env.GITHUB_ACTIONS === 'true' && env.GITHUB_REF === 'refs/heads/vercel-deployment', 'UNTRUSTED_RUNTIME');
  requireValue(env.GITHUB_REPOSITORY === 'luiguiHerrera/Luiguiherrera-web', 'UNTRUSTED_REPOSITORY');
  if (real) requireValue(env.STAT_LEVELS_RAW_AUTHORITY_READY === 'true', 'RAW_AUTHORITY_NOT_READY');
  requireValue(env.STAT_LEVELS_AWS_REGION === 'eu-south-2', 'INVALID_REGION');
  requireValue(env.STAT_LEVELS_RAW_BUCKET === 'sl-raw-authority-f9f4587745fa332cccfe', 'INVALID_BUCKET');
  const role = /^arn:aws:iam::(\d{12}):role\/LuiguiHerreraStatisticalLevelsRawAuthority$/.exec(env.STAT_LEVELS_RAW_ROLE_ARN ?? '');
  requireValue(role && !env.AWS_PROFILE && !env.AWS_DEFAULT_PROFILE, 'INVALID_ROLE_OR_PROFILE');
  requireValue(/^ASIA[A-Z0-9]{16}$/.test(env.AWS_ACCESS_KEY_ID ?? '') && env.AWS_SECRET_ACCESS_KEY && env.AWS_SESSION_TOKEN, 'TEMPORARY_OIDC_CREDENTIALS_REQUIRED');
  return { bucket: env.STAT_LEVELS_RAW_BUCKET, region: env.STAT_LEVELS_AWS_REGION, account: role[1], roleArn: env.STAT_LEVELS_RAW_ROLE_ARN };
}

// Only AWS CLI JSON is consumed. Raw stderr (which could contain credentials or
// request headers) is never propagated to logs, errors or evidence.
export class S3Store {
  constructor(config) {
    this.config = config;
    this.temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-s3-'));
    fs.chmodSync(this.temp, 0o700);
    this.env = { ...process.env, AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off', AWS_EC2_METADATA_DISABLED: 'true', AWS_MAX_ATTEMPTS: '1' };
  }
  close() { fs.rmSync(this.temp, { recursive: true, force: true }); }
  cli(service, operation, args) {
    try {
      return JSON.parse(execFileSync('aws', [service, operation, ...args, '--region', this.config.region, '--output', 'json', '--no-cli-pager'], { env: this.env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90000, maxBuffer: 4 * 1024 * 1024 }) || '{}');
    } catch (error) {
      const code = /An error occurred \(([^)]+)\)/.exec(String(error.stderr))?.[1];
      throw new Error(['AccessDenied', 'PreconditionFailed', 'NoSuchKey', 'NoSuchVersion'].includes(code) ? code : 'AWS_OPERATION_FAILED');
    }
  }
  async identity() {
    const who = this.cli('sts', 'get-caller-identity', []);
    requireValue(who.Account === this.config.account && who.Arn.startsWith(`arn:aws:sts::${this.config.account}:assumed-role/LuiguiHerreraStatisticalLevelsRawAuthority/`), 'CALLER_ROLE_MISMATCH');
  }
  args(key) { return ['--bucket', this.config.bucket, '--key', key, '--expected-bucket-owner', this.config.account]; }
  async put(key, bytes, { condition = true } = {}) {
    const file = path.join(this.temp, randomUUID());
    fs.writeFileSync(file, bytes, { mode: 0o600 });
    try {
      const result = this.cli('s3api', 'put-object', [...this.args(key), '--body', file, ...(condition ? ['--if-none-match', '*'] : []), '--server-side-encryption', 'AES256', '--storage-class', 'STANDARD', '--checksum-algorithm', 'SHA256', '--checksum-sha256', Buffer.from(hash(bytes), 'hex').toString('base64')]);
      requireValue(result.VersionId && result.VersionId !== 'null', 'VERSIONING_REQUIRED');
      requireValue(result.ServerSideEncryption === 'AES256', 'SSE_MISMATCH');
      return { version: result.VersionId };
    } finally { fs.rmSync(file, { force: true }); }
  }
  async get(key, version) {
    const file = path.join(this.temp, randomUUID());
    try {
      const metadata = this.cli('s3api', 'get-object', [...this.args(key), ...(version ? ['--version-id', version] : []), '--checksum-mode', 'ENABLED', file]);
      const bytes = fs.readFileSync(file);
      requireValue(metadata.ServerSideEncryption === 'AES256', 'SSE_READBACK_MISMATCH');
      requireValue(metadata.ChecksumSHA256 === Buffer.from(hash(bytes), 'hex').toString('base64'), 'S3_CHECKSUM_MISMATCH');
      return { bytes, version: metadata.VersionId };
    } finally { fs.rmSync(file, { force: true }); }
  }
  async retention(key, version) {
    return this.cli('s3api', 'get-object-retention', [...this.args(key), '--version-id', version]).Retention;
  }
  async delete(key) { this.cli('s3api', 'delete-object', this.args(key)); }
  async retain(key, version, retention, bypass = false) {
    this.cli('s3api', 'put-object-retention', [...this.args(key), '--version-id', version, '--retention', JSON.stringify(retention), ...(bypass ? ['--bypass-governance-retention'] : [])]);
  }
}

export function verifyRetention(retention, createdAt = Date.now()) {
  const expected = new Date(createdAt); expected.setUTCFullYear(expected.getUTCFullYear() + 5);
  requireValue(retention?.Mode === 'GOVERNANCE' && Math.abs(Date.parse(retention.RetainUntilDate) - expected.getTime()) < 10 * 60 * 1000, 'FIVE_YEAR_RETENTION_REQUIRED');
}

export async function putVerified(store, key, bytes) {
  const createdAt = Date.now(), { version } = await store.put(key, bytes);
  const read = await store.get(key, version);
  requireValue(read.version === version && read.bytes.equals(bytes) && hash(read.bytes) === hash(bytes), 'READBACK_MISMATCH');
  const retention = await store.retention(key, version);
  verifyRetention(retention, createdAt);
  return { SHA256: hash(bytes), VERSION_ID: version, BYTES: bytes.length, RETENTION: retention, bytes: read.bytes };
}

// Reject known runtime secrets and recognizable unmasked credential formats.
// Call before writing evidence. Never print the matching value.
export function assertNoSecrets(text, env = process.env) {
  const secrets = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'].map(k => env[k]).filter(v => v?.length > 8);
  requireValue(!secrets.some(v => text.includes(v)), 'SECRET_LEAK');
  requireValue(!/(?:AKIA|ASIA)[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/.test(text), 'SECRET_LEAK');
  requireValue(!/(?:authorization:\s*(?:bearer|basic)\s+(?!\*\*\*)\S+|(?:set-cookie|cookie):\s*(?!\*\*\*)[^\s]+)/i.test(text), 'SECRET_LEAK');
}
