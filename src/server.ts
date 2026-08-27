/**
 * Server assembly, shared by both transports.
 *
 * Tools are only one third of what an MCP client can surface. Prompts appear in
 * Claude as slash commands, and resources appear in its attach menu — those are
 * the parts users actually SEE, so they are registered here too rather than
 * treating this as a tools-only server.
 */
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ProspecxClient } from './client.js';
import type { Lead, Paginated } from './types.js';
import { leadDetailMarkdown, leadsMarkdown } from './format.js';
import { registerReadTools } from './tools/read.js';
import { registerWriteTools } from './tools/write.js';
import { registerSpendTools } from './tools/spend.js';
import { registerInsightTools } from './tools/insights.js';

const INSTRUCTIONS = [
  'Prospecx finds people posting buyer intent, scores them for fit, and helps you reach out.',
  '',
  'Start with prospecx_get_today_brief for an open-ended question ("what should I do today"),',
  'or prospecx_search_leads when the user names what they want. Every other lead tool needs a',
  'lead id that those return — never invent one.',
  '',
  'Contact details are locked until paid for. contact_locked: true means the workspace has not',
  'purchased that lead\'s contacts; it does NOT mean the lead has no email.',
  '',
  'Anything that spends points previews first and returns a confirmation token. Always show the',
  'user the cost and get a real answer before sending that token back. Never chain preview and',
  'confirm in one turn.',
].join('\n');

export function buildServer(client: ProspecxClient): McpServer {
  const server = new McpServer(
    { name: 'prospecx-mcp-server', version: '1.1.0' },
    { instructions: INSTRUCTIONS },
  );

  registerReadTools(server, client);
  registerWriteTools(server, client);
  registerSpendTools(server, client);
  registerInsightTools(server, client);
  registerResources(server, client);
  registerPrompts(server);

  return server;
}

/**
 * Resources show up in the client's attach/context picker, so a user can pull a
 * lead into the conversation without the model having to call a tool first.
 */
function registerResources(server: McpServer, client: ProspecxClient): void {
  server.registerResource(
    'today-brief',
    'prospecx://today',
    {
      title: "Today's Prospecx brief",
      description: "The day's moves, deals at risk and forecast for this workspace.",
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const brief = await client.get<{ data: unknown }>('/today');
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: `# Today's brief\n\n\`\`\`json\n${JSON.stringify(brief.data, null, 2)}\n\`\`\`` }] };
    },
  );

  server.registerResource(
    'lead',
    new ResourceTemplate('prospecx://lead/{leadId}', {
      // Lets the client offer real leads for autocomplete instead of making the
      // user paste a UUID they do not have.
      list: async () => {
        // Never let a transient API failure take out the whole resource picker.
        // listResources() enumerates every template, so throwing here would blank
        // the client's attach menu — including the static entries that still work.
        try {
          const page = await client.get<Paginated<Lead>>('/leads', { limit: 50 });
          return {
            resources: (page?.data ?? []).map((l) => ({
              uri: `prospecx://lead/${l.id}`,
              name: l.name ?? 'Unnamed lead',
              description: [l.headline, l.company].filter(Boolean).join(' · ') || undefined,
              mimeType: 'text/markdown',
            })),
          };
        } catch {
          return { resources: [] };
        }
      },
    }),
    { title: 'Prospecx lead', description: 'One lead, with the post that surfaced them.', mimeType: 'text/markdown' },
    async (uri, { leadId }) => {
      const lead = await client.get<Lead>(`/leads/${String(leadId)}`);
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: leadDetailMarkdown(lead) }] };
    },
  );

  server.registerResource(
    'hot-leads',
    'prospecx://leads/hot',
    { title: 'Hot leads', description: 'Highest-scoring open leads in this workspace.', mimeType: 'text/markdown' },
    async (uri) => {
      const page = await client.get<Paginated<Lead>>('/leads', { score_min: 7, limit: 25 });
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: leadsMarkdown(page, 'Hot leads') }] };
    },
  );
}

/**
 * Prompts surface in Claude as slash commands — the most visible, most
 * discoverable thing an MCP server can offer. Each is written as an instruction
 * to the assistant, not as a question to the user.
 */
function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'prospecx_daily_standup',
    {
      title: 'Prospecx: daily standup',
      description: "Read today's brief and turn it into a short, prioritised plan for the day.",
      argsSchema: {},
    },
    () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            "Call prospecx_get_today_brief, then prospecx_get_pipeline.",
            '',
            'Give me a standup in three parts:',
            '1. The single most important thing to do today, and why.',
            '2. Up to four other moves worth making, each one line, each naming the lead.',
            '3. Anything at risk of going cold, with what to do about it.',
            '',
            'Be specific and short. No preamble. If something needs a point spend, say what it costs',
            'and ask before doing it — do not spend anything while writing this.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'prospecx_prep_call',
    {
      title: 'Prospecx: prep me for a call',
      description: 'Build a one-page brief on a lead before you speak to them.',
      argsSchema: {
        lead: z.string().describe("The lead's name, company, or id — I will look them up."),
      },
    },
    ({ lead }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Prepare me for a call with: ${lead}`,
            '',
            'Find them with prospecx_search_leads, then read the full record with prospecx_get_lead.',
            '',
            'Give me:',
            '- Who they are and what their company does.',
            '- The post that put them on my radar, quoted, and what it implies they need.',
            '- Three questions worth asking, grounded in that post rather than generic.',
            '- Anything already recorded: notes, status, deal value.',
            '- One risk or objection to expect.',
            '',
            'If their contacts are locked, mention it and the cost, but do NOT unlock without asking.',
          ].join('\n'),
        },
      }],
    }),
  );

  server.registerPrompt(
    'prospecx_write_outreach',
    {
      title: 'Prospecx: draft an opener',
      description: 'Draft a first outreach message grounded in what the lead actually posted.',
      argsSchema: {
        lead: z.string().describe("The lead's name, company, or id."),
        angle: z.string().optional().describe("Optional slant, e.g. 'short and direct', 'offer a teardown', 'Hinglish'."),
      },
    },
    ({ lead, angle }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: [
            `Draft a first outreach message to: ${lead}`,
            angle ? `Angle: ${angle}` : '',
            '',
            'Read them first with prospecx_search_leads then prospecx_get_lead. Ground the message in',
            'the specific post that surfaced them — quote or paraphrase it so it could not have been',
            'sent to anyone else.',
            '',
            'Rules: under 90 words. No "I hope this finds you well". No flattery. One clear ask.',
            'Show me the draft — do NOT send anything.',
          ].filter(Boolean).join('\n'),
        },
      }],
    }),
  );
}
