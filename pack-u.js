/* Lote U: 20 micro-novelas ramificadas A2→B2 */
window.ENLAB = window.ENLAB || {};

ENLAB.branchStories = [
  {
    id: "coffee-wrong",
    title: "The Wrong Order",
    min: 2,
    level: "A2",
    start: "n1",
    nodes: {
      n1: { text: "You're at a café. The barista hands you a latte, but you ordered tea.", es: "Te dan un latte; pediste té.", choices: [
        { label: "Politely say it's wrong", next: "n2", vocab: ["Excuse me, I ordered tea."] },
        { label: "Keep the latte", next: "n3", vocab: ["Never mind, thanks."] },
      ]},
      n2: { text: "The barista apologizes and makes your tea. She offers a free cookie.", es: "Te hacen el té y te ofrecen una galleta.", choices: [
        { label: "Accept the cookie", next: "end-good", vocab: ["That's very kind, thank you."] },
        { label: "Decline politely", next: "end-ok", vocab: ["No thanks, the tea is enough."] },
      ]},
      n3: { text: "You drink the latte. It's good, but you wanted tea for your sore throat.", es: "El latte está bien, pero querías té.", choices: [
        { label: "Buy tea too", next: "end-ok", vocab: ["Can I also get a tea, please?"] },
        { label: "Leave", next: "end-bad", vocab: ["Actually, I should go."] },
      ]},
      "end-good": { text: "You leave happy with tea and a cookie. Small wins matter.", es: "Sales contento: té y galleta.", ending: true, score: 3 },
      "end-ok": { text: "You got what you needed — mostly. Not perfect, but fine.", es: "Casi perfecto, pero bien.", ending: true, score: 2 },
      "end-bad": { text: "Your throat still hurts. Next time, speak up.", es: "Te sigue doliendo la garganta.", ending: true, score: 1 },
    },
  },
  {
    id: "flight-delay",
    title: "Delayed Flight",
    min: 2,
    level: "A2",
    start: "n1",
    nodes: {
      n1: { text: "Your flight is delayed three hours. You have a meeting tomorrow morning.", es: "Vuelo retrasado 3 h; mañana tienes reunión.", choices: [
        { label: "Ask about rebooking", next: "n2", vocab: ["Can you help me rebook?"] },
        { label: "Wait and email your team", next: "n3", vocab: ["I'll notify my team."] },
      ]},
      n2: { text: "There's a seat on another airline in two hours, but you pay a fee.", es: "Hay asiento en 2 h con otra aerolínea, con cargo.", choices: [
        { label: "Pay the fee", next: "end-good", vocab: ["I'll take it. How much is the fee?"] },
        { label: "Stay on original flight", next: "n3", vocab: ["I'll wait for the original flight."] },
      ]},
      n3: { text: "You send a quick update. Your manager replies: 'Do what you can.'", es: "Tu jefe dice: haz lo que puedas.", choices: [
        { label: "Book a hotel near the airport", next: "end-ok", vocab: ["I'll find a hotel near the airport."] },
        { label: "Try to sleep at the gate", next: "end-bad", vocab: ["I'll try to rest here."] },
      ]},
      "end-good": { text: "You make the meeting on time. Crisis handled.", es: "Llegas a tiempo. Crisis resuelta.", ending: true, score: 3 },
      "end-ok": { text: "You arrive tired but present. Your update saved the team.", es: "Llegas cansado pero avisaste.", ending: true, score: 2 },
      "end-bad": { text: "You miss the meeting. A lesson in backup plans.", es: "Pierdes la reunión.", ending: true, score: 1 },
    },
  },
  {
    id: "slack-typo",
    title: "Slack Typo",
    min: 3,
    level: "B1",
    start: "n1",
    nodes: {
      n1: { text: "You accidentally send 'I'll deploy to prod now' in the team channel. You meant staging.", es: "Mandas deploy a prod por error.", choices: [
        { label: "Correct immediately", next: "n2", vocab: ["Sorry — I meant staging, not prod."] },
        { label: "Delete and repost", next: "n2", vocab: ["Ignore the last message. Staging only."] },
      ]},
      n2: { text: "Your lead sees it. 'Are we really going to prod?'", es: "Tu lead pregunta si van a prod.", choices: [
        { label: "Explain clearly", next: "end-good", vocab: ["Typo on my part. Staging deploy only."] },
        { label: "Joke it off", next: "end-bad", vocab: ["Haha, maybe someday!"] },
      ]},
      "end-good": { text: "Clear communication wins. No panic.", es: "Comunicación clara, sin pánico.", ending: true, score: 3 },
      "end-bad": { text: "People are confused. Clarity beats jokes at work.", es: "Confusión en el equipo.", ending: true, score: 1 },
    },
  },
  {
    id: "hotel-noise",
    title: "Noisy Hotel",
    min: 2,
    level: "A2",
    start: "n1",
    nodes: {
      n1: { text: "It's midnight. Loud music from the room next door.", es: "Medianoche; música fuerte al lado.", choices: [
        { label: "Call reception", next: "n2", vocab: ["Hi, the room next door is very loud."] },
        { label: "Knock on the door", next: "n3", vocab: ["Excuse me, could you turn it down?"] },
      ]},
      n2: { text: "Reception says they'll call the room. Music stops in ten minutes.", es: "Recepción interviene; para en 10 min.", choices: [
        { label: "Thank them", next: "end-good", vocab: ["Thank you for your help."] },
        { label: "Ask for room change", next: "end-ok", vocab: ["If it continues, can I change rooms?"] },
      ]},
      n3: { text: "A friendly guest apologizes. They didn't know the walls were thin.", es: "Se disculpan; no sabían.", choices: [
        { label: "Accept apology", next: "end-good", vocab: ["No problem. Good night."] },
        { label: "Still call reception", next: "end-ok", vocab: ["Thanks. I'll call if it continues."] },
      ]},
      "end-good": { text: "You sleep well. Polite persistence works.", es: "Duermes bien.", ending: true, score: 3 },
      "end-ok": { text: "Acceptable night. You know your options.", es: "Noche aceptable.", ending: true, score: 2 },
    },
  },
  {
    id: "interview-salary",
    title: "Salary Question",
    min: 3,
    level: "B1",
    start: "n1",
    nodes: {
      n1: { text: "The interviewer asks: 'What are your salary expectations?'", es: "Preguntan expectativa salarial.", choices: [
        { label: "Give a range", next: "n2", vocab: ["Based on my research, I'm looking at seventy to eighty-five."] },
        { label: "Ask their range first", next: "n2", vocab: ["Could you share the band for this role?"] },
      ]},
      n2: { text: "They say the band is sixty-five to seventy-five.", es: "Banda: 65–75.", choices: [
        { label: "Negotiate with value", next: "end-good", vocab: ["Given my experience in X, I'd hope for the top of the band."] },
        { label: "Accept immediately", next: "end-ok", vocab: ["That works for me."] },
        { label: "Say it's too low", next: "end-bad", vocab: ["That's below my minimum."] },
      ]},
      "end-good": { text: "They offer seventy-two. You anchored well.", es: "Ofrecen 72. Buen anclaje.", ending: true, score: 3 },
      "end-ok": { text: "You get the offer. Room to grow later.", es: "Oferta aceptada.", ending: true, score: 2 },
      "end-bad": { text: "Conversation ends awkwardly. Always leave a door open.", es: "Conversación incómoda.", ending: true, score: 1 },
    },
  },
  {
    id: "gym-first",
    title: "First Day at the Gym",
    min: 2,
    level: "A2",
    start: "n1",
    nodes: {
      n1: { text: "New gym. You don't know where anything is.", es: "Gimnasio nuevo; no sabes dónde está nada.", choices: [
        { label: "Ask at the desk", next: "n2", vocab: ["Hi, first time here. Where are the lockers?"] },
        { label: "Watch and copy others", next: "n3", vocab: ["I'll follow what others do."] },
      ]},
      n2: { text: "Staff gives you a quick tour. Towels are free.", es: "Te hacen tour; toallas gratis.", choices: [
        { label: "Start with cardio", next: "end-good", vocab: ["Thanks. I'll start with the treadmill."] },
        { label: "Try weights", next: "end-ok", vocab: ["Where is the free weights area?"] },
      ]},
      n3: { text: "You put your bag in the wrong place. Someone politely corrects you.", es: "Dejas la mochila mal; te corrigen.", choices: [
        { label: "Apologize and move", next: "end-ok", vocab: ["Sorry, I didn't know. Thanks."] },
        { label: "Ask for help now", next: "end-good", vocab: ["Could you show me the rules?"] },
      ]},
      "end-good": { text: "Good first session. Asking beats guessing.", es: "Buena primera sesión.", ending: true, score: 3 },
      "end-ok": { text: "You worked out. Next time you'll know the layout.", es: "Entrenaste; la próxima será más fácil.", ending: true, score: 2 },
    },
  },
  {
    id: "doctor-sick-note",
    title: "Sick Note",
    min: 3,
    level: "B1",
    start: "n1",
    nodes: {
      n1: { text: "You're sick but need a note for work. The clinic is busy.", es: "Necesitas incapacidad; clínica llena.", choices: [
        { label: "Book telehealth", next: "n2", vocab: ["Do you offer a video visit today?"] },
        { label: "Walk in and wait", next: "n3", vocab: ["I'll wait. How long is the wait?"] },
      ]},
      n2: { text: "Telehealth in one hour. They need your symptoms clearly.", es: "Video en 1 h; piden síntomas claros.", choices: [
        { label: "Describe symptoms well", next: "end-good", vocab: ["I've had a fever and cough since Monday."] },
        { label: "Be vague", next: "end-bad", vocab: ["I just don't feel good."] },
      ]},
      n3: { text: "Wait is two hours. You could leave and come back.", es: "Espera de 2 h.", choices: [
        { label: "Wait", next: "end-ok", vocab: ["I'll wait. I need the note today."] },
        { label: "Try pharmacy clinic", next: "n2", vocab: ["Is there a minute clinic nearby?"] },
      ]},
      "end-good": { text: "You get the note. Clear symptoms help doctors help you.", es: "Consigues la incapacidad.", ending: true, score: 3 },
      "end-ok": { text: "Note in hand, eventually.", es: "Nota con esfuerzo.", ending: true, score: 2 },
      "end-bad": { text: "No note. Vague doesn't work in healthcare.", es: "Sin nota; hay que ser específico.", ending: true, score: 1 },
    },
  },
  {
    id: "landlord-repair",
    title: "Broken Heater",
    min: 3,
    level: "B1",
    start: "n1",
    nodes: {
      n1: { text: "Winter. Your heater stopped. Email or call the landlord?", es: "Calefacción rota.", choices: [
        { label: "Email with photos", next: "n2", vocab: ["The heater isn't working. I've attached photos."] },
        { label: "Call immediately", next: "n2", vocab: ["Hi, this is apt 3B. The heater stopped working."] },
      ]},
      n2: { text: "Landlord says someone can come Thursday. That's four days.", es: "Vienen el jueves; son 4 días.", choices: [
        { label: "Negotiate sooner", next: "end-good", vocab: ["Is there any way to get someone sooner? It's quite cold."] },
        { label: "Buy a space heater", next: "end-ok", vocab: ["I'll get a space heater. Please confirm Thursday."] },
        { label: "Threaten to withhold rent", next: "end-bad", vocab: ["If not fixed, I'll withhold rent."] },
      ]},
      "end-good": { text: "They send someone tomorrow. Polite urgency works.", es: "Vienen mañana.", ending: true, score: 3 },
      "end-ok": { text: "You stay warm. Repair on Thursday.", es: "Calor temporal; arreglo el jueves.", ending: true, score: 2 },
      "end-bad": { text: "Relationship damaged. Document and stay professional.", es: "Relación dañada.", ending: true, score: 1 },
    },
  },
  {
    id: "restaurant-allergy",
    title: "Allergy at Dinner",
    min: 2,
    level: "A2",
    start: "n1",
    nodes: {
      n1: { text: "You're allergic to nuts. The menu doesn't say if the sauce has them.", es: "Alergia a frutos secos.", choices: [
        { label: "Ask the server", next: "n2", vocab: ["Does this dish contain nuts or nut oil?"] },
        { label: "Order something else", next: "n3", vocab: ["I'll have the grilled chicken, plain."] },
      ]},
      n2: { text: "Server checks with the kitchen. The sauce has almond.", es: "La salsa lleva almendra.", choices: [
        { label: "Thank and reorder", next: "end-good", vocab: ["Thank you. I'll have the salmon without sauce."] },
        { label: "Risk it", next: "end-bad", vocab: ["Maybe just a little is OK."] },
      ]},
      n3: { text: "Safe choice. Boring but fine.", es: "Opción segura.", choices: [
        { label: "Enjoy dinner", next: "end-ok", vocab: ["Perfect, thank you."] },
      ]},
      "end-good": { text: "Great meal, no reaction. Always ask.", es: "Cena perfecta.", ending: true, score: 3 },
      "end-ok": { text: "Safe and simple.", es: "Seguro y simple.", ending: true, score: 2 },
      "end-bad": { text: "Allergic reaction. Never risk it.", es: "Reacción alérgica.", ending: true, score: 1 },
    },
  },
  {
    id: "team-conflict",
    title: "Team Disagreement",
    min: 4,
    level: "B2",
    start: "n1",
    nodes: {
      n1: { text: "In a meeting, you disagree with a colleague's approach in front of the team.", es: "Discrepas en público.", choices: [
        { label: "State facts calmly", next: "n2", vocab: ["I see it differently. The data from last sprint suggests…"] },
        { label: "Stay silent", next: "n3", vocab: ["I'll think about it and follow up."] },
      ]},
      n2: { text: "Colleague gets defensive. The manager watches.", es: "Colega a la defensiva.", choices: [
        { label: "Propose offline sync", next: "end-good", vocab: ["Let's take this offline and compare notes."] },
        { label: "Push harder", next: "end-bad", vocab: ["You're wrong. The numbers are clear."] },
      ]},
      n3: { text: "After the meeting, your manager asks why you stayed quiet.", es: "Manager pregunta por qué callaste.", choices: [
        { label: "Explain diplomatically", next: "end-ok", vocab: ["I wanted to avoid derailing the meeting. Happy to discuss now."] },
        { label: "Say you agreed", next: "end-bad", vocab: ["I actually agreed with the plan."] },
      ]},
      "end-good": { text: "You resolve it 1:1. Professional conflict done right.", es: "Resuelto en privado.", ending: true, score: 3 },
      "end-ok": { text: "Manager appreciates your timing.", es: "Timing diplomático.", ending: true, score: 2 },
      "end-bad": { text: "Trust eroded. Facts without empathy backfire.", es: "Confianza dañada.", ending: true, score: 1 },
    },
  },
];

/* Generar 10 historias más compactas para llegar a 20 */
(function () {
  const templates = [
    { id: "bus-lost", title: "Lost on the Bus", min: 2, level: "A2", plot: "You took the wrong bus.", opts: ["Ask the driver", "Use maps app"] },
    { id: "bank-fee", title: "Unexpected Fee", min: 3, level: "B1", plot: "Your bank charged a fee you don't recognize.", opts: ["Call support", "Visit branch"] },
    { id: "date-plans", title: "Rain on Plans", min: 2, level: "A2", plot: "Outdoor plans cancelled by rain.", opts: ["Suggest indoor", "Reschedule"] },
    { id: "package-stolen", title: "Missing Package", min: 3, level: "B1", plot: "Delivery marked delivered but you didn't get it.", opts: ["Contact seller", "Check neighbors"] },
    { id: "presentation-nerves", title: "Big Presentation", min: 4, level: "B2", plot: "You present to leadership in English.", opts: ["Slow down", "Rush to finish"] },
    { id: "neighbor-dog", title: "Barking Dog", min: 2, level: "A2", plot: "Neighbor's dog barks all night.", opts: ["Leave a note", "Talk in person"] },
    { id: "visa-question", title: "Border Question", min: 3, level: "B1", plot: "Immigration asks about your stay.", opts: ["Short clear answers", "Over-explain"] },
    { id: "coworker-credit", title: "Shared Credit", min: 4, level: "B2", plot: "A colleague takes credit for your work.", opts: ["Speak to them", "Email manager"] },
    { id: "car-tire", title: "Flat Tire", min: 2, level: "A2", plot: "Flat tire on the highway.", opts: ["Call roadside", "Try yourself"] },
    { id: "school-parent", title: "Parent Meeting", min: 3, level: "B1", plot: "Teacher wants to discuss your child's progress.", opts: ["Ask questions", "Agree to everything"] },
  ];
  templates.forEach((tpl) => {
    ENLAB.branchStories.push({
      id: tpl.id,
      title: tpl.title,
      min: tpl.min,
      level: tpl.level,
      start: "n1",
      nodes: {
        n1: { text: tpl.plot, es: tpl.plot, choices: [
          { label: tpl.opts[0], next: "n2", vocab: [`I'll ${tpl.opts[0].toLowerCase()}.`] },
          { label: tpl.opts[1], next: "n3", vocab: [`Let me ${tpl.opts[1].toLowerCase()}.`] },
        ]},
        n2: { text: "Things improve when you communicate clearly.", es: "Mejora con comunicación clara.", choices: [
          { label: "Continue", next: "end-good", vocab: ["Thank you for your help."] },
        ]},
        n3: { text: "It takes longer, but you learn.", es: "Tarda más, pero aprendes.", choices: [
          { label: "Continue", next: "end-ok", vocab: ["I'll follow up tomorrow."] },
        ]},
        "end-good": { text: "Good ending. Vocabulary unlocked.", es: "Final bueno.", ending: true, score: 3 },
        "end-ok": { text: "OK ending. Room to improve.", es: "Final aceptable.", ending: true, score: 2 },
      },
    });
  });
})();
