import React, { Suspense } from 'react';
import LoadingScreen from './LoadingScreen';

/**
 * Wraps a lazy-loaded component with Suspense + LoadingScreen
 * Usage: <LazyLoader component={MyLazyComponent} />
 */
export default function LazyLoader({ component: Component, ...props }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Higher-order component for wrapping lazy-loaded routes
 * Usage: const LazyPage = withLazyLoader(lazy(() => import('./pages/SomePage')))
 */
export function withLazyLoader(LazyComponent) {
  return (props) => (
    <Suspense fallback={<LoadingScreen />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}
