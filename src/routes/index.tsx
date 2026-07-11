import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/wh/AuthScreen";
import { MainApp } from "@/components/wh/MainApp";
import { useWeddingStore } from "@/lib/wh-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const store = useWeddingStore();

  if (store.loading && !store.session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="mt-3 text-sm text-muted-foreground">Loading your wedding hub…</p>
        </div>
      </div>
    );
  }

  if (!store.session) {
    return <AuthScreen onSession={store.setSession} />;
  }

  return <MainApp store={store} />;
}
