import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
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