import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';
import { inquirySchema } from '@/lib/schemas';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Validate request body
    const result = inquirySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      );
    }

    const { schoolName, contactPerson, email, phone, service, message } = result.data;

    // 1. Send notification to admin (EduMax Solutions)
    const adminEmailHtml = `
      <h2>New Inquiry Received</h2>
      <p><strong>Service Requested:</strong> ${service}</p>
      <p><strong>School Name:</strong> ${schoolName}</p>
      <p><strong>Contact Person:</strong> ${contactPerson}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `;
    
    await sendEmail(
      'info@edumaxsolutions.com.ng',
      `New Inquiry from ${schoolName} - ${service}`,
      adminEmailHtml
    );

    // 2. Send automated reply to user
    const userEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E11D48;">Thank you for contacting EduMax Solutions!</h2>
        <p>Dear ${contactPerson},</p>
        <p>We have received your inquiry regarding <strong>${schoolName}</strong>.</p>
        <p>Our team is reviewing your message and will get back to you shortly to discuss how we can help transform your school management.</p>
        <br/>
        <p>Best regards,</p>
        <p><strong>The EduMax Solutions Team</strong></p>
        <p><a href="https://edumaxsolutions.com.ng" style="color: #E11D48;">edumaxsolutions.com.ng</a></p>
      </div>
    `;

    await sendEmail(
      email,
      'We received your inquiry - EduMax Solutions',
      userEmailHtml
    );

    return NextResponse.json({ success: true, message: 'Inquiry sent successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
