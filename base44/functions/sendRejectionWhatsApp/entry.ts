import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, fullName } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Başvuru Sonucu',
      body: `Merhaba ${fullName},\n\nÜzgünüz başvurunuz reddedilmiştir. Detaylı bilgi için lütfen salon yönetimiyle iletişime geçin.`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});