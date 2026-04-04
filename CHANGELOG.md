# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Web UI: Next.js app with quiz, study, exam, and dashboard pages (`web/`)
- Domain 2–5 question banks bringing total to 105 questions
- Domain 3 source code (`src/config/`) and question bank update
- Full CI pipeline: `ci.yml`, `full-ci.yml`, `web-ci.yml`
- CLAUDE.md overhaul and role files for Sprint 2
- Curriculum coverage analysis documentation

### Fixed
- Regenerated Domain 3 question bank for accuracy
- README honesty pass: accurate feature status table, correct author attribution

## [0.1.0] - 2026-03-15

### Added
- Initial project scaffold: 5-domain structure, 3-tier testing
- Interactive CLI quiz with terminal formatting (`npx architect-ai quiz`)
- Domain 1 question bank: 30 scenario-based agentic architecture questions
- Domain 1 agents: agentic loop, coordinator, spawner, hooks, workflow-enforcer, decomposer, session-state
- Domains 2, 4, 5 source code: MCP server, tool definitions, prompts, context management
- MCP server: full JSON-RPC 2.0 implementation with resources, tools, and prompts
- Tier 1 integration test suite: schema validation, imports, contracts
- Question bank loader with domain/task statement filtering (`-d`, `-t` flags)
- Claude Code configuration: `CLAUDE.md`, `.claude/commands/`, `.claude/rules/`
- QA strategy and Red Team attack plan documentation
- `CONTRIBUTING.md` with question authoring guide

### Fixed
- P0 and P1 audit fixes from Red Team and LLM QA reviews
- Undefined domain/task names and difficulty mismatch in quiz engine
- Replaced all scaffolding placeholders with real content
