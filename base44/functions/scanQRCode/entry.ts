import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);

    const rawQrData = body?.qr_data || body?.qrData || body?.data;

    if (!rawQrData) {
      return Response.json(
        { error: 'QR data is required', receivedBody: body },
        { status: 400 }
      );
    }

    const qr_data = String(rawQrData).trim();

    const safe = (value) => String(value || '').trim();
    const safeLower = (value) => safe(value).toLocaleLowerCase('tr-TR');

    const normalizePhone = (value) => safe(value).replace(/[^\d+]/g, '');
    const samePhone = (a, b) => normalizePhone(a) === normalizePhone(b);

    const isPhone = (value) => {
      const normalized = normalizePhone(value);
      return /^(\+90|90|0)?5\d{9}$/.test(normalized);
    };

    const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(safe(value));
    const isTime = (value) => /^\d{1,2}:\d{2}$/.test(safe(value));

    const parts = qr_data.includes('|')
      ? qr_data.split('|').map(safe).filter(Boolean)
      : qr_data.split(':').map(safe).filter(Boolean);

    const type = safeLower(parts[0]);

    console.log('[scanQRCode] body:', body);
    console.log('[scanQRCode] qr_data:', qr_data);
    console.log('[scanQRCode] parts:', parts);
    console.log('[scanQRCode] type:', type);

    if (!['trial', 'daily', 'member'].includes(type)) {
      return Response.json(
        {
          error: 'Invalid QR type',
          receivedType: parts[0] || null,
          qr_data,
        },
        { status: 400 }
      );
    }

    let name = '';
    let phone = '';
    let date = '';
    let time = '';

    const payload = parts.slice(1);

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

        const nameParts = payload.slice(0, phoneIndex);
        name = nameParts.join(' ').trim();

        date = dateIndex >= 0 ? payload[dateIndex] : '';
        time = timeIndex >= 0 ? payload[timeIndex] : '';
      } else {
        // Fallback for old format: trial:name:phone:date:time
        name = payload[0] || '';
        phone = payload[1] || '';
        date = payload.find(isDate) || payload[2] || '';
        time = payload.find(isTime) || '';
      }
    }

    if (!name) {
      return Response.json(
        { error: 'Name is required in QR data', qr_data, parts },
        { status: 400 }
      );
    }

    const result = {
      type,
      name,
      phone,
      date,
      time,
      found: false,
    };

    if (type === 'trial') {
      const apps = await base44.asServiceRole.entities.TrialApplication.list();

      const app = apps.find((a) => {
        const fullName = `${safe(a.first_name)} ${safe(a.last_name)}`.trim();

        return (
          safeLower(fullName) === safeLower(name) &&
          (!phone || samePhone(a.phone, phone)) &&
          (!date || safe(a.trial_class_date) === safe(date)) &&
          (!time || safe(a.trial_class_time) === safe(time))
        );
      });

      if (app) {
        result.found = true;
        result.person = {
          id: app.id,
          fullName: `${safe(app.first_name)} ${safe(app.last_name)}`.trim(),
          phone: app.phone || '',
          type: 'trial',
          status: app.status || '',
          trialClass: app.trial_class_title || '',
          trialDate: app.trial_class_date || '',
          trialTime: app.trial_class_time || '',
          attended: Boolean(app.attended),
        };
      } else {
        result.message = 'Deneme dersi kaydı bulunamadı';
      }
    }

    if (type === 'daily') {
      const visits = await base44.asServiceRole.entities.DailyVisit.list();

      const visit = visits.find((v) => {
        return (
          safeLower(v.full_name) === safeLower(name) &&
          (!phone || samePhone(v.phone, phone)) &&
          (!date || safe(v.visit_date) === safe(date)) &&
          (!time || safe(v.class_time) === safe(time))
        );
      });

      if (visit) {
        result.found = true;
        result.person = {
          id: visit.id,
          fullName: visit.full_name || '',
          phone: visit.phone || '',
          type: 'daily',
          visitDate: visit.visit_date || '',
          class: visit.class_title || '',
          classTime: visit.class_time || '',
          attended: Boolean(visit.attended),
        };
      } else {
        result.message = 'Günlük giriş kaydı bulunamadı';
      }
    }

    if (type === 'member') {
      const memberships = await base44.asServiceRole.entities.Membership.list();

      const member = memberships.find((m) => {
        return safeLower(m.username) === safeLower(name);
      });

      if (member) {
        let className = '';

        if (date && time) {
          try {
            const classes = await base44.asServiceRole.entities.ClassSchedule.list();

            const matchedClass = classes.find((c) => {
              return safe(c.date) === safe(date) && safe(c.start_time) === safe(time);
            });

            if (matchedClass) {
              className = matchedClass.title || '';
            }
          } catch (classError) {
            console.log('[scanQRCode] Class lookup error:', classError.message);
          }
        }

        result.found = true;
        result.classDate = date;
        result.classTime = time;
        result.person = {
          id: member.id,
          fullName: member.user_name || '',
          username: member.username || '',
          phone: member.phone || '',
          type: 'member',
          status: member.status || '',
          planName: member.plan_name || '',
          endDate: member.end_date || '',
          className,
          attended: Boolean(member.attended),
        };
      } else {
        result.message = 'Üyelik kaydı bulunamadı';
      }
    }

    return Response.json(result);
  } catch (error) {
    console.error('[scanQRCode] error:', error);

    return Response.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
});
