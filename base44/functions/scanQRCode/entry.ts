import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const rawQrData = body.qr_data || body.qrData || body.data;

    if (!rawQrData) {
      return Response.json({ found: false, message: 'QR data is required' }, { status: 400 });
    }

    const qr_data = String(rawQrData).trim();

    const safe = (value) => String(value || '').trim();
    const lower = (value) => safe(value).toLowerCase();
    const normalizePhone = (value) => safe(value).replace(/[^\d+]/g, '');

    const samePhone = (a, b) => {
      const phoneA = normalizePhone(a).replace(/^\+?90/, '').replace(/^0/, '');
      const phoneB = normalizePhone(b).replace(/^\+?90/, '').replace(/^0/, '');
      return phoneA && phoneB && phoneA === phoneB;
    };

    const isPhone = (value) => {
      const phone = normalizePhone(value);
      return /^(\+90|90|0)?5\d{9}$/.test(phone);
    };

    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(safe(value));
    const isTime = (value) => /^\d{1,2}:\d{2}$/.test(safe(value));

    const parts = qr_data.includes('|')
      ? qr_data.split('|').map(safe).filter(Boolean)
      : qr_data.split(':').map(safe).filter(Boolean);

    const type = lower(parts[0]);

    console.log('[scanQRCode] qr_data:', qr_data);
    console.log('[scanQRCode] parts:', parts);

    if (!['trial', 'daily', 'member'].includes(type)) {
      return Response.json({
        found: false,
        message: 'Geçersiz QR tipi',
        qr_data,
        parts,
      });
    }

    const payload = parts.slice(1);

    let name = '';
    let phone = '';
    let date = '';
    let time = '';

    if (type === 'member') {
      name = payload[0] || '';
      date = payload.find(isDate) || '';
      time = payload.find(isTime) || '';
    } else {
      const phoneIndex = payload.findIndex(isPhone);
      const dateIndex = payload.findIndex(isDate);
      const timeIndex = payload.findIndex(isTime);

      if (phoneIndex >= 0) {
        phone = payload[phoneIndex];
        name = payload.slice(0, phoneIndex).join(' ').trim();
      } else {
        name = payload.slice(0, 2).join(' ').trim() || payload[0] || '';
        phone = payload[2] || '';
      }

      date = dateIndex >= 0 ? payload[dateIndex] : '';
      time = timeIndex >= 0 ? payload[timeIndex] : '';
    }

    const result = {
      found: false,
      type,
      name,
      phone,
      date,
      time,
      qr_data,
    };

    if (!name) {
      return Response.json({
        ...result,
        message: 'QR içinde isim bulunamadı',
      });
    }

    if (type === 'trial') {
      const apps = await base44.asServiceRole.entities.TrialApplication.list();

      const app = apps.find((a) => {
        const fullName = `${safe(a.first_name)} ${safe(a.last_name)}`.trim();

        return (
          lower(fullName) === lower(name) &&
          (!phone || samePhone(a.phone, phone)) &&
          (!date || safe(a.trial_class_date) === date) &&
          (!time || safe(a.trial_class_time) === time)
        );
      });

      if (!app) {
        return Response.json({
          ...result,
          message: 'Deneme dersi kaydı bulunamadı',
        });
      }

      return Response.json({
        ...result,
        found: true,
        person: {
          id: app.id,
          fullName: `${safe(app.first_name)} ${safe(app.last_name)}`.trim(),
          phone: app.phone || '',
          type: 'trial',
          status: app.status || '',
          trialClass: app.trial_class_title || '',
          trialDate: app.trial_class_date || '',
          trialTime: app.trial_class_time || '',
          attended: Boolean(app.attended),
        },
      });
    }

    if (type === 'daily') {
      const visits = await base44.asServiceRole.entities.DailyVisit.list();

      const visit = visits.find((v) => {
        return (
          lower(v.full_name) === lower(name) &&
          (!phone || samePhone(v.phone, phone)) &&
          (!date || safe(v.visit_date) === date) &&
          (!time || safe(v.class_time) === time)
        );
      });

      if (!visit) {
        return Response.json({
          ...result,
          message: 'Günlük giriş kaydı bulunamadı',
        });
      }

      return Response.json({
        ...result,
        found: true,
        person: {
          id: visit.id,
          fullName: visit.full_name || '',
          phone: visit.phone || '',
          type: 'daily',
          visitDate: visit.visit_date || '',
          class: visit.class_title || '',
          classTime: visit.class_time || '',
          attended: Boolean(visit.attended),
        },
      });
    }

    if (type === 'member') {
      const memberships = await base44.asServiceRole.entities.Membership.list();

      const member = memberships.find((m) => lower(m.username) === lower(name));

      if (!member) {
        return Response.json({
          ...result,
          message: 'Üyelik kaydı bulunamadı',
        });
      }

      return Response.json({
        ...result,
        found: true,
        classDate: date,
        classTime: time,
        person: {
          id: member.id,
          fullName: member.user_name || '',
          username: member.username || '',
          phone: member.phone || '',
          type: 'member',
          status: member.status || '',
          planName: member.plan_name || '',
          endDate: member.end_date || '',
          attended: Boolean(member.attended),
        },
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error('[scanQRCode] error:', error);

    return Response.json(
      {
        found: false,
        message: error?.message || 'scanQRCode fonksiyonu çalışırken hata oluştu',
        stack: error?.stack || '',
      },
      { status: 500 }
    );
  }
});
