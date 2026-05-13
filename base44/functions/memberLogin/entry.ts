import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    const results = await base44.asServiceRole.entities.Membership.filter({
      username: username.toLowerCase().trim(),
      password: password,
    });

    if (!results || results.length === 0) {
      return Response.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
    }

    const m = results[0];

    if (m.status === 'suspended') {
      return Response.json({ error: 'Üyeliğiniz askıya alınmıştır. Lütfen iletişime geçin.' }, { status: 403 });
    }
    if (m.status === 'frozen') {
      return Response.json({ error: 'Üyeliğiniz dondurulmuştur. Lütfen iletişime geçin.' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(m.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < today) {
      if (m.status === 'active') {
        await base44.asServiceRole.entities.Membership.update(m.id, { status: 'expired' });
        m.status = 'expired';
      }
      return Response.json({ error: 'Üyeliğinizin süresi dolmuştur. Lütfen üyeliğinizi yenileyin.' }, { status: 403 });
    }

    if (m.status === 'expired') {
      return Response.json({ error: 'Üyeliğinizin süresi dolmuştur. Lütfen üyeliğinizi yenileyin.' }, { status: 403 });
    }

    return Response.json({
      id: m.id,
      user_name: m.user_name,
      username: m.username,
      user_email: m.user_email,
      gender: m.gender || 'male',
      plan_name: m.plan_name,
      start_date: m.start_date,
      end_date: m.end_date,
      status: m.status,
      frozen_at: m.frozen_at || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});