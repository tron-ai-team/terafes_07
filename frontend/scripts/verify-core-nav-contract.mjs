/**
 * Static contract: App.tsx must expose core routes with RequireAuth
 * and must not advertise unfinished Workspace/Job Finder as primary destinations.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appSrc = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
const sidebarSrc = readFileSync(join(root, 'src', 'components', 'layout', 'Sidebar.tsx'), 'utf8');
const topBarSrc = readFileSync(join(root, 'src', 'components', 'layout', 'TopBar.tsx'), 'utf8');
const landingSrc = readFileSync(join(root, 'src', 'pages', 'LandingPage.tsx'), 'utf8');

assert.match(appSrc, /RequireAuth/, 'App must use RequireAuth for protected core routes');
assert.match(appSrc, /path="\/chat"/, 'Chat route required');
assert.match(appSrc, /path="\/voice"/, 'Voice route required');
assert.match(appSrc, /path="\/career\/interview"/, 'Interview route required');
assert.match(appSrc, /path="\/career\/cv-builder"/, 'CV Builder route required');
assert.match(appSrc, /NotFoundPage/, 'Branded 404 required');
assert.match(appSrc, /FeatureUnavailablePage/, 'Hidden-feature page required');
assert.doesNotMatch(
  appSrc,
  /path="\*"\s+element=\{<Navigate to="\/"/,
  'Unknown routes must not silently redirect to Home',
);

assert.doesNotMatch(sidebarSrc, /path: '\/workspace'/, 'Sidebar must not link Workspace dashboard');
assert.doesNotMatch(sidebarSrc, /path: '\/career\/jobs'/, 'Sidebar must not link Job Finder');
assert.doesNotMatch(topBarSrc, /handleModeSwitch\('workspace'\)/, 'TopBar must not switch to Workspace');
assert.doesNotMatch(landingSrc, /navigate\("\/workspace"\)/, 'Landing Get Started must not go to Workspace');
assert.match(landingSrc, /navigate\("\/chat"\)/, 'Authenticated Get Started should open Chat');

console.log('verify-core-nav-contract: ok');
