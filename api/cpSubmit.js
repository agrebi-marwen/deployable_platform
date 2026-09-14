// api/cpSubmit.js - Serverless CP judge.
// Authenticates the caller, loads the admin-provided test file from Supabase
// Storage, runs the submitted code against every test case on Piston, compares
// outputs with a Piston-hosted C++ comparator, then persists the verdict.
//
// Request  : POST /api/cpSubmit
//            Authorization: Bearer <session token>
//            { challengeId, code, language }
// Response : { verdict, passed, total, failedTest, executionTimeMs, memoryKb,
//              compileOutput, runOutput, error? }
//
// Requires env (Vercel): SUPABASE_SERVICE_ROLE_KEY (so submissions can be
// written server-side and the private test file can be read). Piston is a
// public API with no key.

import { applyCommonHeaders, handlePreflight, readBody } from './_lib/http.js';
import { getUser, supabaseUrl, supabaseKey } from './_lib/supabase.js';
import { executePiston, compareOutputs, LANG_CONFIG } from './_lib/piston.js';
import { gunzipSync } from 'zlib';

const MAX_CODE_LENGTH = 256 * 1024;      // 256 KB of source
const MAX_TEST_CASES = 50;

async function rest(path, { method = 'GET', body, token } = {}) {
  const headers = {
    apikey: supabaseKey(),
    'Content-Type': 'application/json'
  };
  headers.Authorization = token ? `Bearer ${token}` : `Bearer ${supabaseKey()}`;
  const res = await fetch(`${supabaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

// Download + decompress the gzip test archive from the cp-tests bucket.
async function loadTestCases(testFilePath) {
  const encodedPath = String(testFilePath).split('/').map(encodeURIComponent).join('/');
  const url = `${supabaseUrl()}/storage/v1/object/cp-tests/${encodedPath}`;
  const key = supabaseKey();
  const res = await fetch(url, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch test file (storage ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());

  let parsed;
  try {
    parsed = JSON.parse(gunzipSync(buf).toString('utf8'));
  } catch (err) {
    throw new Error('Test file is not a valid gzip JSON archive: ' + err.message);
  }

  const list = Array.isArray(parsed)
    ? parsed
    : (parsed && Array.isArray(parsed.test_cases) ? parsed.test_cases : null);

  if (!list || list.length === 0) throw new Error('Problem has no test cases');
  if (list.length > MAX_TEST_CASES) throw new Error(`Too many test cases (max ${MAX_TEST_CASES})`);

  return list.map((tc, i) => ({
    index: i + 1,
    input: String(tc.input ?? ''),
    expected: String(tc.expected ?? '')
  }));
}

// Classify a single Piston execute response into a judge verdict.
// Returns { kind: 'OK', output } or { kind: 'CE'|'RE'|'TLE', ... }.
function classifyRun(data) {
  // Compilation failed (C / C++ / Java).
  const compile = data.compile;
  if (compile && typeof compile.code === 'number' && compile.code !== 0) {
    return { kind: 'CE', compileOutput: compile.stderr || compile.stdout || '' };
  }

  const run = data.run || {};

  // Piston statuses: TO = timeout, OL = stdout limit, EL = stderr limit.
  if (run.status === 'TO') return { kind: 'TLE' };
  if (run.status === 'OL' || run.status === 'EL') {
    return { kind: 'RE', runOutput: run.stdout || '', message: `Output limit exceeded (${run.status})` };
  }

  // Non-zero exit code or a terminating signal => runtime error.
  if ((typeof run.code === 'number' && run.code !== 0) || run.signal) {
    return {
      kind: 'RE',
      runOutput: run.stdout || '',
      message: run.signal ? `Killed (${run.signal})` : `Exit code ${run.code}`
    };
  }

  return { kind: 'OK', output: run.stdout || '' };
}

export default async function handler(req, res) {
  applyCommonHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const body = await readBody(req);
  const { challengeId, code: rawCode, language } = body || {};
  const code = typeof rawCode === 'string' ? rawCode : '';

  if (!challengeId) {
    res.status(400).json({ error: 'challengeId is required' });
    return;
  }
  if (!LANG_CONFIG[language]) {
    res.status(400).json({ error: 'Unsupported language' });
    return;
  }
  if (!code.trim()) {
    res.status(400).json({ error: 'Code is empty' });
    return;
  }
  if (code.length > MAX_CODE_LENGTH) {
    res.status(400).json({ error: `Code is too large (max ${MAX_CODE_LENGTH} bytes)` });
    return;
  }

  try {
    // --- Challenge + judge config -------------------------------------------
    const cpResp = await rest(`/rest/v1/cp_problems?challenge_id=eq.${encodeURIComponent(challengeId)}&select=*`);
    const cp = Array.isArray(cpResp.data) ? cpResp.data[0] : null;
    if (!cp) {
      res.status(400).json({ error: 'This challenge is not a graded CP problem' });
      return;
    }

    const allowedLangs = Array.isArray(cp.languages) && cp.languages.length
      ? cp.languages
      : Object.keys(LANG_CONFIG);
    if (!allowedLangs.includes(language)) {
      res.status(400).json({ error: `Language ${language} is not enabled for this problem` });
      return;
    }

    const timeLimitMs = cp.time_limit_ms || 1000;
    const memoryLimitMb = cp.memory_limit_mb || 256;
    const testCases = await loadTestCases(cp.test_file_path);

    // --- Persist the submission (status flips after judging) -----------------
    const now = new Date().toISOString();
    const subResp = await rest('/rest/v1/submissions', {
      method: 'POST',
      body: {
        user_id: user.id,
        challenge_id: challengeId,
        submission_url: null,
        status: 'PENDING',
        submitted_at: now
      }
    });
    if (!subResp.ok || !subResp.data || !subResp.data[0]) {
      res.status(500).json({ error: 'Failed to record submission' });
      return;
    }
    const submission = subResp.data[0];

    const detailResp = await rest('/rest/v1/cp_submission_details', {
      method: 'POST',
      body: {
        submission_id: submission.id,
        user_id: user.id,
        challenge_id: challengeId,
        language,
        code,
        verdict: 'PENDING',
        created_at: now
      }
    });
    if (!detailResp.ok || !detailResp.data || !detailResp.data[0]) {
      res.status(500).json({ error: 'Failed to record submission details' });
      return;
    }
    const detailId = detailResp.data[0].id;

    // --- Judge: run the code on every test case -------------------------------
    const pairs = [];          // [actual, expected] passed to the comparator
    const perTest = [];        // test_results jsonb
    let outcome = null;        // first fatal verdict (CE / RE / TLE)
    let maxWall = 0;
    let maxMem = 0;
    let compileOutput = '';
    let runOutputBest = '';
    let completedOk = 0;

    for (const tc of testCases) {
      let data;
      try {
        data = await executePiston({
          language,
          code,
          stdin: tc.input,
          runTimeoutMs: timeLimitMs,
          memoryLimitMb
        });
      } catch (err) {
        if (!outcome) outcome = { kind: 'RE', message: err.message };
        break;
      }

      const run = data.run || {};
      maxWall = Math.max(maxWall, run.wall_time || 0);
      maxMem = Math.max(maxMem, run.memory || 0);

      const resT = classifyRun(data);
      if (resT.kind === 'CE') {
        if (!outcome) {
          outcome = { kind: 'CE', compileOutput: resT.compileOutput };
          compileOutput = resT.compileOutput;
        }
        break;
      }
      if (resT.kind === 'TLE') {
        if (!outcome) outcome = { kind: 'TLE' };
        break;
      }
      if (resT.kind === 'RE') {
        if (!outcome) outcome = { kind: 'RE', message: resT.message, runOutput: resT.runOutput };
        if (resT.runOutput) runOutputBest = resT.runOutput;
        break;
      }

      pairs.push([resT.output, tc.expected]);
      completedOk++;
      perTest.push({
        index: tc.index,
        result: 'OK',
        time_ms: run.wall_time || null,
        memory_kb: run.memory ? Math.round(run.memory / 1024) : null
      });
    }

    // --- Compare all outputs with the C++ comparator on Piston -----------------
    let verdict = 'AC';
    let failedTest = null;

    if (outcome) {
      verdict = outcome.kind;
      failedTest = perTest.length + 1;
      if (outcome.runOutput) runOutputBest = outcome.runOutput;
    } else if (pairs.length) {
      const cmp = await compareOutputs(pairs);
      if (!cmp.accepted) {
        verdict = 'WA';
        failedTest = cmp.index;
      }
    } else {
      verdict = 'RE';
      failedTest = 1;
    }

    const passed = verdict === 'AC' ? pairs.length : 0;
    const runOutput = verdict === 'TLE'
      ? `Time limit exceeded (${timeLimitMs} ms)`
      : (runOutputBest || null);

    // --- Persist verdicts -------------------------------------------------------
    await rest(`/rest/v1/cp_submission_details?id=eq.${encodeURIComponent(detailId)}`, {
      method: 'PATCH',
      body: {
        verdict,
        compile_output: compileOutput || null,
        run_output: runOutput,
        execution_time_ms: maxWall || null,
        memory_kb: maxMem ? Math.round(maxMem / 1024) : null,
        test_results: perTest
      }
    });

    await rest(`/rest/v1/submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: 'PATCH',
      body: { status: verdict === 'AC' ? 'APPROVED' : 'REJECTED' }
    });

    res.status(200).json({
      verdict,
      passed,
      total: testCases.length,
      failedTest,
      executionTimeMs: maxWall || null,
      memoryKb: maxMem ? Math.round(maxMem / 1024) : null,
      compileOutput: compileOutput || null,
      runOutput: runOutput
    });
  } catch (err) {
    console.error('cpSubmit error:', err.message);
    res.status(500).json({ error: err.message || 'Judge failed' });
  }
}