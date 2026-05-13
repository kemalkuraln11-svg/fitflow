import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    
    try {
      user = await base44.auth.me();
    } catch (e) {
      // Continue as service role if auth fails
    }

    if (!user) {
      // Use service role for scanning if user auth fails
    } else if (user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { qr_data } = await req.json();

    if (!qr_data) {
      return Response.json({ error: 'QR data is required' }, { status: 400 });
    }

    // Parse QR data - format differs by type
    const parts = qr_data.split('|');
    const type = parts[0].toLowerCase();
    
    let name, phone, date, time;
    
    if (type === 'member') {
      // Format: MEMBER|username|date|time
      name = parts[1];
      date = parts[2] || new Date().toISOString().split('T')[0];
      time = parts[3] || '';
      phone = '';
    } else {
      // Format: TRIAL/DAILY|name|phone|date|time
      name = parts[1];
      phone = parts[2];
      date = parts[3] || new Date().toISOString().split('T')[0];
      time = parts[4] || '';
    }

    // Normalize name
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    let result = { type, name, phone, date, found: false };

    if (type === 'trial') {
      // Search in TrialApplication
      const apps = await base44.asServiceRole.entities.TrialApplication.list();
      const app = apps.find(
        a => a.first_name.toLowerCase() === firstName.toLowerCase() &&
             a.last_name.toLowerCase() === lastName.toLowerCase() &&
             a.phone === phone &&
             a.trial_class_date === date &&
             (time === '' || a.trial_class_time === time)
      );

      if (app) {
        result.found = true;
        result.person = {
          id: app.id,
          fullName: `${app.first_name} ${app.last_name}`,
          phone: app.phone,
          type: 'trial',
          status: app.status,
          trialClass: app.trial_class_title,
          trialDate: app.trial_class_date,
          trialTime: app.trial_class_time,
          attended: app.attended,
        };
      } else {
        result.message = 'Deneme dersi kaydı bulunamadı';
      }
    } else if (type === 'daily') {
      // Search in DailyVisit
      const visits = await base44.asServiceRole.entities.DailyVisit.list();
      const visit = visits.find(
        v => v.full_name.toLowerCase() === name.toLowerCase() &&
             v.phone === phone &&
             v.visit_date === date &&
             (time === '' || v.class_time === time)
      );

      if (visit) {
        result.found = true;
        result.person = {
          id: visit.id,
          fullName: visit.full_name,
          phone: visit.phone,
          type: 'daily',
          visitDate: visit.visit_date,
          class: visit.class_title,
          classTime: visit.class_time,
          attended: visit.attended,
        };
      } else {
        result.message = 'Günlük giriş kaydı bulunamadı';
      }
    } else if (type === 'member') {
      // Search in Membership
      // QR format: MEMBER|username|date|time
      const memberships = await base44.asServiceRole.entities.Membership.list();
      const member = memberships.find(m => m.username.toLowerCase() === name.toLowerCase());

      if (member) {
        result.found = true;
        result.classDate = date;
        result.classTime = time;
        
        // Find class for this date/time if available
        let className = '';
        if (date && time) {
          try {
            const classes = await base44.asServiceRole.entities.ClassSchedule.list();
            const matchedClass = classes.find(c => c.date === date && c.start_time === time);
            if (matchedClass) {
              className = matchedClass.title;
            }
          } catch (e) {
            // Ignore class lookup errors
            console.log('[scanQRCode] Class lookup error:', e.message);
          }
        }
        
        result.person = {
          id: member.id,
          fullName: member.user_name,
          username: member.username,
          phone: member.phone,
          type: 'member',
          status: member.status,
          planName: member.plan_name,
          endDate: member.end_date,
          className: className,
          attended: member.attended,
        };
      } else {
        result.message = 'Üyelik kaydı bulunamadı';
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});