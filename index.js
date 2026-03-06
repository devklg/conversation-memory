#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const UNIVERSAL_GATEWAY_URL = process.env.UNIVERSAL_GATEWAY_URL || 'http://localhost:3000';
const PERRY_TOOL = 'perry';
const PERRY_ACTION = 'save_conversation';

function analyzeConversation(content, userTitle, userTags) {
  const lines = content.split('\n');
  const title = userTitle || lines[0].replace(/^[#*\s]+/, '').slice(0, 100) || 'Conversation';
  const summary = content.slice(0, 500).replace(/\n/g, ' ') + (content.length > 500 ? '...' : '');
  
  const tasks = lines.filter(line => /TODO:|Action:|\u2610|\u25a1/i.test(line)).map(l => l.trim()).slice(0, 10);
  const artifacts = lines.filter(line => /\.(docx|pdf|txt|md|xlsx|png)/i.test(line)).map(l => l.trim()).slice(0, 10);
  const findings = lines.filter(line => /Result:|Finding:|\u2713|\u2705/i.test(line)).map(l => l.trim()).slice(0, 10);
  
  const autoTags = [];
  if (content.match(/revenue|income/i)) autoTags.push('REVENUE');
  if (content.match(/launch|deploy/i)) autoTags.push('LAUNCH');
  if (content.match(/urgent|critical/i)) autoTags.push('IMPORTANT');
  
  const allTags = [...new Set([...(userTags || []), ...autoTags])];
  const priority = content.match(/urgent|critical/i) ? 'URGENT' : content.match(/important|high/i) ? 'HIGH' : 'MEDIUM';
  
  return { title, summary, tasks: tasks.length ? tasks : ['No action items'], artifacts, findings, tags: allTags, priority, category: 'general' };
}

async function saveToPerryViaGateway(params) {
  const response = await axios.post(`${UNIVERSAL_GATEWAY_URL}/api/execute`, { tool: PERRY_TOOL, action: PERRY_ACTION, params });
  return response.data;
}

const server = new Server({ name: 'conversation-memory', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'save_conversation',
    description: 'Auto-persist conversation to Perry/Neo4j. Extracts title, summary, tasks, findings automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Full conversation content' },
        title: { type: 'string', description: 'Optional title' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Optional tags' }
      },
      required: ['content']
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'save_conversation') {
    const analyzed = analyzeConversation(args.content, args.title, args.tags);
    const result = await saveToPerryViaGateway(analyzed);
    return {
      content: [{ type: 'text', text: `✅ Saved! Chat #${result.data?.chatNumber?.low}\nTitle: ${analyzed.title}\nTags: ${analyzed.tags.join(', ')}` }]
    };
  }
  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Conversation Memory MCP Server running');
}

main().catch((error) => { console.error('Error:', error); process.exit(1); });