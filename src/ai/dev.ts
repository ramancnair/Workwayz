'use client';
import { config } from 'dotenv';
config();

import '@/ai/flows/task-test-suggestions.ts';
import '@/ai/flows/ai-suggest-tech-stack.ts';
import '@/ai/flows/ai-suggest-horizontals.ts';
import '@/ai/flows/ai-story-generator.ts';
import '@/ai/flows/ai-test-case-generator.ts';
import '@/ai/flows/ai-risk-generator.ts';
import '@/ai/flows/ai-assumption-generator.ts';
import '@/ai/flows/ai-dependency-generator.ts';
import '@/ai/flows/ai-holiday-generator.ts';

