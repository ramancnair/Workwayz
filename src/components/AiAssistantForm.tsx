'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getAiTaskSuggestions } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Lightbulb } from 'lucide-react';

const formSchema = z.object({
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  context: z.string().optional(),
});

type AiAssistantFormProps = {
  initialDescription?: string;
  projectContext?: string;
};

export function AiAssistantForm({ initialDescription = '', projectContext = '' }: AiAssistantFormProps) {
  const [suggestions, setSuggestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialDescription,
      context: projectContext,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError('');
    setSuggestions('');
    const result = await getAiTaskSuggestions({
      taskOrTestCaseDescription: values.description,
      projectContext: values.context,
    });
    if (result.error) {
      setError(result.error);
    } else {
      setSuggestions(result.suggestions);
    }
    setIsLoading(false);
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter a detailed description..." {...field} rows={5} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Getting Suggestions...' : 'Get AI Suggestions'}
          </Button>
        </form>
      </Form>
      {suggestions && (
        <Alert className="mt-4">
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Suggestions</AlertTitle>
          <AlertDescription>
            <div className="whitespace-pre-wrap">{suggestions}</div>
          </AlertDescription>
        </Alert>
      )}
      {error && (
         <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
