# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-02-13

### Added
- Dynamic model selection feature
  - New dropdown menu in UI for model selection
  - Server-side API endpoint `/api/models` to list available models
  - Automatic model detection from Ollama installation
- Enhanced error handling for model-related operations
- Updated documentation with model selection features

### Changed
- Refactored server configuration to use `defaultModel` instead of fixed model
- Improved server status checking with model information
- Enhanced UI header layout to accommodate model selector

## [0.1.0] - 2024-02-12

### Added
- Initial release
- Basic chat interface with Ollama integration
- Markdown support with syntax highlighting
- Real-time chat with streaming responses
- Basic error handling
- Server health monitoring
- Responsive design for desktop and mobile
