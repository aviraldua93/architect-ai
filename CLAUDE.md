# architect-ai - Claude Code Project

AI-powered study tool for Claude Certified Architect exam. **The codebase IS the curriculum.**

## Project Overview

architect-ai is an intelligent study platform that combines:
- **Agentic Architecture**: Multi-agent systems orchestration for teaching AWS concepts
- **Tool Design & MCP Integration**: Extensible tool framework with Model Context Protocol support
- **CLI & Commands**: Interactive learning interface
- **Prompt Engineering**: Dynamic, contextual learning prompts
- **Context Management**: Intelligent context window optimization
- **Content System**: Pre-loaded question banks, explanations, and practice scenarios

## Core Domains

### Domain 1: Agentic Architecture (`src/agents/`)
Teaches multi-agent patterns and orchestration:
- Agent base classes and communication protocols
- Multi-agent workflow patterns
- State management and coordination
- Error recovery and resilience patterns

### Domain 2: Tool Design & MCP Integration (`src/tools/`, `src/mcp/`)
Teaches tool design and Model Context Protocol:
- Tool abstraction and interfaces
- MCP protocol implementation
- Tool registry and discovery
- Tool validation and versioning

### Domain 3: CLI & Commands (`src/cli/`)
Teaches command-line interface design:
- Command parser and router
- Interactive prompts and user interaction
- Help system and documentation
- Command history and replay

### Domain 4: Prompt Engineering (`src/prompts/`)
Teaches prompt optimization techniques:
- Prompt templates and generation
- Few-shot learning patterns
- Chain-of-thought prompting
- Dynamic prompt adjustment

### Domain 5: Context Management (`src/context/`)
Teaches token and context optimization:
- Context window management
- Token counting and tracking
- Context prioritization strategies
- Serialization and versioning

### Content & Assessment (`src/content/`)
Pre-generated curriculum:
- **questions/**: AWS certification question banks (JSON)
- **explanations/**: Detailed concept explanations
- **scenarios/**: Practical learning scenarios

### Testing Infrastructure (`test/`)
- **tier1/**: Free static analysis (linting, type checking)
- **tier2/**: Paid E2E tests (integration testing)
- **tier3/**: LLM-as-judge evaluation (advanced assessment)

## Getting Started

### Prerequisites
- Node.js 18+
- Bun (optional, for faster builds)
- GitHub CLI (for cloning/pushing)

### Installation
```bash
# Clone the repository
gh repo clone aviraldua93/architect-ai

cd architect-ai

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm run test
```

### Development

```bash
# Type-aware development with live recompilation
npm run dev

# Format code
npm run format

# Lint and type-check
npm run lint
npm run type-check
```

## Project Structure

```
architect-ai/
├── CLAUDE.md                    # This file - Claude Code config
├── conductor.json               # Workspace hooks (gstack pattern)
├── VERSION                      # 0.1.0.0
├── CHANGELOG.md                 # Version history
├── TODOS.md                     # Project backlog
├── package.json                 # Node/Bun project
├── tsconfig.json                # TypeScript config
├── .gitignore                   # Git ignore rules
│
├── src/
│   ├── agents/                  # Domain 1: Agentic Architecture
│   │   └── TODO.md              # Agent patterns and implementations
│   │
│   ├── tools/                   # Domain 2: Tool Design
│   │   └── TODO.md              # Tool abstraction and registry
│   │
│   ├── mcp/                     # Domain 2: MCP Integration
│   │   └── TODO.md              # MCP client and server
│   │
│   ├── prompts/                 # Domain 4: Prompt Engineering
│   │   └── TODO.md              # Prompt templates and generation
│   │
│   ├── context/                 # Domain 5: Context Management
│   │   └── TODO.md              # Context window optimization
│   │
│   ├── cli/                     # Domain 3: CLI & Commands
│   │   └── TODO.md              # CLI framework and commands
│   │
│   └── content/                 # Pre-generated curriculum
│       ├── questions/           # AWS exam question banks (JSON)
│       ├── explanations/        # Concept explanations
│       └── scenarios/           # Practice scenarios
│
├── .claude/
│   ├── commands/                # Custom slash commands
│   │   └── example.md           # TODO: Document commands
│   │
│   └── rules/                   # Path-specific rules
│       └── engineering.md       # TODO: Development rules
│
├── scripts/                     # Build and utility scripts
│   └── TODO.md                  # Build scripts
│
├── test/
│   ├── tier1/                   # Free static analysis
│   │   └── README.md            # Linting, type checking
│   │
│   ├── tier2/                   # Paid E2E tests
│   │   └── README.md            # Integration tests
│   │
│   └── tier3/                   # LLM-as-judge evaluation
│       └── README.md            # Advanced assessment
│
└── docs/                        # Architecture & contributor docs
    ├── ARCHITECTURE.md          # TODO: System design
    ├── API.md                   # TODO: API documentation
    ├── CONTRIBUTING.md          # TODO: Contributor guide
    └── DEVELOPMENT.md           # TODO: Dev setup guide
```

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | TypeScript watch mode (development) |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run lint` | Run ESLint (code quality) |
| `npm run type-check` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run test:tier1` | Run free static analysis tests |
| `npm run test:tier2` | Run paid E2E tests (TODO) |
| `npm run test:tier3` | Run LLM-as-judge evaluation (TODO) |
| `npm run test` | Run tier1 tests (default) |

## Claude Code Integration

This project uses Claude Code project configuration for enhanced:
- **Intelligent code navigation** and search
- **Multi-file aware edits** across domains
- **Context-aware suggestions** based on project structure
- **Custom slash commands** for common workflows
- **Path-specific rules** for domain separation
- **Memory** of past interactions and decisions

### Commands (in Claude UI)

- `/help` - Show available commands
- `/status` - Project status and next steps
- `/arch` - Show architecture overview
- `/test` - Run test suite
- `/build` - Build the project

### Rules

Path-specific rules ensure consistent patterns:
- `src/agents/**` - Agent patterns must follow multi-agent standards
- `src/tools/**` - Tool implementations must be MCP-compatible
- `src/prompts/**` - Prompts must be versioned and tested
- `test/**` - Tests organized by tier (free/paid/advanced)

## Architecture Principles

1. **Domain-Driven Design**: Each domain (agents, tools, prompts, context, cli) is independently deployable
2. **Contract-First**: Tool interfaces defined before implementation (MCP protocol)
3. **Testability**: Three-tier testing approach (static → E2E → LLM evaluation)
4. **Extensibility**: Plugin architecture for tools and agents
5. **Observability**: Structured logging and metrics for all components

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Domain-specific patterns

## Next Steps

1. ✅ Project initialization and scaffolding
2. ⏳ Implement core agent base classes
3. ⏳ Design tool interface contracts
4. ⏳ Integrate MCP protocol support
5. ⏳ Build CLI framework
6. ⏳ Create prompt templates
7. ⏳ Load initial question banks
8. ⏳ Set up Tier 1 test infrastructure

## License

MIT

## Author

Fatima Al-Rashid, DevOps & CI Engineer at ArchitectAI

---

**Memory Notes:**
- Project initialized with gstack conductor pattern
- TypeScript configured for ES2020 target
- Three-tier testing strategy in place
- Domain separation enforced via src/ structure
- GitHub CLI used for remote repository management
