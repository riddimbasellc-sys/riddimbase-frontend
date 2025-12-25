// Minimal Deno + serve typings for Supabase Edge Functions
// This file is only for local TypeScript tooling (VS Code) and
// does not affect how Supabase runs the function.

// Deno global used in edge functions
declare const Deno: {
  env: {
    get(key: string): string | undefined
  }
}

// Remote std/http server module used by Supabase examples
declare module 'https://deno.land/std@0.177.0/http/server.ts' {
  export interface ServeHandler {
    (req: Request): Response | Promise<Response>
  }

  export function serve(handler: ServeHandler): void
}
