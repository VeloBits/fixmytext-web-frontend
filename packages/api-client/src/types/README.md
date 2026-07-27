# Generated API types

The generated types live in **`packages/api-client/src/types/openapi.d.ts`**
(single source of truth). `openapi.d.ts` in packages/app-core/src/types is a one-line
type-only re-export of it, kept so app-core's `types/openapi` imports keep
working. Never paste generated content here.

## Regenerate

The backend is four FastAPI services; `backend/scripts/dump_openapi.py`
dumps each one in an isolated subprocess and merges them deterministically
(it needs no env vars or running stack — placeholders are set internally):

```bash
# 1. Regenerate the merged OpenAPI spec (from the backend repo root)
cd backend
.venv/bin/python scripts/dump_openapi.py openapi.json

# 2. Regenerate + format the TS types from it (from the frontend repo root)
cd ../frontend
npm run gen:types

# 3. Commit backend/openapi.json and
#    frontend/packages/api-client/src/types/openapi.d.ts
```

The script is deterministic — rerunning it against unchanged services
produces a byte-identical file, so `git diff` after step 2 shows exactly
what your backend change did to the API surface. It fails loudly if two
services declare the same route, or the same schema name with different
shapes (rename one class; identical re-declarations are tolerated).
