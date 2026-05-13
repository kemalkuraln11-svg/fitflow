import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, classId, userEmail, userName, reservationId } = await req.json();

    if (action === 'create') {
      // Conflict check
      const allMyReservations = await base44.asServiceRole.entities.Reservation.filter({
        user_email: userEmail,
        status: 'confirmed',
      });

      const cls = (await base44.asServiceRole.entities.ClassSchedule.filter({ id: classId }))[0];
      if (!cls) return Response.json({ error: 'Ders bulunamadı' }, { status: 404 });

      const existing = allMyReservations.filter(
        (r) => r.class_date === cls.date && r.class_time === cls.start_time && r.class_id !== classId
      );

      if (existing.length > 0) {
        const conflictClass = (await base44.asServiceRole.entities.ClassSchedule.filter({ id: existing[0].class_id }))[0] || {};
        return Response.json({
          conflict: true,
          title: existing[0].class_title,
          date: existing[0].class_date,
          time: existing[0].class_time,
          instructor: conflictClass.instructor || null,
        });
      }

      await base44.asServiceRole.entities.Reservation.create({
        class_id: classId,
        class_title: cls.title,
        class_date: cls.date,
        class_time: cls.start_time,
        user_email: userEmail,
        user_name: userName,
        status: 'confirmed',
      });

      await base44.asServiceRole.entities.ClassSchedule.update(classId, {
        current_count: (cls.current_count || 0) + 1,
      });

      return Response.json({ success: true });

    } else if (action === 'cancel') {
      const cls = (await base44.asServiceRole.entities.ClassSchedule.filter({ id: classId }))[0];
      if (!cls) return Response.json({ error: 'Ders bulunamadı' }, { status: 404 });

      await base44.asServiceRole.entities.Reservation.update(reservationId, { status: 'cancelled' });

      await base44.asServiceRole.entities.ClassSchedule.update(classId, {
        current_count: Math.max(0, (cls.current_count || 0) - 1),
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});