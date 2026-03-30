# AGENTS.md

## Overview

The aim of this documentation is to provide guidelines for agents operating within the Audiobook Creator Pro repository. The application is a **zero-build static site**, implying there are minimal setup and configuration requirements. The repository uses HTML, CSS, and JavaScript exclusively.

## Build, Lint, and Test Guidelines

### Build Commands
- **Build Process**: As this is a static site, simply open `index.html` in your browser to run the application.
- **Deployment**: Pushed updates to the `main` branch on GitHub deploy automatically to Netlify.

### Linting
- While there's no explicit lint setup found in the repository, adhering to general JavaScript style guides is recommended.
- Consider setting up linters like ESLint for local development to enforce coding standards.

### Testing
- No formal testing framework is integrated into this static site.
- Conduct manual testing by interacting with the application in a browser to ensure that features function as expected.

## Code Style Guidelines

### General
- Maintain consistent naming conventions and formatting across HTML, CSS, and JavaScript files.
- Although a build system is absent, maintaining organized code is crucial for collaboration and maintenance.

### HTML/CSS
- Follow semantic HTML principles.
- Organize CSS with comments for sections and use a consistent naming scheme, such as BEM (Block Element Modifier).

### JavaScript
- Place all scripts within the `<head>` of `index.html` to align with existing practices.
- Use `camelCase` for variable and function names; `PascalCase` for constructor or class names.
- Avoid global variables when possible. Encapsulate code within functions to prevent namespace pollution.

### Error Handling
- Implement basic error handling in JavaScript using `try-catch` blocks where synchronous and asynchronous errors may occur, particularly around API calls.

### Naming Conventions
- Use descriptive, meaningful names for variables and functions.
- Maintain consistency with existing code by using similar structures and terminology.

### Comments and Documentation
- Provide comments for key logic and important functions.
- Follow JSDoc conventions for documenting functions and complex logic if applicable.

## Contribution Guide

1. **Clone the Repo**: `git clone <repo-url>`
2. **Branch Policy**: Create feature branches from `main` for new changes.
3. **Commits**: Use clear, concise descriptions for commit messages that describe the 'why' rather than the 'what'.
4. **Pull Requests**: Submit changes via pull requests to facilitate peer review.
5. **Manual Testing**: Ensure any new features or changes are manually tested in the browser.

## Future Enhancements

- **Automated Tests**: Consider integrating a testing library such as Jest for unit testing and Cypress for end-to-end testing.
- **Continuous Integration**: Implement a CI/CD pipeline to automate linting, testing, and deployment processes if the scope of the project increases.