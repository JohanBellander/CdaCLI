# Quick Start for Developers

Fast reference guide for common development tasks in CDA CLI.

## 🚀 Initial Setup

```bash
# Clone the repository
git clone https://github.com/JohanBellander/CdaCLI.git
cd CdaCLI

# Install dependencies
npm install

# Build the project
npm run build

# Link for local development (optional)
npm link
```

## 📝 Daily Workflow

### Development Mode
```bash
# Watch mode - auto-recompile on changes
npm run dev
```

### Before Committing
```bash
# 1. Auto-fix linting issues
npm run lint:fix

# 2. Format all code
npm run format

# 3. Verify everything
npm run lint        # Check code quality
npm run typecheck   # Verify TypeScript
npm test            # Run test suite
npm run build       # Verify build
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for tests
npm run test:watch

# Type checking only
npm run typecheck
```

## 📦 Building

```bash
# Standard build
npm run build

# Build Windows executable
npm run build:exe
```

## 🔍 Code Quality

```bash
# Lint source code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Check formatting
npm run format:check

# Format all files
npm run format
```

## 🏃 Running the CLI

```bash
# After npm link
cda --help
cda init
cda list
cda run

# Without npm link
node dist/cli/index.js --help
```

## 📊 Project Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript + copy constraints |
| `npm run dev` | Watch mode for development |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code with ESLint |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check if code is formatted |
| `npm run typecheck` | TypeScript type checking |
| `npm run build:exe` | Build Windows executable |

## 🗂️ Project Structure

```
CdaCLI/
├── src/
│   ├── cli/              # CLI layer
│   │   ├── commands/     # Command implementations
│   │   └── index.ts      # Main entry point
│   ├── core/             # Business logic
│   └── constraints/      # Constraint definitions
├── tests/                # Test files
├── dist/                 # Compiled output (gitignored)
├── scripts/              # Build scripts
└── .github/
    └── workflows/        # CI/CD configuration
```

## 🐛 Debugging

### VSCode Debug Configuration
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CDA CLI",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/dist/cli/index.js",
      "args": ["list"],
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Run with Node Inspector
```bash
node --inspect-brk dist/cli/index.js list
```

## 🔧 Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Tests Fail
```bash
# Update snapshots if intentional
npm test -- -u

# Run specific test file
npm test tests/errors.test.ts
```

### Linting Issues
```bash
# Most issues auto-fix
npm run lint:fix

# Manual fixes may be needed for some rules
npm run lint
```

### Type Errors
```bash
# Full type check with details
npm run typecheck
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | Main CLI entry point |
| `src/core/errors.ts` | Error handling |
| `src/core/constraintLoader.ts` | Loads constraint definitions |
| `src/core/instructionEmitter.ts` | Generates instruction packages |
| `package.json` | Project metadata and scripts |
| `tsconfig.json` | TypeScript configuration |
| `eslint.config.mjs` | ESLint configuration |
| `.prettierrc.json` | Prettier configuration |

## 🔗 Useful Links

- [Main README](./README.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Code Review Summary](./CODE_REVIEW_SUMMARY.md)
- [Review Recommendations](./REVIEW_RECOMMENDATIONS.md)
- [Security Policy](./SECURITY.md)

## 💡 Tips

1. **Use watch mode** (`npm run dev`) during active development
2. **Run linting** before committing to catch issues early
3. **Check CI** status on your PRs to ensure all checks pass
4. **Write tests** for new features following existing patterns
5. **Update docs** when changing user-facing behavior

## ✅ Pre-Commit Checklist

- [ ] Code compiles (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] TypeScript checks pass (`npm run typecheck`)
- [ ] Changes are documented
- [ ] Commit message follows convention

---

**Need help?** Check [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue!
