export function invitationTemplate({
  tenantName,
  inviteLink,
  role,
}: {
  tenantName: string;
  inviteLink: string;
  role: string;
}) {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f4f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #18181b;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
      color: #3f3f46;
      line-height: 1.6;
    }
    .content h2 {
      color: #18181b;
      font-size: 20px;
      margin-top: 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      background-color: #2563eb;
      color: #ffffff;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      display: inline-block;
    }
    .footer {
      background-color: #fafafa;
      padding: 24px;
      text-align: center;
      color: #a1a1aa;
      font-size: 14px;
      border-top: 1px solid #e4e4e7;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Pontus</h1>
    </div>
    <div class="content">
      <h2>Você foi convidado!</h2>
      <p>Olá,</p>
      <p>Você foi convidado para participar da equipe do restaurante <strong>${tenantName}</strong> na plataforma Pontus.</p>
      <p>O seu cargo será: <strong>${role === 'admin' ? 'Administrador' : role === 'operador' ? 'Operador' : 'Novato'}</strong>.</p>
      
      <div class="button-container">
        <a href="${inviteLink}" class="button" style="color: #ffffff;">Aceitar Convite</a>
      </div>
      
      <p>Se você não estava esperando este convite, pode ignorar este e-mail tranquilamente.</p>
      <p>Este convite é válido por 7 dias.</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Pontus Fidelidade. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
  `;
}
