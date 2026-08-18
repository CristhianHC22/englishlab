/* Extra emails: formal/informal tone for emailtone quiz */
window.ENLAB = window.ENLAB || {};

(ENLAB.emailSpeak = ENLAB.emailSpeak || []).push(
  {
    min: 3,
    tone: "informal",
    subject: "Need Friday off — PTO",
    from: "You",
    body: "Hey Sarah,\n\nQuick ask: can I take this Friday off? I have a family thing and I'm good on coverage — Jake said he can handle my tickets.\n\nThanks!\nAlex",
    say: "Hey Sarah. Quick ask. Can I take this Friday off? I have a family thing and I'm good on coverage. Jake said he can handle my tickets. Thanks, Alex.",
    reply: "Sure, Alex. Enjoy — just log it in the system when you get a chance.",
    es: "Pedir viernes libre. Jake cubre tickets.",
    qs: [
      { q: "¿Qué día pide libre?", a: "Friday", opts: ["Monday", "Friday", "next month"] },
      { q: "¿Quién cubre los tickets?", a: "Jake", opts: ["Sarah", "Jake", "HR"] },
      { q: "¿Tono del email?", a: "informal", opts: ["formal", "informal", "legal"] },
    ],
  },
  {
    min: 3,
    tone: "formal",
    subject: "Apology — delayed shipment #8842",
    from: "Logistics",
    body: "Dear Ms. Chen,\n\nWe sincerely apologize for the delay on order #8842. A carrier issue pushed delivery to Thursday, March 14. We have upgraded shipping at no cost and will send tracking tonight.\n\nPlease accept our apologies for the inconvenience.\n\nRegards,\nLogistics Team",
    say: "Dear Ms. Chen. We sincerely apologize for the delay on order eight eight four two. A carrier issue pushed delivery to Thursday, March fourteenth. We have upgraded shipping at no cost and will send tracking tonight. Please accept our apologies for the inconvenience. Regards, Logistics Team.",
    reply: "Thank you for the update. Please confirm tracking once it is available.",
    es: "Disculpa por retraso. Entrega jueves 14. Envío mejorado sin costo.",
    qs: [
      { q: "¿Número de pedido?", a: "#8842", opts: ["#4421", "#8842", "#1200"] },
      { q: "¿Nueva fecha de entrega?", a: "Thursday, March 14", opts: ["Tuesday, March 12", "Thursday, March 14", "next month"] },
      { q: "¿Tono del email?", a: "formal", opts: ["informal", "formal", "casual"] },
    ],
  },
  {
    min: 3,
    tone: "informal",
    subject: "Team outing — bowling Friday?",
    from: "Dev Team",
    body: "Hey everyone,\n\nWho's up for bowling this Friday after work? We booked lanes at 6:30. Partners welcome. Reply in the thread so we know numbers.\n\nSee you there!\nDev Team",
    say: "Hey everyone. Who's up for bowling this Friday after work? We booked lanes at six thirty. Partners welcome. Reply in the thread so we know numbers. See you there, Dev Team.",
    reply: "Count me in! I'll bring two people.",
    es: "Salida del equipo: bolos viernes 6:30.",
    qs: [
      { q: "¿Qué actividad?", a: "bowling", opts: ["bowling", "dinner only", "movie night"] },
      { q: "¿A qué hora?", a: "6:30", opts: ["5:00", "6:30", "9:00"] },
      { q: "¿Tono del email?", a: "informal", opts: ["formal", "informal", "legal"] },
    ],
  },
  {
    min: 3,
    tone: "formal",
    subject: "Follow-up on Q2 proposal",
    from: "Jamie Rivera",
    body: "Dear Mr. Okonkwo,\n\nI am writing to follow up on the Q2 proposal we sent on March 1. Please let us know if you require any clarification on pricing or the implementation timeline. We would appreciate your feedback by March 22.\n\nKind regards,\nJamie Rivera\nAccount Manager",
    say: "Dear Mr. Okonkwo. I am writing to follow up on the Q two proposal we sent on March first. Please let us know if you require any clarification on pricing or the implementation timeline. We would appreciate your feedback by March twenty second. Kind regards, Jamie Rivera, Account Manager.",
    reply: "Thank you, Jamie. We will review internally and respond by March 20.",
    es: "Seguimiento propuesta Q2. Feedback antes del 22 de marzo.",
    qs: [
      { q: "¿Sobre qué propuesta?", a: "Q2 proposal", opts: ["Q2 proposal", "vacation policy", "password reset"] },
      { q: "¿Fecha límite de feedback?", a: "March 22", opts: ["March 1", "March 22", "April 30"] },
      { q: "¿Tono del email?", a: "formal", opts: ["informal", "formal", "casual"] },
    ],
  }
);
