import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const members = await base44.asServiceRole.entities.Membership.list("-created_date", 500);
    return Response.json(members);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});