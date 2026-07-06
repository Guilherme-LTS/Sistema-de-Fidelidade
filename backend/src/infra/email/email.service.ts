import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { invitationTemplate } from './templates/invitation.js';

export class EmailService {
  private static instance: EmailService;
  private resend: Resend;

  private constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendInvitation(email: string, token: string, tenantName: string, role: string) {
    const inviteLink = `${env.FRONTEND_URL}/convites/aceitar?token=${token}`;
    const htmlContent = invitationTemplate({ tenantName, inviteLink, role });

    try {
      const { data, error } = await this.resend.emails.send({
        from: 'Pontus <no-reply@usepontus.com.br>',
        to: email,
        subject: `Convite para participar da equipe: ${tenantName}`,
        html: htmlContent,
      });

      if (error) {
        console.error('Error sending email via Resend:', error);
        throw new Error('Falha ao enviar e-mail de convite');
      }

      return data;
    } catch (error) {
      console.error('Error in sendInvitation:', error);
      throw error;
    }
  }
}
