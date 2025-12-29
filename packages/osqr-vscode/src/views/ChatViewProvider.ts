/**
 * Chat View Provider
 *
 * Provides the webview-based chat interface in the sidebar.
 * Handles streaming responses and message display.
 */

import * as vscode from 'vscode'
import { ApiClient } from '../providers/ApiClient'
import { AuthProvider } from '../providers/AuthProvider'
import { MarkDecisionCommand } from '../commands/markDecision'

export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'osqr.chatView'

  private view?: vscode.WebviewView
  private apiClient: ApiClient
  private authProvider: AuthProvider
  private markDecisionCommand: MarkDecisionCommand
  private extensionUri: vscode.Uri
  private currentThreadId?: string

  constructor(
    extensionUri: vscode.Uri,
    apiClient: ApiClient,
    authProvider: AuthProvider,
    markDecisionCommand: MarkDecisionCommand
  ) {
    this.extensionUri = extensionUri
    this.apiClient = apiClient
    this.authProvider = authProvider
    this.markDecisionCommand = markDecisionCommand

    // Listen for auth changes
    this.authProvider.onDidSignIn(() => this.updateAuthState())
    this.authProvider.onDidSignOut(() => this.updateAuthState())
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    }

    webviewView.webview.html = this.getHtmlContent()

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'sendMessage':
          await this.handleSendMessage(message.text, message.mode)
          break
        case 'signIn':
          await this.authProvider.signIn()
          break
        case 'signOut':
          await this.authProvider.signOut()
          break
        case 'markDecision':
          await this.markDecisionCommand.execute(message.text, {
            conversationId: this.currentThreadId,
          })
          break
        case 'newThread':
          this.currentThreadId = undefined
          this.postMessage({ type: 'threadCleared' })
          break
        case 'upgrade':
          vscode.env.openExternal(vscode.Uri.parse('https://app.osqr.ai/pricing'))
          break
        case 'ready':
          this.updateAuthState()
          break
      }
    })
  }

  /**
   * Send message to webview
   */
  private postMessage(message: object): void {
    this.view?.webview.postMessage(message)
  }

  /**
   * Update authentication state in webview
   */
  private async updateAuthState(): Promise<void> {
    const isAuthenticated = this.authProvider.isAuthenticated()
    const session = this.authProvider.getSession()

    if (isAuthenticated && session) {
      // Check VS Code access
      const { hasAccess, tier } = await this.authProvider.checkVSCodeAccess()

      this.postMessage({
        type: 'authState',
        isAuthenticated: true,
        user: session.user,
        hasVSCodeAccess: hasAccess,
        tier,
      })
    } else {
      this.postMessage({
        type: 'authState',
        isAuthenticated: false,
      })
    }
  }

  /**
   * Handle sending a message
   */
  private async handleSendMessage(
    text: string,
    mode: 'quick' | 'thoughtful' | 'contemplate' = 'quick'
  ): Promise<void> {
    if (!this.authProvider.isAuthenticated()) {
      this.postMessage({
        type: 'error',
        message: 'Please sign in to chat with OSQR',
      })
      return
    }

    try {
      // Show user message immediately
      this.postMessage({
        type: 'userMessage',
        text,
      })

      // Start streaming indicator
      this.postMessage({ type: 'streamStart' })

      // Send message and get streaming reader
      const reader = await this.apiClient.sendMessage(text, this.currentThreadId, mode)

      // Process stream
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Parse SSE events
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              if (parsed.type === 'content') {
                fullResponse += parsed.text
                this.postMessage({
                  type: 'streamContent',
                  text: parsed.text,
                })
              } else if (parsed.type === 'threadId') {
                this.currentThreadId = parsed.threadId
              } else if (parsed.type === 'tokensUsed') {
                // Update usage meter
                vscode.commands.executeCommand('osqr.refreshUsage')
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Stream complete
      this.postMessage({
        type: 'streamEnd',
        fullResponse,
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error'

      this.postMessage({
        type: 'error',
        message: errorMessage,
      })

      // Check for tier-related errors
      if (errorMessage.includes('Pro tier')) {
        this.postMessage({
          type: 'showUpgrade',
          reason: 'VS Code access requires Pro tier or higher',
        })
      } else if (errorMessage.includes('token limit')) {
        this.postMessage({
          type: 'showUpgrade',
          reason: 'Monthly token limit exceeded',
        })
      }
    }
  }

  /**
   * Get HTML content for the webview
   */
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OSQR Chat</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 8px;
    }

    /* Auth screen */
    .auth-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 20px;
    }

    .auth-screen h2 {
      margin-bottom: 12px;
      color: var(--vscode-foreground);
    }

    .auth-screen p {
      margin-bottom: 20px;
      color: var(--vscode-descriptionForeground);
    }

    /* Upgrade screen */
    .upgrade-screen {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 20px;
    }

    .upgrade-screen.visible {
      display: flex;
    }

    .upgrade-screen h2 {
      margin-bottom: 12px;
      color: var(--vscode-notificationsWarningIcon-foreground);
    }

    /* Messages area */
    .messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .message {
      padding: 10px 12px;
      border-radius: 8px;
      max-width: 90%;
      word-wrap: break-word;
    }

    .message.user {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      align-self: flex-end;
    }

    .message.assistant {
      background-color: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      align-self: flex-start;
    }

    .message.assistant .content {
      white-space: pre-wrap;
    }

    .message .actions {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--vscode-widget-border);
    }

    .message .actions button {
      font-size: 11px;
      padding: 2px 6px;
      background: transparent;
      border: 1px solid var(--vscode-widget-border);
      color: var(--vscode-foreground);
      border-radius: 4px;
      cursor: pointer;
    }

    .message .actions button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    /* Streaming indicator */
    .streaming {
      display: none;
      padding: 8px;
      color: var(--vscode-descriptionForeground);
    }

    .streaming.visible {
      display: block;
    }

    .streaming::after {
      content: '';
      animation: dots 1.5s infinite;
    }

    @keyframes dots {
      0%, 20% { content: '.'; }
      40% { content: '..'; }
      60%, 100% { content: '...'; }
    }

    /* Input area */
    .input-area {
      padding: 8px 0;
      border-top: 1px solid var(--vscode-widget-border);
    }

    .input-container {
      display: flex;
      gap: 8px;
    }

    .input-container textarea {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--vscode-input-border);
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      resize: none;
      font-family: inherit;
      font-size: inherit;
      min-height: 60px;
    }

    .input-container textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .input-container button {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      align-self: flex-end;
    }

    .input-container button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }

    .input-container button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Mode selector */
    .mode-selector {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .mode-selector button {
      padding: 4px 8px;
      font-size: 11px;
      background: transparent;
      border: 1px solid var(--vscode-widget-border);
      color: var(--vscode-foreground);
      border-radius: 4px;
      cursor: pointer;
    }

    .mode-selector button.active {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-color: var(--vscode-button-background);
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--vscode-widget-border);
      margin-bottom: 8px;
    }

    .header h3 {
      font-size: 14px;
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      gap: 4px;
    }

    .header-actions button {
      padding: 4px 8px;
      font-size: 11px;
      background: transparent;
      border: none;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 4px;
    }

    .header-actions button:hover {
      background-color: var(--vscode-toolbar-hoverBackground);
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Auth screen -->
    <div id="authScreen" class="auth-screen">
      <h2>Welcome to OSQR</h2>
      <p>Sign in to start chatting with your AI thinking companion.</p>
      <button onclick="signIn()">Sign In</button>
    </div>

    <!-- Upgrade screen -->
    <div id="upgradeScreen" class="upgrade-screen">
      <h2>Upgrade Required</h2>
      <p id="upgradeReason">VS Code access requires Pro tier or higher.</p>
      <button onclick="upgrade()">Upgrade to Pro</button>
      <button onclick="hideUpgrade()" style="margin-top: 8px; background: transparent; border: 1px solid var(--vscode-widget-border);">Dismiss</button>
    </div>

    <!-- Chat interface -->
    <div id="chatInterface" class="hidden">
      <div class="header">
        <h3>OSQR Chat</h3>
        <div class="header-actions">
          <button onclick="newThread()" title="New conversation">New</button>
          <button onclick="signOut()" title="Sign out">Sign Out</button>
        </div>
      </div>

      <div id="messages" class="messages"></div>

      <div id="streaming" class="streaming">Oscar is thinking</div>

      <div class="input-area">
        <div class="mode-selector">
          <button id="modeQuick" class="active" onclick="setMode('quick')">Quick</button>
          <button id="modeThoughtful" onclick="setMode('thoughtful')">Thoughtful</button>
          <button id="modeContemplate" onclick="setMode('contemplate')">Contemplate</button>
        </div>
        <div class="input-container">
          <textarea
            id="messageInput"
            placeholder="Ask OSQR anything..."
            onkeydown="handleKeyDown(event)"
          ></textarea>
          <button id="sendButton" onclick="sendMessage()">Send</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let currentMode = 'quick';
    let isStreaming = false;
    let currentAssistantMessage = null;

    // Initialize
    window.addEventListener('load', () => {
      vscode.postMessage({ type: 'ready' });
    });

    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;

      switch (message.type) {
        case 'authState':
          updateAuthState(message);
          break;
        case 'userMessage':
          addUserMessage(message.text);
          break;
        case 'streamStart':
          startStreaming();
          break;
        case 'streamContent':
          appendStreamContent(message.text);
          break;
        case 'streamEnd':
          endStreaming(message.fullResponse);
          break;
        case 'error':
          showError(message.message);
          break;
        case 'showUpgrade':
          showUpgradeScreen(message.reason);
          break;
        case 'threadCleared':
          clearMessages();
          break;
      }
    });

    function updateAuthState(state) {
      const authScreen = document.getElementById('authScreen');
      const chatInterface = document.getElementById('chatInterface');
      const upgradeScreen = document.getElementById('upgradeScreen');

      if (state.isAuthenticated) {
        authScreen.classList.add('hidden');

        if (state.hasVSCodeAccess) {
          chatInterface.classList.remove('hidden');
          upgradeScreen.classList.remove('visible');
        } else {
          chatInterface.classList.add('hidden');
          showUpgradeScreen('VS Code access requires Pro tier or higher.');
        }
      } else {
        authScreen.classList.remove('hidden');
        chatInterface.classList.add('hidden');
        upgradeScreen.classList.remove('visible');
      }
    }

    function signIn() {
      vscode.postMessage({ type: 'signIn' });
    }

    function signOut() {
      vscode.postMessage({ type: 'signOut' });
    }

    function upgrade() {
      vscode.postMessage({ type: 'upgrade' });
    }

    function showUpgradeScreen(reason) {
      document.getElementById('upgradeReason').textContent = reason;
      document.getElementById('upgradeScreen').classList.add('visible');
      document.getElementById('chatInterface').classList.add('hidden');
    }

    function hideUpgrade() {
      document.getElementById('upgradeScreen').classList.remove('visible');
    }

    function newThread() {
      vscode.postMessage({ type: 'newThread' });
    }

    function clearMessages() {
      document.getElementById('messages').innerHTML = '';
    }

    function setMode(mode) {
      currentMode = mode;
      document.querySelectorAll('.mode-selector button').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('mode' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');
    }

    function handleKeyDown(event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    }

    function sendMessage() {
      if (isStreaming) return;

      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      if (!text) return;

      input.value = '';
      vscode.postMessage({ type: 'sendMessage', text, mode: currentMode });
    }

    function addUserMessage(text) {
      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'message user';
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function startStreaming() {
      isStreaming = true;
      document.getElementById('sendButton').disabled = true;
      document.getElementById('streaming').classList.add('visible');

      // Create assistant message element
      const messages = document.getElementById('messages');
      currentAssistantMessage = document.createElement('div');
      currentAssistantMessage.className = 'message assistant';
      currentAssistantMessage.innerHTML = '<div class="content"></div>';
      messages.appendChild(currentAssistantMessage);
    }

    function appendStreamContent(text) {
      if (currentAssistantMessage) {
        const content = currentAssistantMessage.querySelector('.content');
        content.textContent += text;
        const messages = document.getElementById('messages');
        messages.scrollTop = messages.scrollHeight;
      }
    }

    function endStreaming(fullResponse) {
      isStreaming = false;
      document.getElementById('sendButton').disabled = false;
      document.getElementById('streaming').classList.remove('visible');

      if (currentAssistantMessage) {
        // Add action buttons
        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.innerHTML = \`
          <button onclick="markAsDecision(this)">Mark as Decision</button>
          <button onclick="copyToClipboard(this)">Copy</button>
        \`;
        currentAssistantMessage.appendChild(actions);
      }

      currentAssistantMessage = null;
    }

    function showError(message) {
      isStreaming = false;
      document.getElementById('sendButton').disabled = false;
      document.getElementById('streaming').classList.remove('visible');

      const messages = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'message assistant';
      div.style.borderColor = 'var(--vscode-errorForeground)';
      div.textContent = 'Error: ' + message;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }

    function markAsDecision(button) {
      const message = button.closest('.message');
      const content = message.querySelector('.content');
      if (content) {
        vscode.postMessage({ type: 'markDecision', text: content.textContent });
      }
    }

    function copyToClipboard(button) {
      const message = button.closest('.message');
      const content = message.querySelector('.content');
      if (content) {
        navigator.clipboard.writeText(content.textContent);
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = 'Copy';
        }, 2000);
      }
    }
  </script>
</body>
</html>`
  }
}
