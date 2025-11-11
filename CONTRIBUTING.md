# Contributing to CDA CLI

Thank you for your interest in contributing to the Constraint-Driven Architecture CLI!

## Development Setup

### Prerequisites

- Node.js 18.x or newer
- npm (comes with Node.js)
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/JohanBellander/CdaCLI.git
   cd CdaCLI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Link for local development (optional):
   ```bash
   npm link
   ```

## Development Workflow

### Code Style

This project uses ESLint and Prettier for code quality and formatting:

- **Lint your code**: `npm run lint`
- **Fix linting issues**: `npm run lint:fix`
- **Format code**: `npm run format`
- **Check formatting**: `npm run format:check`

### Type Checking

Run TypeScript type checking:
```bash
npm run typecheck
```

### Testing

- Run all tests: `npm test`
- Run tests in watch mode: `npm run test:watch`

### Building

- Build TypeScript: `npm run build`
- Build executable (Windows): `npm run build:exe`

### Development Mode

Watch mode for automatic recompilation:
```bash
npm run dev
```

## Code Quality Standards

### TypeScript

- Use strict type checking
- Avoid `any` types - use specific types or `unknown`
- Provide return types for public functions
- Use interfaces for object shapes
- Keep functions focused and small (< 50 lines ideally)

### Error Handling

- Use the custom `CdaError` class for application errors
- Provide descriptive error messages
- Include context in error messages (file paths, constraint IDs, etc.)
- Catch and handle errors at appropriate levels

### Testing

- Write tests for new features
- Maintain or improve test coverage
- Use descriptive test names
- Follow the existing test patterns (Vitest)
- Test both success and failure cases

### Documentation

- Add JSDoc comments for public APIs
- Update README.md for user-facing changes
- Document complex algorithms or business logic
- Keep comments concise and meaningful

## Pull Request Process

1. Create a feature branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code quality standards

3. Run the full test suite:
   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

4. Commit your changes with clear, descriptive messages:
   ```bash
   git commit -m "feat: add new constraint validation"
   ```

5. Push to your fork and create a Pull Request

6. Ensure CI checks pass

7. Address any review feedback

## Commit Message Convention

Use conventional commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or updates
- `chore:` - Build process or tooling changes

Examples:
```
feat: add support for custom constraint paths
fix: resolve Windows path separator issues
docs: update installation instructions
```

## Project Structure

```
CdaCLI/
├── src/
│   ├── cli/           # CLI commands and entry point
│   │   ├── commands/  # Individual command implementations
│   │   └── index.ts   # Main CLI entry point
│   ├── core/          # Core business logic
│   │   ├── constraintLoader.ts
│   │   ├── instructionEmitter.ts
│   │   ├── agentConfig.ts
│   │   └── errors.ts
│   └── constraints/   # Constraint markdown files
│       └── core/
├── tests/             # Test files
├── dist/              # Compiled output (gitignored)
└── scripts/           # Build and utility scripts
```

## Issue Tracking

This project uses **bd (beads)** for issue tracking:

- Check for ready work: `bd ready`
- Create new issues: `bd create "Issue title" -t bug|feature|task`
- Update issues: `bd update bd-42 --status in_progress`
- Close issues: `bd close bd-42 --reason "Completed"`

See the repository custom instructions for full details.

## Need Help?

- Check existing documentation in the repository
- Review test files for examples
- Open an issue for questions or discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (see LICENSE file).
