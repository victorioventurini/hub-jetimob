import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCultureMessage } from "@/hooks/useCultureMessage";
import { Sparkles } from "lucide-react";

export function CultureCard() {
  const { message, isLoading, error } = useCultureMessage();

  // Don't render if there's an error and no message
  if (error && !message) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-sidebar-accent">
      {/* Subtle decorative element */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <div className="absolute inset-0 bg-accent rounded-full blur-3xl transform translate-x-8 -translate-y-8" />
      </div>
      
      <CardContent className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            Cultura Jet
          </span>
        </div>

        {/* Message */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full bg-primary-foreground/10" />
            <Skeleton className="h-5 w-3/4 bg-primary-foreground/10" />
          </div>
        ) : (
          <p className="text-lg font-medium leading-relaxed text-primary-foreground">
            {message}
          </p>
        )}

        {/* Signature */}
        <div className="mt-4 text-right">
          <span className="text-sm italic text-primary-foreground/60">
            — Vic
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
