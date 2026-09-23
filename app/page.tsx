// app/page.tsx
import ChatInterface from "@/components/ChatInterface";

// Server Component shell; chat itself is a Client Component.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Refund Support Chat + Voice</h1>
      <p className="text-sm text-zinc-600">
        Chat by typing, or click Mic and speak (Chrome/Edge). Share your customer ID and email to start.
      </p>
      <ChatInterface />
    </main>
  );
}
