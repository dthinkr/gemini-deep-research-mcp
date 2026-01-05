# gemini-deep-research-mcp

MCP server for Google's official Gemini Deep Research Agent via the Interactions API (released December 2025).

Wraps Google's `deep-research-pro-preview-12-2025` agent, powered by Gemini 3 Pro.

## features

- **official deep research agent** - uses google's `deep-research-pro-preview-12-2025` via interactions api
- **async polling pattern** - non-blocking design, won't freeze your client
- **quick research fallback** - fast queries using google search grounding

## installation

```bash
npm install -g gemini-deep-research-mcp
```

or run directly with npx:

```bash
npx gemini-deep-research-mcp
```

## configuration

get your api key from [google ai studio](https://aistudio.google.com/).

### claude desktop

add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### cursor / kiro

add to your mcp settings:

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

## tools

### start_research

start a deep research task (returns immediately with task_id).

```
query: "what are the latest developments in quantum computing?"
```

returns:
```json
{
  "task_id": "v1_xxx...",
  "status": "started",
  "message": "research task started. typically takes 2-20 minutes."
}
```

### get_research_status

check research progress and get results.

```
task_id: "v1_xxx..."
```

returns (when completed):
```json
{
  "task_id": "v1_xxx...",
  "status": "completed",
  "result": "# research report\n\n..."
}
```

### research_with_sources

quick research using google search grounding (returns in seconds).

```
query: "current bitcoin price"
```

### list_research_models

list available research models and agents.

## usage workflow

1. call `start_research` with your query → get `task_id`
2. continue chatting while research runs in background
3. call `get_research_status` to check progress
4. when status is "completed", get full research report

## why this mcp?

this mcp wraps google's **official** deep research agent, which:

- uses gemini 3 pro as reasoning core
- achieves 46.4% on humanity's last exam (sota)
- performs multi-step web research with citations
- trained specifically to reduce hallucinations

## license

MIT
