export default {
  async fetch(request:Request) {
    const url = new URL(request.url);
    const path = url.pathname.replace('/apps/proxy', '');

    if (path === '/testeddiscounts') {
      return new Response(
        JSON.stringify({ activeDiscounts: ["Black Friday", "Summer Sale"] }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (path === '/istested') {
      return new Response(
        JSON.stringify({ status: "tested OK" }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response("Not Found", { status: 404 });
  }
};
