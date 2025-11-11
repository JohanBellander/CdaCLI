# Security Policy

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| < 0.5.0 | :x:                |

## Reporting a Vulnerability

We take the security of CDA CLI seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Please report security vulnerabilities by emailing the repository maintainers. Include:

1. **Description**: A clear description of the vulnerability
2. **Impact**: What an attacker could potentially do
3. **Reproduction**: Steps to reproduce the issue
4. **Affected Versions**: Which versions are affected
5. **Suggested Fix**: If you have ideas on how to fix it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your report within 48 hours
- **Updates**: We will provide updates on the status of your report
- **Resolution**: We aim to release a fix within 30 days for critical issues
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices

When using CDA CLI:

1. **Keep Updated**: Always use the latest version to get security patches
2. **Validate Inputs**: Be cautious with constraint files from untrusted sources
3. **Review Agent Commands**: Inspect agent configurations before executing them
4. **Limit Permissions**: Run with minimal required permissions
5. **Secure Credentials**: Never commit API keys or tokens to agent configurations

## Known Security Considerations

### External Agent Execution

The `cda run --exec` command spawns external processes (e.g., GitHub Copilot CLI). Be aware:

- CDA streams prompts to the configured agent but does not interpret responses
- Exit codes from agents are logged but do not affect CDA's exit code
- Ensure agent commands are from trusted sources

### Configuration Files

Configuration files (`cda.config.json`, `cda.agents.json`) can specify:

- Command execution paths
- Command-line arguments
- File paths

Only use configuration files from trusted sources and review them before use.

### Constraint Files

Constraint markdown files are parsed and processed by CDA:

- Files are loaded from the bundled `dist/constraints` directory by default
- Custom constraint paths can be specified but should come from trusted sources
- Malformed constraint files result in errors but do not pose security risks

## Dependency Security

We monitor dependencies for known vulnerabilities:

- Regular updates of dependencies
- Automated security alerts via GitHub Dependabot
- CI/CD checks for security issues

If you discover a vulnerability in a dependency we use, please report it to us so we can coordinate a fix.
