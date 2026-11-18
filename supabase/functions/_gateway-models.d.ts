// Model catalog for Cloud functions.
//
// The AI Gateway package ships an empty `GeneratedModelsBySurface` interface;
// the concrete model ids come from a generated file that only the app (src/)
// includes. Without an equivalent augmentation, `ResponsesRequest["model"]`
// resolves to `never` and every `generateResponse` / `streamResponse` call
// fails type checking in Deno.
//
// Keep this list in sync with the model ids actually used in
// supabase/functions/* — add an id here when a function starts calling it.

declare module 'npm:@lovable.dev/ai-gateway@0.1.11' {
  interface GeneratedModelsBySurface {
    responses: 'openai/gpt-6-astra';
  }
}

declare module 'npm:@lovable.dev/ai-gateway' {
  interface GeneratedModelsBySurface {
    responses: 'openai/gpt-6-astra';
  }
}

export {};
