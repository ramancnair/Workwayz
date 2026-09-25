'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { 
  Bot, 
  Search, 
  Sparkles, 
  Trophy, 
  Cpu, 
  Layers, 
  Zap, 
  ExternalLink,
  Flame,
  Star
} from 'lucide-react';

interface ModelInfo {
  name: string;
  badge?: string;
  highlight?: string;
}

interface RankedRow {
  rank: number;
  openAi: ModelInfo;
  google: ModelInfo;
  anthropic: ModelInfo;
  deepseek: ModelInfo;
  llama: ModelInfo;
}

const MODEL_DATA: RankedRow[] = [
  {
    rank: 1,
    openAi: { name: 'o3', badge: 'Reasoning', highlight: 'Frontier reasoning benchmark leader' },
    google: { name: 'Gemini 2.5 Pro', badge: 'Reasoning & Multimodal', highlight: 'Next-gen adaptive reasoning & deep analysis' },
    anthropic: { name: 'Claude 3.7 Sonnet', badge: 'Hybrid Reasoning', highlight: 'Pioneering hybrid thought & instant generation' },
    deepseek: { name: 'DeepSeek-R1', badge: 'Open Reasoning', highlight: 'Frontier RL open-weights reasoning standard' },
    llama: { name: 'Llama 3.3 70B', badge: 'Open Weights', highlight: 'Flagship 405B-rivaling efficiency & instruction' },
  },
  {
    rank: 2,
    openAi: { name: 'o3-mini', badge: 'Fast Reasoning', highlight: 'Ultra-fast STEM & coding reasoning' },
    google: { name: 'Gemini 2.5 Flash', badge: 'Fast Frontier', highlight: 'Extreme throughput frontier capability' },
    anthropic: { name: 'Claude 3.5 Sonnet', badge: 'Coding Leader', highlight: 'Industry-standard agentic coding & tools' },
    deepseek: { name: 'DeepSeek-V3', badge: '671B MoE', highlight: 'Ultra-low cost frontier mixture of experts' },
    llama: { name: 'Llama 3.1 405B', badge: 'Frontier Open', highlight: 'Largest public weights open foundation model' },
  },
  {
    rank: 3,
    openAi: { name: 'o1', badge: 'Deep Reasoning', highlight: 'Chain-of-thought self-correction flagship' },
    google: { name: 'Gemini 2.0 Flash Thinking', badge: 'Experimental RL', highlight: 'Visible internal reasoning scratchpad' },
    anthropic: { name: 'Claude 3.5 Haiku', badge: 'High Speed', highlight: 'Rapid coding intelligence at minimal cost' },
    deepseek: { name: 'DeepSeek-R1-Zero', badge: 'Pure RL', highlight: 'Self-evolved reasoning without human cold-start' },
    llama: { name: 'Llama 3.1 70B', badge: 'Enterprise Open', highlight: 'Standard backbone for enterprise self-hosting' },
  },
  {
    rank: 4,
    openAi: { name: 'o1-pro', badge: 'Pro Compute', highlight: 'Deep-compute extended deliberation' },
    google: { name: 'Gemini 2.0 Pro', badge: 'Multimodal Flagship', highlight: 'Advanced agentic workflows & coding' },
    anthropic: { name: 'Claude 3 Opus', badge: 'Deep Synthesis', highlight: 'Exceptional creative writing & philosophy' },
    deepseek: { name: 'DeepSeek-Coder-V2 236B', badge: 'Code MoE', highlight: 'Supports 338 programming languages' },
    llama: { name: 'Llama 3.2 90B Vision', badge: 'Multimodal', highlight: 'High-resolution image reasoning & OCR' },
  },
  {
    rank: 5,
    openAi: { name: 'o1-mini', badge: 'STEM Reasoning', highlight: 'Lightweight math and syntax generation' },
    google: { name: 'Gemini 2.0 Flash', badge: 'Multimodal Workhorse', highlight: 'Real-time low-latency audio, vision, text' },
    anthropic: { name: 'Claude 3 Sonnet', badge: 'Enterprise Tier', highlight: 'Balanced enterprise analysis baseline' },
    deepseek: { name: 'DeepSeek-V2.5', badge: 'Unified MoE', highlight: 'Merged chat and code alignment' },
    llama: { name: 'Llama 3.2 11B Vision', badge: 'Compact Vision', highlight: 'Edge-capable multimodal visual reasoning' },
  },
  {
    rank: 6,
    openAi: { name: 'GPT-4.5 (Orion)', badge: 'Dense Frontier', highlight: 'Massive scale foundational dense architecture' },
    google: { name: 'Gemini 1.5 Pro', badge: '2M Context', highlight: 'World-record 2-million token context window' },
    anthropic: { name: 'Claude 3 Haiku', badge: 'Lightweight', highlight: 'Instantaneous response agent assistant' },
    deepseek: { name: 'DeepSeek-V2 236B', badge: 'Sparse MLA', highlight: 'Introduced Multi-Head Latent Attention' },
    llama: { name: 'Llama 3.1 8B', badge: 'Efficient Open', highlight: 'Best-in-class small footprint open model' },
  },
  {
    rank: 7,
    openAi: { name: 'GPT-4o', badge: 'Omni Flagship', highlight: 'Native multimodal speech, vision, text' },
    google: { name: 'Gemini 1.5 Flash', badge: 'High Throughput', highlight: '1M context high-efficiency processing' },
    anthropic: { name: 'Claude 2.1', badge: '200K Context', highlight: 'High accuracy document summarization' },
    deepseek: { name: 'DeepSeek-Coder-33B', badge: 'Dense Coding', highlight: 'Dedicated software engineering foundation' },
    llama: { name: 'Llama 3.2 3B', badge: 'On-Device', highlight: 'Optimized for laptops, phones, edge devices' },
  },
  {
    rank: 8,
    openAi: { name: 'GPT-4o mini', badge: 'Cost Efficient', highlight: 'Affordable high-volume inference' },
    google: { name: 'Gemini 1.5 Flash-8B', badge: 'Ultra Fast', highlight: 'Extreme low-latency multimodal micro-model' },
    anthropic: { name: 'Claude 2.0', badge: 'Foundational', highlight: 'Constitutional AI milestone model' },
    deepseek: { name: 'DeepSeek-LLM-67B', badge: 'Dense 67B', highlight: 'Full dense general knowledge engine' },
    llama: { name: 'Llama 3.2 1B', badge: 'Mobile Edge', highlight: 'Sub-gigabyte ultra-compact deployment' },
  },
  {
    rank: 9,
    openAi: { name: 'GPT-4 Turbo', badge: '128K Context', highlight: 'Production enterprise standard API' },
    google: { name: 'Gemma 2 27B', badge: 'Open Weights', highlight: 'Google flagship open-weights architecture' },
    anthropic: { name: 'Claude Instant 1.2', badge: 'Legacy Fast', highlight: 'Rapid conversational interface' },
    deepseek: { name: 'DeepSeek-Math-7B', badge: 'Math Specialist', highlight: 'State-of-the-art 7B mathematical proofs' },
    llama: { name: 'Code Llama 70B', badge: 'Code Specialist', highlight: 'Python and software pipeline generator' },
  },
  {
    rank: 10,
    openAi: { name: 'GPT-4', badge: 'Historic', highlight: 'The original breakthrough frontier LLM' },
    google: { name: 'Gemma 2 9B', badge: 'Open Weights', highlight: 'Efficient open community favorite' },
    anthropic: { name: 'Claude 1.3', badge: 'Historic', highlight: 'First commercial constitutional AI model' },
    deepseek: { name: 'DeepSeek-Coder-7B', badge: 'Lightweight Code', highlight: 'Fast local code autocompletion' },
    llama: { name: 'Llama 2 70B', badge: 'Historic Open', highlight: 'Catalyst of the modern open-source revolution' },
  },
];

const PROVIDERS = [
  { id: 'openAi', name: 'OpenAI', color: 'emerald', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { id: 'google', name: 'Google', color: 'blue', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  { id: 'anthropic', name: 'Anthropic', color: 'amber', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { id: 'deepseek', name: 'DeepSeek', color: 'indigo', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { id: 'llama', name: 'Llama (Meta)', color: 'purple', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
];

export default function ModelListPage() {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!search.trim()) return MODEL_DATA;
    const q = search.toLowerCase();
    return MODEL_DATA.filter(row => {
      const matchOpenAi = row.openAi.name.toLowerCase().includes(q) || row.openAi.badge?.toLowerCase().includes(q);
      const matchGoogle = row.google.name.toLowerCase().includes(q) || row.google.badge?.toLowerCase().includes(q);
      const matchAnthropic = row.anthropic.name.toLowerCase().includes(q) || row.anthropic.badge?.toLowerCase().includes(q);
      const matchDeepseek = row.deepseek.name.toLowerCase().includes(q) || row.deepseek.badge?.toLowerCase().includes(q);
      const matchLlama = row.llama.name.toLowerCase().includes(q) || row.llama.badge?.toLowerCase().includes(q);
      return matchOpenAi || matchGoogle || matchAnthropic || matchDeepseek || matchLlama;
    });
  }, [search]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30 shadow-sm">
          <Trophy className="w-4 h-4" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/30 text-slate-700 dark:text-slate-300 font-bold border border-slate-400/30 shadow-sm">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-700/30 shadow-sm">
          3
        </div>
      );
    }
    return (
      <span className="font-semibold text-muted-foreground w-8 text-center">
        #{rank}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader 
        title="Model List" 
        description="Comprehensive ranking of the top 10 strongest trained models across the world's leading AI providers."
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {PROVIDERS.map((prov) => (
          <Card 
            key={prov.id}
            onClick={() => setActiveProvider(activeProvider === prov.id ? null : prov.id)}
            className={`cursor-pointer transition-all border ${activeProvider === prov.id ? 'ring-2 ring-primary border-primary shadow-md' : 'hover:border-border hover:shadow-sm'}`}
          >
            <CardContent className="p-4 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{prov.name}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0.5 ${prov.bg}`}>
                  10 Models
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Top: <span className="font-medium text-foreground">{MODEL_DATA[0][prov.id as keyof RankedRow]?.name}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search model name, architecture, or tag..."
            className="pl-9 bg-background"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeProvider && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setActiveProvider(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear provider filter
            </Button>
          )}
          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
            Showing {filteredData.length} of 10 ranks
          </Badge>
        </div>
      </div>

      {/* Ranked Models Table */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Top 10 Frontier Models Matrix
              </CardTitle>
              <CardDescription>
                Ranked by general reasoning, coding, STEM capability, and benchmark performance.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table className="min-w-[950px]">
            <TableHeader className="bg-muted/50">
              <TableRow className="border-b">
                <TableHead className="w-20 text-center font-bold text-foreground">Rank</TableHead>
                <TableHead className={`font-semibold ${activeProvider === 'openAi' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    OpenAI
                  </div>
                </TableHead>
                <TableHead className={`font-semibold ${activeProvider === 'google' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    Google
                  </div>
                </TableHead>
                <TableHead className={`font-semibold ${activeProvider === 'anthropic' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Anthropic
                  </div>
                </TableHead>
                <TableHead className={`font-semibold ${activeProvider === 'deepseek' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                    DeepSeek
                  </div>
                </TableHead>
                <TableHead className={`font-semibold ${activeProvider === 'llama' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
                    Llama (Meta)
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.rank} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-center font-medium align-middle">
                    <div className="flex items-center justify-center">
                      {getRankBadge(row.rank)}
                    </div>
                  </TableCell>

                  {/* OpenAI */}
                  <TableCell className={activeProvider === 'openAi' ? 'bg-emerald-500/5' : ''}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{row.openAi.name}</span>
                        {row.openAi.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                            {row.openAi.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{row.openAi.highlight}</span>
                    </div>
                  </TableCell>

                  {/* Google */}
                  <TableCell className={activeProvider === 'google' ? 'bg-blue-500/5' : ''}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{row.google.name}</span>
                        {row.google.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                            {row.google.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{row.google.highlight}</span>
                    </div>
                  </TableCell>

                  {/* Anthropic */}
                  <TableCell className={activeProvider === 'anthropic' ? 'bg-amber-500/5' : ''}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{row.anthropic.name}</span>
                        {row.anthropic.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                            {row.anthropic.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{row.anthropic.highlight}</span>
                    </div>
                  </TableCell>

                  {/* DeepSeek */}
                  <TableCell className={activeProvider === 'deepseek' ? 'bg-indigo-500/5' : ''}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{row.deepseek.name}</span>
                        {row.deepseek.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                            {row.deepseek.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{row.deepseek.highlight}</span>
                    </div>
                  </TableCell>

                  {/* Llama */}
                  <TableCell className={activeProvider === 'llama' ? 'bg-purple-500/5' : ''}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{row.llama.name}</span>
                        {row.llama.badge && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                            {row.llama.badge}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground line-clamp-1">{row.llama.highlight}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
