import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TOOL_CATALOG, TOOL_CATALOG_MAP } from './tool-catalog';

export const ToolSearchInputSchema = z.object({
  query: z
    .string()
    .describe('Keywords or description of the needed capability, e.g., "restore trash item", "BCP disaster recovery", "approve leave".'),
  limit: z.number().default(5).optional().describe('Maximum number of tool definitions to return.'),
});

export const ToolSearchResultSchema = z.object({
  success: z.boolean(),
  totalMatches: z.number(),
  matches: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      description: z.string(),
      params: z.array(z.string()),
      aliases: z.array(z.string()),
    })
  ),
  message: z.string(),
});

/**
 * Anthropic-style deferred tool search meta-tool.
 * Allows WayFinder to discover any of the 201 tools in the global catalog
 * if the top-15 retrieved candidates did not include a specialized capability.
 */
export const searchToolsTool = ai.defineTool(
  {
    name: 'searchTools',
    description:
      'Discovers and loads specialized tools from the full Workwayz 200+ tool catalog by capability or keyword. Call this tool when your current candidate tools do not include the specific action requested by the user.',
    inputSchema: ToolSearchInputSchema,
    outputSchema: ToolSearchResultSchema,
  },
  async (input) => {
    const { query, limit = 5 } = input;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = TOOL_CATALOG.filter((tool) => tool.name !== 'createUser').map((tool) => {
      let score = 0;
      const lowerName = tool.name.toLowerCase();
      const lowerDesc = tool.description.toLowerCase();
      const lowerSearch = tool.searchText.toLowerCase();

      for (const t of tokens) {
        if (lowerName === t) score += 10;
        else if (lowerName.includes(t)) score += 4;
        if (tool.aliases.some((a) => a.toLowerCase().includes(t))) score += 5;
        if (lowerDesc.includes(t)) score += 2;
        if (lowerSearch.includes(t)) score += 1;
      }
      return { tool, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.filter((s) => s.score > 0).slice(0, limit);

    return {
      success: true,
      totalMatches: topMatches.length,
      matches: topMatches.map((m) => ({
        name: m.tool.name,
        category: m.tool.category,
        description: m.tool.description,
        params: m.tool.params,
        aliases: m.tool.aliases,
      })),
      message:
        topMatches.length > 0
          ? `Found ${topMatches.length} matching tools in the catalog: ${topMatches.map((m) => m.tool.name).join(', ')}.`
          : `No matching tools found for query "${query}".`,
    };
  }
);
