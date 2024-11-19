# Contributing to Ollama Chat Web

Thank you for your interest in contributing to Ollama Chat Web! This document provides guidelines and instructions for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ollama-chat-web.git
   cd ollama-chat-web
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Guidelines

### Code Style
- Use consistent indentation (2 spaces)
- Follow JavaScript ES6+ conventions
- Keep functions small and focused
- Add comments for complex logic
- Use meaningful variable and function names

### Commit Messages
We use [Conventional Commits](https://www.conventionalcommits.org/) format. Each commit message should be structured as follows:

```
<type>: <description>

[optional body]
[optional footer]
```

Types:
- `feat:` New features
- `fix:` Bug fixes
- `change:` or `refactor:` Code changes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `test:` Adding or updating tests
- `chore:` Maintenance tasks
- `deprecate:` Deprecating features
- `remove:` Removing features
- `security:` Security fixes

Examples:
```bash
feat: add dark mode support
fix: resolve connection timeout issue
docs: update installation instructions
```

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- MAJOR version for incompatible API changes
- MINOR version for new features
- PATCH version for bug fixes

To create a new version:
```bash
npm version patch  # For bug fixes
npm version minor  # For new features
npm version major  # For breaking changes
```

This will automatically:
1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Push changes to GitHub

### Pull Requests
1. Update your branch with the latest main:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Test your changes thoroughly
3. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Create a Pull Request on GitHub
5. Fill in the PR template with:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

## 🧪 Testing

Before submitting a PR:
1. Test the application locally
2. Ensure all existing features work
3. Test with different Ollama models
4. Check browser console for errors
5. Verify mobile responsiveness

## 📚 Documentation

When adding new features:
1. Update README.md if needed
2. Add JSDoc comments to new functions
3. Update API documentation if endpoints change
4. Include usage examples

## 🐛 Reporting Issues

When reporting issues:
1. Use the issue template
2. Include steps to reproduce
3. Provide system information:
   - Browser version
   - Node.js version
   - Ollama version
4. Include error messages and logs
5. Add screenshots if relevant

## 🔄 Release Process

1. Ensure all tests pass
2. Update version:
   ```bash
   npm version [patch|minor|major]
   ```
3. Review CHANGELOG.md
4. Create a release on GitHub:
   - Tag version
   - Release title
   - Description of changes
   - Any breaking changes
   - Migration instructions if needed

## 💡 Getting Help

- Check existing issues and discussions
- Join our community chat
- Read the documentation
- Ask questions in discussions

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.
