---
"@instantphoto/react": minor
---

Raise unit test coverage to 94%+ (enforced ≥80% thresholds) and verify bundlephobia configuration.

- Add 8 new test files covering captureUtils, loadImageBitmap (including Safari Y-flip fallback), batchProcess, hooks, gestures, public API, and mocked-WebGL pipeline paths
- 215 tests now pass (up from ~60); statements 94.49%, branches 86.03%, functions 96.66%, lines 96.56%
- Enforce 80% coverage thresholds in vitest config — CI fails if coverage drops
- Confirm bundlephobia setup: sideEffects, exports map, treeshaking, and peer externals are all correctly configured so the badge in the README reflects real bundle size
