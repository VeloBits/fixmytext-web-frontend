import { Suspense, type ReactNode } from 'react';
import RemoteErrorBoundary from './RemoteErrorBoundary';
import PageSkeleton from './PageSkeleton';

interface Props {
  name: string;
  children: ReactNode;
}

/**
 * Wraps a Module Federation remote with its own independent loading and error states.
 * Loading  → PageSkeleton (shimmer)
 * Loaded   → children render normally
 * Failed   → RemoteErrorBoundary error UI with reload prompt
 *
 * Each remote gets its own boundary so a failure in one doesn't affect others.
 */
export default function RemoteBoundary({ name, children }: Props) {
  return (
    <RemoteErrorBoundary name={name}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </RemoteErrorBoundary>
  );
}
