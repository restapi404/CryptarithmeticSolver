// ══════════════════════════════════════════════
//  HELPER — load example into input
// ══════════════════════════════════════════════
function load(p) { document.getElementById('inp').value = p; }

// Compute P(10,n) = 10 × 9 × ... × (10-n+1)
// = total permutations of n digits chosen from 0-9
function P10(n) {
  let r = 1;
  for (let i = 10; i > 10 - n; i--) r *= i;
  return r;
}

// ══════════════════════════════════════════════
//  STEP 1 — PARSE
//  Read the raw string and extract words + letters
// ══════════════════════════════════════════════
function parse(raw) {
  const s = raw.replace(/\s+/g, '').toUpperCase();

  if (!s.includes('=') || !s.includes('+'))
    throw 'Format must be: WORD + WORD = WORD';

  const [left, right] = s.split('=');
  const words = left.split('+').concat([right]);

  for (const w of words)
    if (!/^[A-Z]+$/.test(w)) throw 'Words must contain letters only.';

  // Unique letters, sorted
  const letters = [...new Set(words.join(''))].sort();

  if (letters.length > 10)
    throw `Too many unique letters (${letters.length}). Maximum is 10.`;

  // First letter of each word — cannot map to 0
  const leading = new Set(words.map(w => w[0]));

  return { words, letters, leading };
}

// ══════════════════════════════════════════════
//  STEP 2 — CHECK ONE ASSIGNMENT
//  Given map {letter → digit}, test the equation
// ══════════════════════════════════════════════
function check(words, leading, map) {
  // Constraint: leading letters cannot be 0
  for (const l of leading)
    if (map[l] === 0) return null;

  // Convert each word to its number using the map
  const nums = words.map(w =>
    Number(w.split('').map(c => map[c]).join(''))
  );

  // Sum of addends must equal the result word
  const addends = nums.slice(0, -1);
  const result  = nums[nums.length - 1];
  return addends.reduce((a, b) => a + b, 0) === result ? nums : null;
}

// ══════════════════════════════════════════════
//  STEP 3 — BRUTE FORCE
//  Generate ALL permutations; test each one
// ══════════════════════════════════════════════
function bruteForce(words, letters, leading, onTick) {
  const n     = letters.length;
  const total = P10(n);
  let tried   = 0;

  // Recursive generator: pick n digits from pool without repeating
  function* permutations(chosen, pool) {
    if (chosen.length === n) { yield chosen; return; }
    for (let i = 0; i < pool.length; i++) {
      yield* permutations(
        chosen.concat(pool[i]),
        pool.filter((_, j) => j !== i)
      );
    }
  }

  const digits = [0,1,2,3,4,5,6,7,8,9];

  for (const perm of permutations([], digits)) {
    tried++;

    // Build the letter→digit map for this permutation
    const map = {};
    for (let i = 0; i < n; i++) map[letters[i]] = perm[i];

    // Update the progress bar every 5000 attempts
    if (tried % 5000 === 0) onTick(tried, total, map);

    // Test this assignment
    const nums = check(words, leading, map);
    if (nums) return { map, nums, tried, total };   // found!
  }

  return { map: null, nums: null, tried, total };   // no solution
}

// ══════════════════════════════════════════════
//  UI — SOLVE (main entry point)
// ══════════════════════════════════════════════
function solve() {
  const raw      = document.getElementById('inp').value.trim();
  const btn      = document.getElementById('go');
  const progWrap = document.getElementById('progress-wrap');
  const result   = document.getElementById('result');

  // Reset UI state
  result.style.display   = 'none';
  progWrap.style.display = 'block';
  setBar(0, 1);
  document.getElementById('trying-now').textContent = 'Initialising…';
  btn.disabled = true;
  btn.textContent = 'Solving…';

  // Defer to let the browser paint the UI before the heavy loop
  setTimeout(() => {
    try {
      const { words, letters, leading } = parse(raw);

      const t0  = performance.now();
      const res = bruteForce(words, letters, leading, (tried, total, map) => {
        setBar(tried, total);
        const preview = letters.map(l => `${l}=${map[l]}`).join('  ');
        document.getElementById('trying-now').textContent = 'Trying: ' + preview;
      });
      const ms = (performance.now() - t0).toFixed(1);

      setBar(res.tried, res.total);
      document.getElementById('trying-now').textContent =
        res.map ? '✓ Solution found!' : '✗ No solution found.';

      result.style.display = 'block';
      render(result, raw, words, letters, leading, res, ms);

    } catch(e) {
      progWrap.style.display = 'none';
      result.style.display   = 'block';
      result.innerHTML = `<div class="err-box">⚠ ${e}</div>`;
    }

    btn.disabled    = false;
    btn.textContent = 'SOLVE →';
  }, 30);
}

function setBar(tried, total) {
  const pct = total ? Math.min(100, tried / total * 100) : 0;
  document.getElementById('prog-bar').style.width = pct + '%';
  document.getElementById('prog-count').textContent =
    tried.toLocaleString() + ' / ' + total.toLocaleString();
}

// ══════════════════════════════════════════════
//  UI — RENDER RESULT
// ══════════════════════════════════════════════
function render(el, raw, words, letters, leading, res, ms) {
  const { map, nums, tried, total } = res;

  if (!map) {
    el.innerHTML = `
      <div class="panel-title">Result</div>
      <div class="err-box">No valid assignment found for: <b>${raw.toUpperCase()}</b></div>
      <div class="steps" style="margin-top:12px">
        ${St(1,'The solver exhausted all <b class="g">' + tried.toLocaleString() + '</b> permutations — none satisfied the equation.')}
        ${St(2,'Double-check your spelling. Some puzzles have no solution.')}
      </div>`;
    return;
  }

  const addNums  = nums.slice(0, -1);
  const sumNum   = nums[nums.length - 1];
  const addWords = words.slice(0, -1);
  const sumWord  = words[words.length - 1];

  const eqLine = addNums.join(' + ') + '  =  ' + sumNum;

  const cells = letters.map(l => `
    <div class="map-cell ${leading.has(l) ? 'mc-lead' : ''}">
      <div class="mc-letter">${l}</div>
      <div class="mc-arr">↓</div>
      <div class="mc-digit">${map[l]}</div>
    </div>`).join('');

  const d = i => `animation-delay:${i * 90}ms`;

  el.innerHTML = `
    <div class="panel-title">Solution</div>

    <div class="eq-box">${eqLine}</div>

    <div class="stats">
      <div class="stat">Permutations tried: <b>${tried.toLocaleString()}</b></div>
      <div class="stat">Total possible: <b>${total.toLocaleString()}</b></div>
      <div class="stat">Solved at: <b>${(tried/total*100).toFixed(2)}%</b></div>
      <div class="stat">Time: <b>${ms} ms</b></div>
    </div>

    <div class="sec">Letter → Digit Mapping</div>
    <div class="map-row">${cells}</div>

    <div class="sec">Step-by-Step Explanation</div>
    <div class="steps">

      <div class="step" style="${d(0)}">
        <div class="sn">1</div>
        <div class="st">
          <b>Parse the puzzle.</b><br>
          Input: <code>${raw.toUpperCase()}</code><br>
          Words: <code>${words.join('</code>, <code>')}</code><br>
          Unique letters: <code>${letters.join(', ')}</code> &nbsp;(${letters.length} total)
        </div>
      </div>

      <div class="step" style="${d(1)}">
        <div class="sn">2</div>
        <div class="st">
          <b>Apply the constraints.</b><br>
          • Every letter gets a <span class="g">unique digit from 0–9</span>.<br>
          • <span class="o">Leading letters</span> <code>${[...leading].join(', ')}</code>
            <span class="o">cannot be 0</span> — numbers don't start with zero.
        </div>
      </div>

      <div class="step hi" style="${d(2)}">
        <div class="sn">3</div>
        <div class="st">
          <b>Brute Force Search.</b><br>
          Generate every permutation of ${letters.length} digits from 0–9.<br>
          Total combinations: <code>10 × 9 × 8 × … = ${total.toLocaleString()}</code><br>
          For each one, substitute letters with digits and check if the equation holds.
        </div>
      </div>

      <div class="step" style="${d(3)}">
        <div class="sn">4</div>
        <div class="st">
          <b>Solution found at attempt #${tried.toLocaleString()}.</b><br>
          Assignment: &nbsp;${letters.map(l => `<code>${l} = ${map[l]}</code>`).join('&nbsp; ')}
        </div>
      </div>

      <div class="step" style="${d(4)}">
        <div class="sn">5</div>
        <div class="st">
          <b>Verify the answer.</b><br>
          ${addWords.map((w,i) => `<code>${w}</code> → <code>${nums[i]}</code>`).join(' &nbsp;+&nbsp; ')}
          &nbsp;=&nbsp; <code>${sumWord}</code> → <code>${sumNum}</code><br>
          <span class="g">${addNums.join(' + ')} = ${sumNum} &nbsp;✓</span>
        </div>
      </div>

    </div>`;
}

// Build a plain step string
function St(n, html) {
  return `<div class="step"><div class="sn">${n}</div><div class="st">${html}</div></div>`;
}