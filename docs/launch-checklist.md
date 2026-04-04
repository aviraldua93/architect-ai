# 🚀 ArchitectAI v1.0 Launch Checklist

> Track progress toward the v1.0.0 public release.
> Each section must be fully complete before moving to the next.

---

## Pre-Release

### P0 Bug Fixes
- [ ] `fix-d5-q02` — Fix Domain 5 question 02 incorrect answer
- [ ] `fix-package-json` — Fix package.json metadata (bin, files, exports)
- [ ] `fix-mcp-error-mapping` — Fix MCP server error code mapping
- [ ] `fix-tsconfig` — Fix TypeScript config (paths, strictness, build output)
- [ ] `add-license` — Ensure LICENSE file is present and correct (MIT)

### Content Validation
- [ ] 125+ questions validated (run `npm test`)
- [ ] All 30 CCA-F task statements have ≥ 2 questions each
- [ ] Every question has: scenario, 4 options, correct answer, explanation
- [ ] No duplicate or near-duplicate questions across domains
- [ ] Domain weights match exam spec (27% / 18% / 20% / 20% / 15%)

### Feature Readiness
- [ ] `quiz` command functional — basic quiz with domain/task filtering
- [ ] `study` command functional — guided interactive study sessions
- [ ] `assess` command functional — readiness scoring and gap analysis
- [ ] `exam` command functional — timed mock exam with pass/fail verdict
- [ ] `dashboard` command functional — progress tracking and weak-area analysis
- [ ] MCP server starts and responds to JSON-RPC 2.0 requests

### Code Quality
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `npm test` passes with ≥ 60% line coverage
- [ ] TypeScript strict mode — zero `any` types in source
- [ ] No `console.log` debugging statements in source

### Packaging
- [ ] `npm pack --dry-run` produces clean tarball < 500KB
- [ ] `.npmignore` excludes: test/, docs/, web/, .github/, .claude/, .env*
- [ ] `npx architect-ai --help` works from a fresh install
- [ ] `bin` field in package.json points to correct entry point

### Documentation
- [ ] README accurately reflects current feature state
- [ ] CHANGELOG.md updated with v1.0.0 entry
- [ ] CONTRIBUTING.md is current and accurate
- [ ] QUICKSTART.md matches actual CLI behavior
- [ ] ARCHITECTURE.md reflects current project structure
- [ ] All "Coming Soon" badges updated for shipped features

---

## Release

### Version & Tag
- [ ] Version bumped: `npm version 1.0.0`
- [ ] Git tag created: `git tag v1.0.0`
- [ ] Tag pushed: `git push origin v1.0.0`
- [ ] Main branch is clean (no uncommitted changes)

### Publish
- [ ] GitHub Actions release workflow triggers on tag push
- [ ] Release workflow succeeds (build → test → publish)
- [ ] npm package is live: `npm info architect-ai`
- [ ] `npx architect-ai --help` works from npm (fresh machine test)
- [ ] `npx architect-ai quiz` runs a question successfully

### GitHub Release
- [ ] GitHub Release created from v1.0.0 tag
- [ ] Release title: "v1.0.0 — The Codebase IS the Curriculum"
- [ ] Release notes include: features, quick start, contributor thanks
- [ ] Release notes link to CHANGELOG.md for full details

---

## Post-Release

### Content & Media
- [ ] YouTube demo recorded and uploaded (see `docs/demo-script.md`)
- [ ] Demo video linked in README
- [ ] Blog post published on Dev.to
- [ ] Blog post cross-posted to Medium (if applicable)

### Social Media (see `docs/launch-posts.md`)
- [ ] Hacker News submission posted (Monday 8 AM PT)
- [ ] Twitter/X thread published (Monday 9 AM PT)
- [ ] Reddit posts: r/learnprogramming, r/claude (Tuesday 10 AM PT)
- [ ] LinkedIn post published (Wednesday 8 AM PT)
- [ ] Dev.to blog post published (Thursday 8 AM PT)

### Community
- [ ] Discord server created
- [ ] Discord invite link added to README
- [ ] Discord channels set up: #general, #study-group, #exam-tips, #contributing
- [ ] Welcome message and rules posted

### GitHub Housekeeping
- [ ] 10+ issues labeled `good-first-issue`
- [ ] Issue templates created (bug report, feature request, add question)
- [ ] Project board created for v1.1 roadmap
- [ ] Dependabot enabled for security updates
- [ ] Branch protection rules on `main` (require PR, require CI pass)

### Monitoring (First 7 Days)
- [ ] Respond to every HN/Reddit comment within 4 hours
- [ ] Triage all new GitHub issues within 24 hours
- [ ] Track star count daily (target: 50 stars in week 1)
- [ ] Track npm download count (target: 100 installs in week 1)
- [ ] Note top feature requests for v1.1 planning

---

## Sign-Off

| Milestone | Date | Owner |
|-----------|------|-------|
| Pre-Release complete | _TBD_ | @aviraldua93 |
| v1.0.0 published to npm | _TBD_ | @aviraldua93 |
| All social posts live | _TBD_ | @aviraldua93 |
| Week 1 retro complete | _TBD_ | @aviraldua93 |
