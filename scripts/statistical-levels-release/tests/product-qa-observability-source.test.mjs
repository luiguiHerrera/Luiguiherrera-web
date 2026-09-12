import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
const sha = value => createHash('sha256').update(value).digest('hex');
const observerPrefix = 'globalThis.__SL_RELEASE_QA__?.observability?.';
const names = ['qa-statistical-levels.mjs', 'qa-statistical-levels-defects.mjs', 'qa-statistical-levels-interaction-polish.mjs'];
const expected = {
  "qa-statistical-levels.mjs": {
    "ast_sha256": "ca894ded3ab52f465a71775ce47a52b407548a13ceaea1d12ec5f423612c1d0d",
    "lines": 161,
    "assertion_count": 34,
    "assertions_sha256": "8498855f81f3c091839227ef8db34e1c0e66dd33ab1e9694bdbea1a560b2d89a",
    "await_count": 141,
    "sleep_call_count": 12,
    "source_sha256": "eb131de3cca2a3a86c1085d49c1adf0cfd707306308d2269d06a438517dc03e4"
  },
  "qa-statistical-levels-defects.mjs": {
    "ast_sha256": "f888b572a6b631c8db0650020e57e95145323e912f49294c61616bcc903a5541",
    "lines": 114,
    "assertion_count": 31,
    "assertions_sha256": "f667157e63708f63c4695d7a58bc9b110e5a92ed586f9057bed8ff85f63aef4b",
    "await_count": 70,
    "sleep_call_count": 6,
    "source_sha256": "072d0dfe69a4daedacdbd4dd3380d98e81b083b5020e627373d54632289321c6"
  },
  "qa-statistical-levels-interaction-polish.mjs": {
    "ast_sha256": "8731ba955816a29d596c579d513508dbd43d0c607d53a6ebfa648532495e3cf3",
    "lines": 163,
    "assertion_count": 47,
    "assertions_sha256": "d63d76559c3169914345ce422dc710507b7021a493b79e89ded2822ba8740216",
    "await_count": 107,
    "sleep_call_count": 8,
    "source_sha256": "5928e91f923276f12fdac7b1ebd050e748da0257cae5fcdc0b43d667e7b83723"
  }
};
function parse(text, name) { return ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS); }
function observerCall(node, source) {
  return ts.isCallExpression(node) && ['context', 'viewportStart', 'viewportEnd', 'captureFailure'].some(name => node.expression.getText(source) === observerPrefix + name);
}
function stripObservers(source) {
  const transformed = ts.transform(source, [context => {
    const flatten = node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.CommaToken ? [...flatten(node.left), ...flatten(node.right)] : [node];
    const visit = node => {
      if (ts.isExpressionStatement(node) && observerCall(node.expression, source)) return undefined;
      if (ts.isExpressionStatement(node) && ts.isVoidExpression(node.expression) && ts.isParenthesizedExpression(node.expression.expression) && flatten(node.expression.expression.expression).some(part => observerCall(part, source))) {
        return ts.factory.updateExpressionStatement(node, ts.visitNode(node.expression.expression, visit));
      }

      if (ts.isParenthesizedExpression(node)) {
        const parts = flatten(node.expression);
        if (parts.some(part => observerCall(part, source))) {
          const original = parts.filter(part => !observerCall(part, source));
          assert.equal(original.length, 1, 'observer wrapper must contain exactly one unchanged original expression');
          return ts.visitNode(original[0], visit);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return node => ts.visitNode(node, visit);
  }]);
  const result = transformed.transformed[0]; transformed.dispose(); return result;
}
const print = source => ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(source);
function collect(source, predicate) { const found = []; function visit(node) { if (predicate(node)) found.push(node); ts.forEachChild(node, visit); } visit(source); return found; }
const sources = await Promise.all(names.map(async name => { const text = await fs.readFile(new URL('../scripts/qa/' + name, import.meta.url), 'utf8'); return { name, text, ast: parse(text, name) }; }));
for (const { name, text, ast } of sources) {
  test(name + ': stripping only observer nodes restores the exact frozen executable AST', () => {
    assert.equal(ast.parseDiagnostics.length, 0);
    assert.equal(sha(print(stripObservers(ast))), expected[name].ast_sha256);
    assert.equal(text.split('\n').length, expected[name].lines, 'declared original source lines remain exact candidate lines');
  });
  test(name + ': every original assertion retains exact callee, arguments and source line', () => {
    const calls = collect(ast, node => ts.isCallExpression(node) && /^assert\./.test(node.expression.getText(ast)));
    const records = calls.map(node => ({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, source: node.getText(ast) }));
    assert.equal(calls.length, expected[name].assertion_count); assert.equal(sha(JSON.stringify(records)), expected[name].assertions_sha256);
    for (const call of calls) {
      assert.equal(collect(call, node => observerCall(node, ast)).length, 0, 'assertion argument expressions must contain no instrumentation');
      assert.ok(ts.isBinaryExpression(call.parent) && call.parent.operatorToken.kind === ts.SyntaxKind.CommaToken, 'context is outside original assertion');
    }
  });
  test(name + ': observer calls are conditional, synchronous and contain no application action', () => {
    const calls = collect(ast, node => observerCall(node, ast)); assert.ok(calls.length > 0);
    for (const call of calls) {
      assert.ok(call.expression.getText(ast).startsWith(observerPrefix));
      assert.ok(!ts.isAwaitExpression(call.parent));
      for (const nested of collect(call, node => ts.isCallExpression(node) && node !== call)) {
        assert.ok(/\.startsWith$/.test(nested.expression.getText(ast)), 'metadata may only derive locale from existing route strings');
      }
    }
    assert.equal(collect(ast, node => ts.isAwaitExpression(node)).length, expected[name].await_count);
    assert.equal(collect(ast, node => ts.isCallExpression(node) && node.expression.getText(ast) === 'sleep').length, expected[name].sleep_call_count);
  });
  test(name + ': first underlying error is captured before unchanged generic suite failure', () => {
    const caught = collect(ast, ts.isCatchClause); assert.equal(caught.length, 1);
    const body = caught[0].block.statements;
    assert.equal(body[0].expression.expression.getText(ast), observerPrefix + 'captureFailure');
    assert.equal(body[0].expression.arguments[0].getText(ast), 'error');
    const execute = new Function('error', 'report', 'process', 'console', 'globalThis', body.map(node => node.getText(ast)).join('\n'));
    const failure = new assert.AssertionError({ actual: ['wrong'], expected: ['expected'], operator: 'deepStrictEqual', message: 'qualified exact assertion' });
    const order = [], report = { PASS: false }, process = { exitCode: 0 }, console = { error: code => order.push(code) };
    const observability = { captureFailure: error => { assert.equal(error, failure); assert.deepEqual(error.actual, ['wrong']); assert.deepEqual(error.expected, ['expected']); order.push('CAPTURE_AND_SYNC_FLUSH'); return error; }, viewportEnd: () => order.push('VIEWPORT_FAILURE') };
    execute(failure, report, process, console, { __SL_RELEASE_QA__: { observability } });
    assert.equal(order[0], 'CAPTURE_AND_SYNC_FLUSH'); assert.equal(order.at(-1), 'PRODUCT_ASSERTION_FAILED');
    assert.equal(process.exitCode, 1); assert.equal(report.failure, 'PRODUCT_ASSERTION_FAILED');
    const without = { PASS: false }, oldProcess = { exitCode: 0 }, oldOrder = [];
    execute(failure, without, oldProcess, { error: code => oldOrder.push(code) }, { __SL_RELEASE_QA__: {} });
    assert.deepEqual(without, report); assert.equal(oldProcess.exitCode, process.exitCode); assert.deepEqual(oldOrder, ['PRODUCT_ASSERTION_FAILED']);
  });
}

test('actual instrumented main metric assertion preserves expected/actual and exact assertion context', async () => {
  const { ast } = sources[0], declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === 'metricCheck');
  const fn = new Function('assert', 'readJson', 'format', 'globalThis', declaration.getText(ast) + ';return metricCheck;');
  const seen = [], m = { available: true, sessions: 41, ma200ExtensionPercentile: 50, ma200ExtensionZScore: 1 };
  const fixture = { frequencies: { weekly: { windows: { '5Y': m } } } };
  const metricCheck = fn(assert, async () => fixture, (v, d = 2) => v.toFixed(d), { __SL_RELEASE_QA__: { observability: { context: value => seen.push(value) } } });
  let reads = 0;
  await assert.rejects(metricCheck({ evaluate: async () => { reads++; return ['wrong']; } }, 'SPY', 'weekly', '5Y'), error => {
    assert.ok(error instanceof assert.AssertionError); assert.deepEqual(error.actual, ['wrong']); assert.deepEqual(error.expected, ['50.0', '+1.00', '2']);
    assert.equal(seen.at(-1).assertion_id, 'sl-main:L52:C3'); assert.equal(seen.at(-1).source_line, 52); assert.equal(seen.at(-1).test_name, 'metricCheck SPY/weekly/5Y'); return true;
  });
  assert.equal(reads, 1, 'instrumentation cannot retry the browser read');
});

test('original load calls execute once with unchanged arguments and explicit viewport chronology', async () => {
  const { ast } = sources[0];
  const loadCall = collect(ast, node => ts.isCallExpression(node) && node.expression.getText(ast) === 'load' && ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1 === 57)[0];
  let expression = loadCall; while (expression.parent && !ts.isParenthesizedExpression(expression)) expression = expression.parent;
  const events = [], page = {}, routes = { es: '/niveles-estadisticos' };
  const run = new Function('globalThis', 'load', 'c', 'routes', 'locale', 'name', 'width', 'height', 'return ' + expression.getText(ast));
  const observer = Object.fromEntries(['context', 'viewportStart', 'viewportEnd'].map(method => [method, (...args) => events.push({ method, args })]));
  let calls = 0;
  const load = (...args) => { calls++; assert.deepEqual(args, [page, routes.es, 390, 844]); return 'same-original-result'; };
  assert.equal(run({ __SL_RELEASE_QA__: { observability: observer } }, load, page, routes, 'es', 'mobile-primary-es', 390, 844), 'same-original-result');
  assert.equal(calls, 1); assert.deepEqual(events.map(x => x.method), ['context', 'viewportEnd', 'viewportStart']);
  assert.deepEqual(events.at(-1).args[0], { id: 'mobile-primary-es', width: 390, height: 844, locale: 'es' });
  assert.equal(events.at(-1).args[1].route, '/niveles-estadisticos'); assert.equal(events.at(-1).args[1].result_scope, 'NAVIGATION_SUBSTAGE');
  events.length = 0;
  assert.equal(run({ __SL_RELEASE_QA__: {} }, load, page, routes, 'es', 'mobile-primary-es', 390, 844), 'same-original-result');
  assert.equal(calls, 2); assert.equal(events.length, 0);
});
