import { Loader2 } from "lucide-react";

export function PageLoader({ error }: { error?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      {error ? <p>{error}</p> : <Loader2 className="h-6 w-6 animate-spin" />}
    </div>
  );
}
