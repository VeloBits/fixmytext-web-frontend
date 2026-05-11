# Generated API types

`openapi.d.ts` in this directory is **generated** from the FastAPI OpenAPI
schema. Do not edit it by hand.

## Regenerate

From the repo root, with the backend dev stack running (or any Python env that
can import `backend/main.py`):

```bash
# 1. Dump the live OpenAPI schema
cd backend
SECRET_KEY=dev DATABASE_URL=postgresql+asyncpg://x:x@localhost/x \
  python scripts/dump_openapi.py openapi.json

# 2. Regenerate the TS types from it
cd ../frontend
npm run gen:types

# 3. Commit both files
git add backend/openapi.json frontend/src/types/openapi.d.ts
git commit -m "chore: regen API types"
```

CI runs the same two commands and `git diff --exit-code`s the result — any
drift between the backend schema and the committed types fails the build.
See [.github/workflows/ci.yml](../../../.github/workflows/ci.yml) (`contract-types` job).
