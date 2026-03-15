# Quick Start Guide - architect-ai

## Setup Instructions

### 1. GitHub CLI Authentication (IN PROGRESS)
A device code authentication flow is currently active.

**Device Code:** `7D5A-A315`

**Steps to complete authentication:**
1. Open browser to: https://github.com/login/device
2. Enter the device code: `7D5A-A315`
3. Follow the GitHub login flow
4. Grant permission when prompted
5. The `gh auth login` process will automatically detect completion and continue

### 2. Install Dependencies (After Auth)
Once auth is complete, run:
```bash
npm install
```

### 3. Build the Project
```bash
npm run build
```

### 4. Run Tests
```bash
npm run test
```

## Project Domains

The codebase is organized into 5 learning domains:

1. **Agentic Architecture** (`src/agents/`) - Multi-agent patterns and orchestration
2. **Tool Design & MCP** (`src/tools/`, `src/mcp/`) - Tool abstraction and Model Context Protocol
3. **CLI & Commands** (`src/cli/`) - Command-line interface design
4. **Prompt Engineering** (`src/prompts/`) - Prompt optimization and templating
5. **Context Management** (`src/context/`) - Token and context window optimization

Plus **Content** (`src/content/`) with question banks, explanations, and scenarios.

## Testing Strategy

Three-tier testing approach:

- **Tier 1** (Free): Static analysis - linting, type-checking, formatting
- **Tier 2** (Paid): E2E integration tests - workflow and component testing
- **Tier 3** (LLM): Advanced evaluation - Claude as a judge for curriculum quality

## Next Steps

1. ✅ Complete GitHub CLI authentication (see above)
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript
4. Explore the domain structure under `src/`
5. Read CLAUDE.md for full project documentation
6. Check TODOS.md for the project backlog

## Environment Setup

Copy `.env.example` to `.env` and fill in any required values:
```bash
cp .env.example .env
# Edit .env with your settings
```

## Troubleshooting

### GitHub CLI authentication stuck?
- Check that the device code `7D5A-A315` was correctly entered in the browser
- The browser session must complete before the local process continues
- If stuck for >10 minutes, stop the process and run `gh auth login` again

### TypeScript errors?
```bash
npm run type-check
```

### Code style issues?
```bash
npm run lint
npm run format
```

## Architecture Documents

- **CLAUDE.md** - Project configuration and overview
- **CHANGELOG.md** - Version history
- **TODOS.md** - Project backlog and upcoming work
- **docs/** - Detailed architecture documentation (to be completed)

---

**Project Lead:** Fatima Al-Rashid, DevOps & CI Engineer at ArchitectAI
