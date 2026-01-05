# gemini-deep-research-mcp

MCP server for Google's official Gemini Deep Research Agent via the Interactions API (released December 2025).

Wraps Google's `deep-research-pro-preview-12-2025` agent, powered by Gemini 3 Pro.

## Features

- **Official Deep Research Agent** - uses Google's `deep-research-pro-preview-12-2025` via Interactions API
- **Async Polling Pattern** - non-blocking design, won't freeze your client
- **Quick Research Fallback** - fast queries using Google Search grounding

## Installation

```bash
npm install -g gemini-deep-research-mcp
```

Or run directly with npx:

```bash
npx gemini-deep-research-mcp
```

## Configuration

Get your API key from [Google AI Studio](https://aistudio.google.com/).

Add to your MCP client config (Claude Desktop, Cursor, Kiro, etc.):

```json
{
  "mcpServers": {
    "gemini-deep-research": {
      "command": "npx",
      "args": ["gemini-deep-research-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Tools

### start_research

Start a deep research task (returns immediately with task_id).

```
query: "what are the latest developments in quantum computing?"
```

Returns:
```json
{
  "task_id": "v1_xxx...",
  "status": "started",
  "message": "research task started. typically takes 2-20 minutes."
}
```

### get_research_status

Check research progress and get results.

```
task_id: "v1_xxx..."
```

Returns (when completed):
```json
{
  "task_id": "v1_xxx...",
  "status": "completed",
  "result": "# research report\n\n..."
}
```

### research_with_sources

Quick research using Google Search grounding (returns in seconds).

```
query: "current bitcoin price"
```

### list_research_models

List available research models and agents.

## Usage Workflow

1. Call `start_research` with your query → get `task_id`
2. Continue chatting while research runs in background
3. Call `get_research_status` to check progress
4. When status is "completed", get full research report

## About the Interactions API

This MCP wraps Google's [Interactions API](https://ai.google.dev/gemini-api/docs/deep-research) and the `deep-research-pro-preview-12-2025` agent, which:

- Uses Gemini 3 Pro as reasoning core
- Achieves 46.4% on Humanity's Last Exam (SOTA)
- Performs multi-step web research with citations
- Trained specifically to reduce hallucinations

## License

MIT
