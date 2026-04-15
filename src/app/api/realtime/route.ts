import { auth } from "@/auth";
import { registerRealtimeClient } from "@/lib/realtime";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const id = Math.random().toString(36).slice(2);

      const sendRaw = (line: string) => controller.enqueue(encoder.encode(line));
      const send = (payload: unknown) => {
        sendRaw(`data: ${JSON.stringify(payload)}\n\n`);
      };

      // Initial hello + retry
      sendRaw("retry: 3000\n\n");
      send({ event: "connected", ts: Date.now() });

      const unsubscribe = registerRealtimeClient({
        id,
        send,
        close: () => {
          try {
            controller.close();
          } catch {
            // ignore
          }
        },
      });

      const keepAlive = setInterval(() => {
        try {
          sendRaw(":keep-alive\n\n");
        } catch {
          // ignore
        }
      }, 25000);

      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      // Close on client disconnect
      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
