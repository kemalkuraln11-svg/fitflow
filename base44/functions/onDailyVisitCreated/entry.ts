import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Verify this is called from an automation (internal Base44 call)
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const isAutomation = req.headers.get("x-base44-automation") === "true";

    if (!isAutomation && user?.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await req.json();

    const visit = payload.data;
    if (!visit?.class_id) {
      return Response.json({ ok: true, skipped: "no class_id" });
    }

    const classes = await base44.asServiceRole.entities.ClassSchedule.filter({ id: visit.class_id });
    const cls = classes[0];
    if (!cls) {
      return Response.json({ ok: true, skipped: "class not found" });
    }

    await base44.asServiceRole.entities.ClassSchedule.update(cls.id, {
      current_count: (cls.current_count || 0) + 1,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});