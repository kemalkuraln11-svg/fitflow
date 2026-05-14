import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => null);

    if (!body || !body.qr_data) {
      return Response.json({ error: 'QR data is required' }, { status: 400 });
    }

    const qr_data = String(body.qr_data || '').trim();

    const safe = (value) => String(value || '').trim();
    const safeLower = (value) => safe(value).toLowerCase();

    const parts = qr_data.split('|').map((p) => safe(p));
    const type = safeLower(parts[0]);

    let name = '';
    let phone = '';
    let date = '';
    let time = '';

    const today = new Date().toISOString().split('T')[0];

    if (type === 'member') {
      // Format: MEMBER|username|date|time
      name = parts[1] || '';
      date = parts[2] || today;
      time = parts[3] || '';
      phone = '';
    } else if (type === 'trial' || type === 'daily') {
      // Format: TRIAL/DAILY|name|phone|date|time
      name = parts[1] || '';
      phone = parts[2] || '';
      date = parts[3] || today;
      time = parts[4] || '';
    } else {
      return Response.json(
        {
          error: 'Invalid QR type',
          receivedType: parts[0] || null,
          qr_data,
        },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json(
        {
          error: 'Name is required in QR data',
          qr_data,
        },
        { status: 400 }
      );
    }

    const nameParts = name.split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

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
        return (
          safeLower(a.first_name) === safeLower(firstName) &&
          safeLower(a.last_name) === safeLower(lastName) &&
          safe(a.phone) === safe(phone) &&
          safe(a.trial_class_date) === safe(date) &&
          (time === '' || safe(a.trial_class_time) === safe(time))
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

    else if (type === 'daily') {
      const visits = await base44.asServiceRole.entities.DailyVisit.list();

      const visit = visits.find((v) => {
        return (
          safeLower(v.full_name) === safeLower(name) &&
          safe(v.phone) === safe(phone) &&
          safe(v.visit_date) === safe(date) &&
          (time === '' || safe(v.class_time) === safe(time))
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

    else if (type === 'member') {
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
      {
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
});