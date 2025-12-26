# OSQR for VS Code

Your AI thinking companion - OSQR brings persistent memory and multi-model reasoning to VS Code.

## Features

- **Persistent Memory**: Every conversation is automatically saved to your Personal Knowledge Vault (PKV)
- **Workspace Context**: OSQR sees your open files, git branch, and project structure
- **Mark as Decision**: Capture important decisions with a single command
- **Usage Meter**: Track your token usage in the status bar
- **Multi-Model Reasoning**: Choose Quick, Thoughtful, or Contemplate modes

## Requirements

- OSQR Pro or Master subscription (VS Code access requires Pro tier or higher)
- Active internet connection

## Getting Started

1. Click the OSQR icon in the activity bar
2. Click "Sign In" to authenticate with your OSQR account
3. Start chatting!

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `OSQR: Sign In` | - | Sign in to your OSQR account |
| `OSQR: Sign Out` | - | Sign out of OSQR |
| `OSQR: Ask OSQR` | `Cmd/Ctrl+Shift+O` | Open OSQR chat |
| `OSQR: Mark as Decision` | `Cmd/Ctrl+Shift+D` | Mark selected text as a decision |
| `OSQR: Explain Selection` | Right-click | Explain selected code |
| `OSQR: Show Usage` | Click status bar | View token usage details |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `osqr.apiEndpoint` | `https://app.osqr.ai` | OSQR API endpoint |
| `osqr.autoSaveConversations` | `true` | Auto-save all conversations to PKV |
| `osqr.includeWorkspaceContext` | `true` | Include workspace context with messages |
| `osqr.showUsageMeter` | `true` | Show usage meter in status bar |

## Modes

- **Quick**: Fast responses using Claude Sonnet (2-8 seconds)
- **Thoughtful**: Multiple models in parallel, synthesized response (20-40 seconds)
- **Contemplate**: Deep reasoning with roundtable deliberation (60-90 seconds)

## Privacy

- All conversations are stored in your encrypted Personal Knowledge Vault
- Workspace context (file paths, git branch) is sent with each message to provide relevant responses
- No data is used for training without your explicit consent

## Support

- [Documentation](https://app.osqr.ai/docs)
- [Pricing](https://app.osqr.ai/pricing)
- [Contact Support](mailto:support@osqr.ai)

## License

Proprietary - OSQR Inc.
