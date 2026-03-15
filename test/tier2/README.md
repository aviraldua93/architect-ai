# Tier 2: Paid E2E Tests

## Overview
End-to-end integration tests requiring runtime execution:
- Agent workflow tests
- Tool integration tests
- CLI command tests
- MCP protocol tests

## Commands
```bash
npm run test:tier2
```

## What's Tested
- Agent orchestration workflows
- Tool execution and composition
- CLI command routing
- MCP message handling
- Context management under load

## TODO
- [ ] Set up test framework (Jest/Vitest)
- [ ] Write agent tests
- [ ] Write tool tests
- [ ] Write CLI tests
- [ ] Write context tests
- [ ] Add performance benchmarks
