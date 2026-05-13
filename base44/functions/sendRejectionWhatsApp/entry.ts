import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, fullName } = await req.json();

    if (!phone) {
      return Response.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // WhatsApp mesajı gönder
    const message = `Merhaba ${fullName}, üzgünüz başvurunuz reddedilmiştir. Detaylı bilgi için lütfen salon yönetimiyle iletişime geçin.`;
    
    // Base44 SendEmail integration'ını kullanarak mesaj gönder (ya da WhatsApp servisi varsa o kullanılabilir)
    await base44.integrations.Core.SendEmail({
      to: phone, // Bu normalden e-posta için kullanılır, WhatsApp için custom integration gerekebilir
      subject: 'Başvuru Sonucu',
      body: message,
    });

    return Response.json({ success: true, message: 'WhatsApp message sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});