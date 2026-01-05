#!/usr/bin/env node

/**
 * gemini deep research mcp server
 * 
 * wraps google's official deep research agent (deep-research-pro-preview-12-2025)
 * via the interactions api, providing async polling pattern for long-running research tasks.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenAI } from "@google/genai";

// initialize gemini client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("error: GEMINI_API_KEY environment variable is required");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// tool definitions
const tools: Tool[] = [
  {
    name: "start_research",
    description: `start a deep research task using google's official deep research agent.
powered by gemini 3 pro, performs multi-step web research with citations.
returns immediately with a task_id - use get_research_status to check results.
research typically takes 2-20 minutes.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "the research question or topic to investigate",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_research_status",
    description: `check the status and retrieve results of a research task.
IMPORTANT: research takes 2-20 minutes. do NOT poll continuously.
if status is "in_progress", wait for user to ask again later or do other tasks first.
only call this when user explicitly asks to check the research status.`,
    inputSchema: {
      type: "object",
      properties: {
        task_id: {
          type: "string",
          description: "the task_id returned by start_research",
        },
      },
      required: ["task_id"],
    },
  },
  {
    name: "research_with_sources",
    description: `quick research using google search grounding (returns in seconds).
use this for fast queries that don't need deep investigation.
for comprehensive research, use start_research instead.`,
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "the research question",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_research_models",
    description: "list available research models and agents",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// tool handlers
async function startResearch(query: string): Promise<object> {
  try {
    const interaction = await ai.interactions.create({
      agent: "deep-research-pro-preview-12-2025",
      input: query,
      background: true,
    });

    return {
      task_id: interaction.id,
      status: "started",
      message: `research task started. use get_research_status with task_id '${interaction.id}' to check progress. typically takes 2-20 minutes.`,
    };
  } catch (error) {
    return {
      task_id: null,
      status: "error",
      message: `failed to start research: ${error}`,
    };
  }
}

async function getResearchStatus(taskId: string): Promise<object> {
  try {
    const interaction = await ai.interactions.get(taskId);

    if (interaction.status === "completed") {
      const outputs = interaction.outputs || [];
      const lastOutput = outputs[outputs.length - 1] as { text?: string } | undefined;
      const resultText = lastOutput?.text || "research completed but no output generated";
      
      return {
        task_id: taskId,
        status: "completed",
        result: resultText,
      };
    } else if (interaction.status === "failed") {
      const interactionAny = interaction as { error?: unknown };
      return {
        task_id: taskId,
        status: "failed",
        error: String(interactionAny.error || "unknown error"),
      };
    } else {
      return {
        task_id: taskId,
        status: "in_progress",
        message: "research in progress, please check again later...",
      };
    }
  } catch (error) {
    return {
      task_id: taskId,
      status: "error",
      error: `failed to get status: ${error}`,
    };
  }
}

async function researchWithSources(query: string): Promise<object> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `please research the following question and provide detailed citations:\n\n${query}`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });

    const sources: Array<{ title: string; uri: string }> = [];
    
    // extract grounding sources if available
    const candidates = response.candidates || [];
    if (candidates.length > 0) {
      const metadata = candidates[0].groundingMetadata;
      if (metadata?.groundingChunks) {
        for (const chunk of metadata.groundingChunks) {
          if (chunk.web) {
            sources.push({
              title: chunk.web.title || "",
              uri: chunk.web.uri || "",
            });
          }
        }
      }
    }

    return {
      content: response.text || "",
      sources,
    };
  } catch (error) {
    return {
      error: String(error),
      content: null,
      sources: [],
    };
  }
}

function listResearchModels(): object[] {
  return [
    {
      name: "deep-research-pro-preview-12-2025",
      type: "agent",
      description: "gemini deep research agent - for long-running research tasks (2-20 min)",
    },
    {
      name: "gemini-2.5-flash + grounding",
      type: "model",
      description: "quick research with google search grounding (seconds)",
    },
  ];
}

// create mcp server
const server = new Server(
  {
    name: "gemini-deep-research",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: object;

    switch (name) {
      case "start_research":
        result = await startResearch(args?.query as string);
        break;
      case "get_research_status":
        result = await getResearchStatus(args?.task_id as string);
        break;
      case "research_with_sources":
        result = await researchWithSources(args?.query as string);
        break;
      case "list_research_models":
        result = listResearchModels();
        break;
      default:
        throw new Error(`unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ error: String(error) }),
        },
      ],
      isError: true,
    };
  }
});

// start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("gemini deep research mcp server running on stdio");
}

main().catch((error) => {
  console.error("fatal error:", error);
  process.exit(1);
});
