# Conversation Memory MCP Server

Auto-persist AI conversations to Perry/Neo4j via Universal Gateway. Automatically extracts titles, summaries, tasks, findings, and artifacts from conversation content.

## Features

- ✅ **Automatic Analysis**: Extracts title, summary, tasks, findings, artifacts from conversation
- ✅ **Smart Tagging**: Auto-detects tags like REVENUE, LAUNCH, IMPORTANT based on content
- ✅ **Priority Detection**: Assigns priority (URGENT, HIGH, MEDIUM, LOW) based on keywords
- ✅ **Universal Gateway Integration**: Routes to Perry's save_conversation action
- ✅ **MCP Protocol**: Standard Model Context Protocol server

## Installation

```bash
# Clone the repo
git clone https://github.com/devklg/conversation-memory.git
cd conversation-memory

# Install dependencies
npm install

# Test locally
npm start
```

## Universal Gateway Configuration

Add to your Universal Gateway's MCP servers:

```json
{
  "mcpServers": {
    "conversation-memory": {
      "command": "node",
      "args": ["C:/path/to/conversation-memory/index.js"],
      "env": {
        "UNIVERSAL_GATEWAY_URL": "http://localhost:3000"
      }
    }
  }
}
```

## How It Works

1. **Receives conversation content** via `save_conversation` tool
2. **Analyzes content** to extract:
   - Title (from first line or provided)
   - Summary (first 500 chars)
   - Tasks (lines with TODO, ☐, Action:)
   - Artifacts (mentions of files/documents)
   - Findings (lines with ✓, Result:, Finding:)
   - Tags (auto-detected + user-provided)
   - Priority (based on keywords)
3. **Routes to Perry** via Universal Gateway's `/api/execute` endpoint
4. **Returns confirmation** with Chat # and extracted metadata

## Usage

### From Claude.ai

The `universal-gateway:log_conversation` tool will automatically use this connector:

```
Claude: "Perry persist this chat"
→ Calls universal-gateway:log_conversation
→ Routes to conversation-memory
→ Analyzes and saves to Perry/Neo4j
→ Returns Chat #1009 confirmation
```

### Manual Tool Call

```javascript
{
  "tool": "conversation-memory",
  "action": "save_conversation",
  "params": {
    "content": "Full conversation text here...",
    "title": "Optional custom title",
    "tags": ["CUSTOM", "TAGS"]
  }
}
```

## Auto-Detected Tags

- **REVENUE**: Content mentions revenue, income, profit, earnings, sales
- **LAUNCH**: Content mentions launch, release, deploy, ship, go-live
- **IMPORTANT**: Content mentions urgent, critical, important, ASAP, priority
- **STRATEGY**: Content mentions strategy, plan, roadmap, approach
- **CUSTOMER**: Content mentions customer, client, user, prospect
- **MARKETING**: Content mentions marketing, social media, Facebook, Instagram

## Priority Levels

- **URGENT**: Contains "urgent", "critical", "ASAP"
- **HIGH**: Contains "important", "high priority", "crucial", or mentions revenue/launch/strategy
- **MEDIUM**: Default
- **LOW**: Contains "low priority", "minor", "FYI"

## Environment Variables

- `UNIVERSAL_GATEWAY_URL`: URL of your Universal Gateway (default: http://localhost:3000)

## Dependencies

- `@modelcontextprotocol/sdk`: MCP protocol implementation
- `axios`: HTTP client for Universal Gateway API calls

## Author

Kevin L. Gardner (@devklg)

## License

MIT