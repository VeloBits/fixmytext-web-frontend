import { useState, useCallback } from 'react';

interface PipelineStep {
  toolId: string;
  label: string;
  result: string;
  timestamp: number;
}

interface UsePipelineReturn {
  steps: PipelineStep[];
  addStep: (toolId: string, label: string, result: string) => void;
  clearPipeline: () => void;
}

export default function usePipeline(): UsePipelineReturn {
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  const addStep = useCallback((toolId: string, label: string, result: string): void => {
    setSteps((prev) => [...prev, { toolId, label, result, timestamp: Date.now() }]);
  }, []);

  const clearPipeline = useCallback((): void => {
    setSteps([]);
  }, []);

  return { steps, addStep, clearPipeline };
}
