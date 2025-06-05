# Contributing to XSafe

Thank you for your interest in contributing to XSafe! We welcome contributions from everyone, whether you're fixing bugs, adding features, improving documentation, or helping with translations.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submission Process](#submission-process)
- [Issue Guidelines](#issue-guidelines)
- [Feature Requests](#feature-requests)
- [Security Issues](#security-issues)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## Getting Started

1. **Fork the Repository**: Click the "Fork" button on the GitHub repository page
2. **Clone Your Fork**: `git clone https://github.com/YOUR_USERNAME/xsafe.git`
3. **Navigate to Directory**: `cd xsafe`
4. **Install Dependencies**: `npm install`
5. **Install Playwright**: `npm run playwright:install`

## Development Setup

### Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Chrome Browser**: For testing the extension

### Environment Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install

# Build the extension for development
npm run build:dev

# Start development mode with hot reloading
npm run dev

# Run tests
npm run test:all
```

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `dist` folder
4. The extension should now be loaded and visible in your extensions

## How to Contribute

### Types of Contributions

- **Bug Fixes**: Fix existing issues or unexpected behavior
- **Feature Additions**: Add new functionality to the extension
- **Documentation**: Improve README, code comments, or user guides
- **Testing**: Add or improve unit/integration tests
- **Performance**: Optimize existing code for better performance
- **Accessibility**: Improve accessibility features
- **Translations**: Add support for new languages

### Contribution Workflow

1. **Find or Create an Issue**: Look for existing issues or create a new one
2. **Assign Yourself**: Comment on the issue to indicate you're working on it
3. **Create a Branch**: `git checkout -b feature/your-feature-name`
4. **Make Changes**: Implement your changes following our coding standards
5. **Test Your Changes**: Run the full test suite and manual testing
6. **Commit Your Changes**: Use clear, descriptive commit messages
7. **Push and Create PR**: Push to your fork and create a pull request

## Coding Standards

### JavaScript Style

- **ES6+**: Use modern JavaScript features (const/let, arrow functions, etc.)
- **ESLint**: Follow the project's ESLint configuration
- **Formatting**: Use consistent indentation (2 spaces) and line endings

### File Organization

```
src/
├── background/        # Background script functionality
├── content/          # Content script functionality
├── popup/            # Popup interface
├── options/          # Options page
└── shared/           # Shared utilities
```

### Naming Conventions

- **Files**: Use kebab-case (`popup-manager.js`)
- **Classes**: Use PascalCase (`SettingsManager`)
- **Functions**: Use camelCase (`loadSettings`)
- **Constants**: Use UPPER_SNAKE_CASE (`DEFAULT_SETTINGS`)

### Code Documentation

- **JSDoc**: Document all public functions and classes
- **Comments**: Explain complex logic and business rules
- **README**: Update documentation for new features

```javascript
/**
 * Manages extension settings storage and retrieval
 * @class SettingsManager
 */
class SettingsManager {
  /**
   * Load settings from Chrome storage
   * @returns {Promise<Object>} The current settings object
   */
  async loadSettings() {
    // Implementation
  }
}
```

## Testing Guidelines

### Test Requirements

- **Unit Tests**: All new functions must have unit tests
- **Integration Tests**: New features should include integration tests
- **Coverage**: Maintain minimum 70% code coverage
- **Manual Testing**: Test in Chrome browser manually

### Running Tests

```bash
# Run all tests
npm run test:all

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode for development
npm run test:watch
```

### Writing Tests

- **Descriptive Names**: Test names should clearly describe what is being tested
- **Arrange-Act-Assert**: Structure tests clearly
- **Mock External Dependencies**: Use mocks for Chrome APIs and external services
- **Test Edge Cases**: Include tests for error conditions and edge cases

## Submission Process

### Pull Request Guidelines

1. **Clear Title**: Use a descriptive title that summarizes the changes
2. **Detailed Description**: Explain what changes were made and why
3. **Link Issues**: Reference any related issues using `Fixes #123` or `Addresses #123`
4. **Screenshots**: Include screenshots for UI changes
5. **Testing Notes**: Describe how you tested the changes

### PR Description Template

```markdown
## Description

Brief description of changes made.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Extension loads successfully in Chrome

## Screenshots (if applicable)

Include screenshots of UI changes.

## Additional Notes

Any additional information or context.
```

### Review Process

1. **Automated Checks**: CI/CD pipeline must pass (tests, linting, build)
2. **Code Review**: At least one maintainer must review and approve
3. **Testing**: Changes will be tested in a browser environment
4. **Merge**: Once approved, changes will be merged to main branch

## Issue Guidelines

### Bug Reports

When reporting bugs, please include:

- **Browser Version**: Chrome version where the bug occurs
- **Extension Version**: Version of XSafe where the bug occurs
- **Steps to Reproduce**: Clear steps to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Screenshots**: If applicable, include screenshots
- **Console Errors**: Any relevant browser console errors

### Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**

- Chrome Version: [e.g. 118.0.5993.117]
- XSafe Version: [e.g. 0.1.0]
- OS: [e.g. macOS 14.0]

**Additional context**
Add any other context about the problem here.
```

## Feature Requests

### Before Submitting

- Check if the feature already exists
- Search existing feature requests
- Consider if it aligns with XSafe's privacy-first mission

### Feature Request Template

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.

**Privacy Considerations**
How does this feature align with XSafe's privacy-first approach?
```

## Security Issues

### Reporting Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities. Instead:

1. **Email**: Send details to [security@example.com] (replace with actual email)
2. **Include**: Detailed description of the vulnerability
3. **Provide**: Steps to reproduce if possible
4. **Response**: We will respond within 48 hours

### Security Best Practices

- Never commit sensitive information (API keys, passwords, etc.)
- Follow secure coding practices
- Be mindful of XSS and injection vulnerabilities
- Validate all user inputs
- Use Chrome's security features properly

## Development Tips

### Common Tasks

```bash
# Build and test extension
npm run build && npm run test:all

# Lint and fix code style issues
npm run lint:fix

# Clean build artifacts
npm run clean

# Package extension for distribution
npm run package
```

### Debugging

- **Background Script**: Use Chrome DevTools on the background page
- **Content Script**: Use Chrome DevTools on the web page
- **Popup**: Right-click popup and select "Inspect"
- **Options Page**: Standard web page debugging

### Performance Considerations

- **Memory Usage**: Be mindful of memory leaks in long-running scripts
- **CPU Usage**: Avoid intensive operations in content scripts
- **Storage**: Use Chrome storage APIs efficiently
- **Network**: Minimize external requests

## Recognition

Contributors will be recognized in:

- **README.md**: Contributors section
- **Release Notes**: Acknowledgment in release descriptions
- **GitHub**: Contributor status on the repository

## Questions?

- **Issues**: Create a GitHub issue with the "question" label
- **Discussions**: Use GitHub Discussions for broader topics
- **Documentation**: Check existing documentation first

## License

By contributing to XSafe, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to XSafe! Your help makes the internet a safer and more private place for everyone. 🛡️
