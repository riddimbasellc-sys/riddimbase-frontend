import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing RESEND_API_KEY" }),
      { status: 500 }
    );
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { html, recipients, attachments } = await req.json();

  const results = [];

  for (const r of recipients) {
    const payload: any = {
      from: "RiddimBase <support@riddimbase.app>",
      to: r.email,
      subject: r.subject,
      html: html ? r.body : undefined,
      text: html ? undefined : r.body,
    };

    if (attachments?.length) {
      payload.attachments = attachments.map((a) => ({
        filename: a.name,
        content: a.base64,
      }));
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    results.push({ email: r.email, data });
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
