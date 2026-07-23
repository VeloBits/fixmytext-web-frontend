/**
 * Single source of truth for the generated API types is
 * packages/api-client/src/types/openapi.d.ts — regenerated via
 * `npm run gen:types` (see the README next to that file).
 *
 * This module only re-exports them so app-core's existing
 * `types/openapi` imports keep working. Type-only, erased at build:
 * it adds no runtime dependency on api-client.
 */

export type {
  paths,
  webhooks,
  components,
  operations,
  $defs,
} from '@velobits/api-client/types/openapi';
