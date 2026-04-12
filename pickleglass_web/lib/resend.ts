import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Claire <noreply@clairia.app>'
const APP_URL = 'https://app.clairia.app'
const LOGO_URL = 'https://app.clairia.app/claire-logo-email.png'

// ── Layout ────────────────────────────────────────────────────────────────────
// Structure: outer gray wrapper → rounded card → [gradient hero] + [white body] → footer

const layout = (hero: string, body: string, preheader = '') => `<!DOCTYPE html>
<html lang="fr" dir="auto" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <title>Claire</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"/>
  <link rel="stylesheet" media="screen" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"/>
  <style>
    body { margin:0; padding:0 !important; background:#e8edf5; }
    img { border:0; display:block; }
    a { color:inherit; }
    * { -webkit-font-smoothing:antialiased; mso-hyphenate:none; }
  </style>
</head>
<body style="margin:0;padding:0;background:#e8edf5;">

  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#e8edf5;">${preheader}${'&zwnj;&nbsp;'.repeat(90)}</div>` : ''}

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e8edf5;padding:40px 16px 52px;">
  <tr><td align="center">

    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

      <!-- ═══ CARD ═══ -->
      <tr>
        <td style="border-radius:24px;overflow:hidden;border:1px solid rgba(180,200,240,0.5);box-shadow:0 8px 48px rgba(21,98,223,0.12),0 1px 3px rgba(0,0,0,0.06);">

          <!-- ── HERO gradient block ── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="
              background:
                radial-gradient(ellipse at 18% 22%, rgba(255,255,255,0.95) 0%, transparent 48%),
                radial-gradient(ellipse at 88% 10%, #9aaaf5 0%, transparent 44%),
                radial-gradient(ellipse at 52% 62%, rgba(245,246,255,0.80) 0%, transparent 46%),
                radial-gradient(ellipse at 92% 88%, #a8aef5 0%, transparent 40%),
                radial-gradient(ellipse at 10% 80%, rgba(220,228,255,0.7) 0%, transparent 42%),
                #b8c8f5;
              padding: 56px 40px 60px;
              text-align: center;
            ">
              ${hero}
            </td>
          </tr>
          </table>

          <!-- ── WHITE BODY ── -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
          <tr><td style="padding:36px 44px 44px;">
            ${body}
          </td></tr>
          </table>

        </td>
      </tr>
      <!-- ═══ END CARD ═══ -->

      <!-- Footer -->
      <tr>
        <td style="padding:24px 4px 0;text-align:center;">
          <p style="margin:0 0 4px;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:12px;font-weight:300;color:#9090a8;line-height:1.6;">
            © ${new Date().getFullYear()} Clairia &nbsp;·&nbsp;
            <a href="${APP_URL}" style="color:#9090a8;text-decoration:underline;">app.clairia.app</a>
          </p>
          <p style="margin:0;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:11px;font-weight:300;color:#b0b0c4;">
            Vous recevez cet email car vous avez un compte Claire.
          </p>
        </td>
      </tr>

    </table>

  </td></tr>
  </table>

</body>
</html>`

// ── Hero block ────────────────────────────────────────────────────────────────

const hero = (title: string, subtitle: string, ctaLabel: string, ctaUrl: string) => `
  <!-- Logo circle -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
    <tr>
      <td align="center" style="padding:0;">
        <div style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.22);border:1.5px solid rgba(255,255,255,0.45);display:inline-block;line-height:0;">
          <img src="${LOGO_URL}" alt="Claire" width="64" height="64"
            style="display:block;width:64px;height:64px;border-radius:50%;object-fit:contain;padding:10px;box-sizing:border-box;"/>
        </div>
      </td>
    </tr>
  </table>

  <!-- Wordmark -->
  <p style="margin:0 0 28px;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:13px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(255,255,255,0.60);">Claire</p>

  <!-- Title -->
  <h1 style="margin:0 0 14px;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:36px;font-weight:700;letter-spacing:-1px;line-height:1.15;color:#ffffff;">${title}</h1>

  <!-- Subtitle -->
  <p style="margin:0 0 36px;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:16px;font-weight:300;line-height:1.6;color:rgba(255,255,255,0.72);max-width:400px;display:inline-block;">${subtitle}</p>

  <!-- Pill CTA — .btn-primary: #000, full pill, weight 600 -->
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="border-radius:9999px;background:#000000;border:1px solid rgba(0,0,0,0.9);">
        <a href="${ctaUrl}" style="display:inline-block;padding:13px 30px;font-family:'Plus Jakarta Sans',Helvetica,sans-serif;font-size:15px;font-weight:600;color:#ffffff;white-space:nowrap;letter-spacing:-0.1px;text-decoration:none;">${ctaLabel}</a>
      </td>
    </tr>
  </table>`

// ── Body helpers ──────────────────────────────────────────────────────────────

const F = `'Plus Jakarta Sans',Helvetica,sans-serif`

const p = (text: string, muted = false) =>
  `<p style="margin:0 0 16px;font-family:${F};font-size:15px;font-weight:300;line-height:1.75;color:${muted ? '#9898b0' : '#2d2d3a'};">${text}</p>`

const strong = (text: string) =>
  `<strong style="font-weight:600;color:#111827;">${text}</strong>`

const infoBox = (rows: [string, string][]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7fc;border-radius:14px;margin:22px 0 8px;overflow:hidden;">
    ${rows.map(([label, value], i) => `
    <tr>
      <td style="padding:13px 20px;font-family:${F};font-size:13px;font-weight:300;color:#9898b0;${i < rows.length - 1 ? 'border-bottom:1px solid #ebebf3;' : ''}width:150px;">${label}</td>
      <td style="padding:13px 20px;font-family:${F};font-size:13px;font-weight:500;color:#111827;${i < rows.length - 1 ? 'border-bottom:1px solid #ebebf3;' : ''}">${value}</td>
    </tr>`).join('')}
  </table>`

const divider = () =>
  `<hr style="border:none;border-top:1px solid #ebebf3;margin:28px 0;"/>`

// .btn-apple-premium style: radial gradient dark, box-shadow, radius 8px, min-height 48px
const btn = (text: string, url: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
    <tr>
      <td style="border-radius:8px;background:radial-gradient(85.44% 85.44% at 50% 14.56%,#3a3a3c 0%,#1c1c1e 100%);box-shadow:0px 8px 24px rgba(0,0,0,0.28);">
        <a href="${url}" style="display:inline-block;padding:14px 26px;min-height:48px;font-family:${F};color:#ffffff;font-size:15px;font-weight:600;letter-spacing:-0.1px;text-decoration:none;line-height:20px;box-sizing:border-box;">${text}</a>
      </td>
    </tr>
  </table>`

// ── Templates ─────────────────────────────────────────────────────────────────

const templates = {
  welcome: (firstName: string) => ({
    subject: `Bienvenue sur Claire${firstName ? ', ' + firstName : ''} 👋`,
    html: layout(
      hero(
        'Bienvenue sur Claire',
        'Votre assistant IA en temps réel est prêt.',
        'Ouvrir Claire',
        APP_URL
      ),
      `
        ${p(`Bonjour ${firstName || ''} ! Votre compte est créé. Téléchargez l'application, connectez-vous et laissez Claire vous assister — transcription audio, réponses IA contextuelles, analyse d'écran en temps réel.`)}
        ${btn('Télécharger l\'application', APP_URL)}
        ${divider()}
        ${p(`${strong('Ce que vous pouvez faire dès maintenant')}`)}
        ${p('· Transcription audio instantanée<br/>· Réponses IA contextuelles<br/>· Historique de vos sessions')}
        ${p('Des questions ? Répondez directement à cet email.', true)}
      `,
      `Votre compte Claire est prêt. Découvrez l'assistant IA en temps réel.`
    ),
  }),

  subscriptionConfirmed: (firstName: string, plan: string, renewalDate: string) => ({
    subject: `Abonnement Claire ${plan} confirmé ✅`,
    html: layout(
      hero(
        'Abonnement confirmé',
        `Merci ${firstName || ''} — votre accès premium est actif.`,
        'Accéder à Claire',
        APP_URL
      ),
      `
        ${p(`Votre abonnement ${strong(`Claire ${plan}`)} est maintenant actif. Vous avez accès à toutes les fonctionnalités premium sans restriction.`)}
        ${infoBox([
          ['Plan', `Claire ${plan}`],
          ['Renouvellement', renewalDate],
          ['Facturation', 'Automatique via Stripe'],
        ])}
        ${btn('Gérer mon abonnement', `${APP_URL}/settings/billing`)}
        ${p('Vous pouvez annuler à tout moment depuis les paramètres, sans engagement.', true)}
      `,
      `Votre abonnement Claire ${plan} est actif.`
    ),
  }),

  paymentFailed: (firstName: string, nextRetry?: string) => ({
    subject: 'Action requise — problème de paiement',
    html: layout(
      hero(
        'Paiement non abouti',
        'Une action est nécessaire pour maintenir votre accès.',
        'Mettre à jour le paiement',
        `${APP_URL}/settings/billing`
      ),
      `
        ${p(`Bonjour ${firstName || ''}, nous n'avons pas pu débiter votre carte pour le renouvellement de votre abonnement Claire.`)}
        ${nextRetry
          ? p(`Nous réessaierons automatiquement le ${strong(nextRetry)}. Mettez à jour votre moyen de paiement pour éviter toute interruption.`)
          : p(`Veuillez mettre à jour votre moyen de paiement pour éviter l'interruption de votre accès.`)
        }
        ${btn('Mettre à jour le paiement', `${APP_URL}/settings/billing`)}
        ${divider()}
        ${p('Si le problème persiste, contactez votre banque ou répondez à cet email.', true)}
      `,
      `Une mise à jour de votre paiement est nécessaire.`
    ),
  }),

  subscriptionCancelled: (firstName: string, endDate: string) => ({
    subject: 'Votre abonnement Claire a été annulé',
    html: layout(
      hero(
        'Abonnement annulé',
        'Merci de nous avoir fait confiance.',
        'Me réabonner',
        `${APP_URL}/settings/billing`
      ),
      `
        ${p(`Bonjour ${firstName || ''}, votre abonnement Claire a bien été annulé. Vos données sont conservées.`)}
        ${infoBox([
          ['Accès premium jusqu\'au', endDate],
          ['Après cette date', 'Plan gratuit'],
          ['Vos données', 'Conservées'],
        ])}
        ${p('Vous pouvez vous réabonner à tout moment depuis les paramètres.')}
        ${btn('Me réabonner', `${APP_URL}/settings/billing`)}
        ${p('Une question sur votre annulation ? Répondez à cet email.', true)}
      `,
      `Votre accès reste actif jusqu'au ${endDate}.`
    ),
  }),

  refundConfirmed: (firstName: string, amount: string) => ({
    subject: `Remboursement de ${amount} confirmé`,
    html: layout(
      hero(
        'Remboursement traité',
        `${amount} seront crédités sur votre compte bancaire.`,
        'Retour à Claire',
        APP_URL
      ),
      `
        ${p(`Bonjour ${firstName || ''}, votre remboursement a bien été initié.`)}
        ${infoBox([
          ['Montant', amount],
          ['Délai estimé', '5 à 10 jours ouvrés'],
          ['Votre plan', 'Gratuit'],
        ])}
        ${p('Le montant apparaîtra sur votre relevé selon les délais de votre banque.')}
        ${divider()}
        ${p('Nous espérons vous revoir prochainement sur Claire.', true)}
      `,
      `Votre remboursement de ${amount} a été traité.`
    ),
  }),
}

// ── Send helper ───────────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  template: keyof typeof templates,
  ...args: any[]
) {
  const { subject, html } = (templates[template] as (...a: any[]) => { subject: string; html: string })(...args)
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error(`[resend] Failed to send ${template} to ${to}:`, err)
  }
}

