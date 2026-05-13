import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { format, parseISO, isBefore, isAfter, addHours } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all approved trial applications
    const approvedApps = await base44.asServiceRole.entities.TrialApplication.filter({
      status: 'approved'
    });

    const now = new Date();
    let rejectedCount = 0;

    for (const app of approvedApps) {
      // Check if class date/time has passed and person didn't attend
      if (app.trial_class_date && app.trial_class_time && app.attended !== true) {
        const classDate = parseISO(app.trial_class_date);
        const [hours, minutes] = app.trial_class_time.split(':').map(Number);
        const classDateTime = new Date(classDate);
        classDateTime.setHours(hours, minutes, 0, 0);
        
        // Give 2 hours after class time to mark attendance
        const deadline = addHours(classDateTime, 2);

        if (isAfter(now, deadline)) {
          // Reject the application
          await base44.asServiceRole.entities.TrialApplication.update(app.id, {
            status: 'rejected',
            notes: 'Otomatik reddedildi - derse katılmadı'
          });
          rejectedCount++;
        }
      }
    }

    return Response.json({ 
      message: `${rejectedCount} başvuru otomatik olarak reddedildi`,
      rejectedCount 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});