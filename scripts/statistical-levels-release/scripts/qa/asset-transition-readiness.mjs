// QA completion contract for the existing StatLevelsLab asset/selection render.
// Ownership comes from the current committed data-owning React component.
// Host output is compared only as opaque text: no fixture/oracle or formatter.
export function assetTransitionReadinessExpression(target) {
  if (!target || Object.keys(target).sort().join(',') !== 'asset,frequency,pickerTitle,window' ||
      typeof target.asset !== 'string' || !/^[A-Z0-9]{1,12}$/.test(target.asset) || typeof target.pickerTitle !== 'string' ||
      !target.pickerTitle.length || target.pickerTitle.length > 160 ||
      !['daily', 'weekly', 'monthly'].includes(target.frequency) ||
      !['1Y', '3Y', '5Y', '10Y', 'Full'].includes(target.window)) {
    throw new Error('ASSET_TRANSITION_TARGET_INVALID');
  }
  return `(() => {
    const target = ${JSON.stringify(target)};
    const visible = element => {
      if (!element || !element.isConnected || !element.getClientRects().length) return false;
      for (let node = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (node.hidden || style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
      }
      return true;
    };
    const roots = [...document.querySelectorAll('.sl-page')];
    const panels = [...document.querySelectorAll('#sl-unusual')];
    const pickers = [...document.querySelectorAll('#sl-asset-picker')];
    const interpretations = [...document.querySelectorAll('#sl-interpretation')];
    if (roots.length !== 1 || panels.length !== 1 || pickers.length !== 1 || interpretations.length !== 1) return false;
    const root = roots[0], panel = panels[0], picker = pickers[0], interpretation = interpretations[0];
    if (![panel, picker, interpretation].every(element => element.closest('.sl-page') === root) ||
        !visible(root) || !visible(panel) || !visible(interpretation) || !visible(picker.querySelector('summary'))) return false;
    const params = new URLSearchParams(location.search);
    if (params.has('symbol') || ['asset', 'frequency', 'window'].some(key => params.getAll(key).length !== 1) || params.get('asset') !== target.asset || params.get('frequency') !== target.frequency || params.get('window') !== target.window) return false;
    const selected = [...picker.querySelectorAll('.sl-picker-group button[aria-pressed="true"]')];
    if (selected.length !== 1 || selected[0].title !== target.pickerTitle) return false;
    const ticker = ({ BTCUSD: 'BTC/USDT', ETHUSD: 'ETH/USDT' })[target.asset] ?? target.asset;
    if (selected[0].textContent.trim() !== ticker || picker.querySelector('summary strong')?.textContent.trim() !== ticker) return false;
    const context = [...interpretation.querySelectorAll('.sl-context span')];
    if (context.length !== 2 || !context[0].textContent.startsWith(ticker + ' · ')) return false;
    const options = root.querySelectorAll('#sl-options label select');
    if (options.length !== 2 || options[0].value !== target.frequency || options[1].value !== target.window) return false;
    const regionContext = panel.querySelector('.sl-section-heading p')?.textContent.trim();
    if (!regionContext || regionContext !== context[1].textContent.split('·').slice(0, 2).map(part => part.trim()).join(' · ')) return false;
    const values = [...panel.querySelectorAll('dd')];
    if (values.length !== 3 || !values.every(element => element.isConnected && visible(element))) return false;
    // An expando may reference an alternate. Only the actual current root's
    // downward child/sibling graph can attest membership; return pointers alone
    // are not current ancestry. Unknown runtime shapes fail closed.
    const fiberKeys = Object.keys(panel).filter(key => key.startsWith('__reactFiber$'));
    if (fiberKeys.length !== 1) return false;
    let top = panel[fiberKeys[0]];
    const climbs = new Set();
    while (top?.return) {
      if (climbs.has(top) || climbs.size >= 200) return false;
      climbs.add(top); top = top.return;
    }
    const current = top?.stateNode?.current;
    if (!current || current.tag !== 3 || current.stateNode?.current !== current) return false;
    const wanted = new Set([root, panel, ...values]), found = new Map(), seen = new Set();
    const expectedValues = [];
    const stack = [{ fiber: current, owners: [], hosts: [] }];
    while (stack.length) {
      const { fiber, owners, hosts } = stack.pop();
      if (!fiber || seen.has(fiber) || seen.size >= 20000) return false;
      seen.add(fiber);
      const props = fiber.memoizedProps;
      const dataOwner = fiber.tag === 0 && typeof fiber.type === 'function' &&
        props?.asset && typeof props.asset === 'object' && props.selection && typeof props.selection === 'object';
      const nextOwners = dataOwner ? [...owners, fiber] : owners;
      if (wanted.has(fiber.stateNode)) {
        if (found.has(fiber.stateNode)) return false;
        found.set(fiber.stateNode, { fiber, owners: nextOwners, hosts });
      }
      if (fiber.tag === 5 && fiber.type === 'dd' && hosts.includes(panel)) expectedValues.push(fiber.stateNode);
      const nextHosts = fiber.tag === 5 ? [...hosts, fiber.stateNode] : hosts;
      if (fiber.sibling) stack.push({ fiber: fiber.sibling, owners, hosts });
      if (fiber.child) stack.push({ fiber: fiber.child, owners: nextOwners, hosts: nextHosts });
    }
    if (found.size !== wanted.size || expectedValues.length !== 3 ||
        expectedValues.some((element, index) => element !== values[index])) return false;
    const panelEntry = found.get(panel);
    if (panelEntry.owners.length !== 1 || panelEntry.fiber.memoizedProps?.id !== 'sl-unusual') return false;
    const owner = panelEntry.owners[0], props = owner.memoizedProps;
    const language = document.documentElement.lang;
    if (!['es', 'en'].includes(language) || props.locale !== language ||
        props.asset.ticker !== target.asset || props.selection.asset !== target.asset ||
        props.selection.frequency !== target.frequency || props.selection.window !== target.window ||
        !Object.hasOwn(props.asset.frequencies ?? {}, target.frequency) ||
        !Object.hasOwn(props.asset.frequencies[target.frequency]?.windows ?? {}, target.window)) return false;
    for (const element of wanted) {
      const entry = found.get(element), fiber = entry.fiber;
      if (entry.owners.length !== 1 || entry.owners[0] !== owner || fiber.tag !== 5 ||
          fiber.type !== element.tagName.toLowerCase()) return false;
      if (element !== root) {
        const boundary = element === panel ? root : panel;
        const boundaryIndex = entry.hosts.indexOf(boundary);
        if (boundaryIndex < 0) return false;
        const expectedAncestors = entry.hosts.slice(boundaryIndex).reverse();
        let actual = element.parentElement;
        for (const ancestor of expectedAncestors) {
          if (actual !== ancestor) return false;
          actual = actual.parentElement;
        }
      }
    }
    // These are already-rendered host children, never recomputed expected
    // metrics. Primitive concatenation mirrors DOM text, not numeric formatting.
    const opaqueText = value => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
      if (Array.isArray(value)) {
        const parts = value.map(opaqueText);
        return parts.some(part => part === null) ? null : parts.join('');
      }
      return null;
    };
    for (const element of values) {
      const fiber = found.get(element).fiber;
      const keys = Object.keys(element).filter(key => key.startsWith('__reactProps$'));
      if (keys.length !== 1 || element[keys[0]] !== fiber.memoizedProps || element.childElementCount !== 0) return false;
      const committedText = opaqueText(fiber.memoizedProps.children);
      if (committedText === null || element.textContent !== committedText) return false;
    }
    return current.stateNode.current === current;
  })()`;
}

export async function waitForAssetTransition(client, target, { timeoutMs = 10000, pollMs = 25 } = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 10000 ||
      !Number.isFinite(pollMs) || pollMs <= 0 || pollMs > timeoutMs) {
    throw new Error('ASSET_TRANSITION_WAIT_INVALID');
  }
  const expression = assetTransitionReadinessExpression(target);
  const deadline = performance.now() + timeoutMs;
  const timedOut = () => new Error('ASSET_TRANSITION_READINESS_TIMEOUT');
  for (;;) {
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw timedOut();
    let timer;
    const ready = await Promise.race([
      Promise.resolve().then(() => client.evaluate(expression)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(timedOut()), remaining); }),
    ]).finally(() => clearTimeout(timer));
    if (performance.now() >= deadline) throw timedOut();
    if (ready === true) return;
    await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, deadline - performance.now())));
  }
}
