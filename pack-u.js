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
        { label: "Accept the cookie", next: "n4", vocab: ["That's very kind, thank you."] },
        { label: "Decline politely", next: "n4", vocab: ["No thanks, the tea is enough."] },
      ]},
      n4: { text: "She asks if you're studying English. You have your notebook open.", es: "Te pregunta si estudias inglés.", choices: [
        { label: "Practice small talk", next: "end-good", vocab: ["Yes, I'm practicing ordering in English."] },
        { label: "Keep it short", next: "end-ok", vocab: ["Just a little. Thanks again."] },
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
        { label: "Book a hotel near the airport", next: "n4", vocab: ["I'll find a hotel near the airport."] },
        { label: "Try to sleep at the gate", next: "n5", vocab: ["I'll try to rest here."] },
      ]},
      n4: { text: "Hotels are expensive. A colleague offers their couch.", es: "Hoteles caros; un colega ofrece su sofá.", choices: [
        { label: "Accept gratefully", next: "end-good", vocab: ["That's incredibly kind. I'll buy dinner."] },
        { label: "Book the hotel anyway", next: "end-ok", vocab: ["I'll take a room and expense it."] },
      ]},
      n5: { text: "Security asks you to move — you can't sleep sprawled across seats.", es: "Seguridad te pide moverte.", choices: [
        { label: "Ask about quiet zone", next: "end-ok", vocab: ["Is there a quiet area I can use?"] },
        { label: "Give up and get hotel", next: "end-bad", vocab: ["Fine, I'll get a hotel."] },
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

/* 10 historias con ramas largas (5–6 decisiones) — reemplaza plantillas compactas */
(function () {
  const longStories = [
    {
      id: "bus-lost",
      title: "Lost on the Bus",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "You took the wrong bus. The driver says the last stop is in twenty minutes.", es: "Tomaste el bus equivocado.", choices: [
          { label: "Ask the driver", next: "n2", vocab: ["Excuse me, how do I get back to Main Street?"] },
          { label: "Use maps app", next: "n3", vocab: ["I'll check my phone for the route."] },
        ]},
        n2: { text: "He suggests transferring at Oak Park. One transfer, then walk five minutes.", es: "Transbordo en Oak Park.", choices: [
          { label: "Confirm you understood", next: "n4", vocab: ["So I get off at Oak Park and take the 42?"] },
          { label: "Ask him to repeat", next: "n4", vocab: ["Could you say that again, please?"] },
        ]},
        n3: { text: "Your phone shows a 40-minute walk. Battery at 12%.", es: "40 min a pie; batería baja.", choices: [
          { label: "Ask a passenger", next: "n2", vocab: ["Sorry, do you know this bus route?"] },
          { label: "Find a charger", next: "n5", vocab: ["Is there a café near the next stop?"] },
        ]},
        n4: { text: "You transfer successfully. A stranger sees you looking confused at the map.", es: "Transbordas bien; alguien te ve mirando el mapa.", choices: [
          { label: "Ask for directions", next: "n6", vocab: ["I'm almost there — is this the way to Main?"] },
          { label: "Walk without asking", next: "n6", vocab: ["I think it's this way."] },
        ]},
        n6: { text: "You find Main Street with help. The bus driver waves as he passes.", es: "Encuentras Main Street.", choices: [
          { label: "Wave thanks", next: "end-good", vocab: ["Thanks again for your help!"] },
          { label: "Text you're safe", next: "end-ok", vocab: ["Made it — thanks for the directions."] },
        ]},
        n5: { text: "A shop lets you charge for five minutes. You make the call to a friend.", es: "Cargas el móvil cinco minutos.", choices: [
          { label: "Friend picks you up", next: "end-good", vocab: ["Can you pick me up at Oak Park?"] },
          { label: "Ride-share", next: "end-ok", vocab: ["I'll get a ride from here."] },
        ]},
        "end-good": { text: "You arrive knowing how to ask on transit.", es: "Llegas sabiendo pedir ayuda.", ending: true, score: 3 },
        "end-ok": { text: "Late, but you learned the system.", es: "Tarde, pero aprendiste.", ending: true, score: 2 },
      },
    },
    {
      id: "bank-fee",
      title: "Unexpected Fee",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "A $35 fee appeared on your statement. You don't recognize it.", es: "Cargo de $35 que no reconoces.", choices: [
          { label: "Call support", next: "n2", vocab: ["Hi, I see a fee I didn't authorize."] },
          { label: "Visit branch", next: "n3", vocab: ["I'd like to dispute a charge in person."] },
        ]},
        n2: { text: "Hold music. The agent asks for the date and merchant code.", es: "Te piden fecha y código.", choices: [
          { label: "Have details ready", next: "n4", vocab: ["It posted on the third. Merchant code 8842."] },
          { label: "Guess the date", next: "n5", vocab: ["I think it was last week."] },
        ]},
        n3: { text: "The teller says phone support is faster for disputes.", es: "Dicen que por teléfono es más rápido.", choices: [
          { label: "Call from lobby", next: "n2", vocab: ["OK, I'll call now from here."] },
          { label: "Insist on branch form", next: "n4", vocab: ["Can I fill out a dispute form here?"] },
        ]},
        n4: { text: "It's an annual fee you forgot you agreed to in the app.", es: "Es una cuota anual que olvidaste.", choices: [
          { label: "Ask to waive once", next: "n6", vocab: ["I've been a customer for years. Could you waive it this time?"] },
          { label: "Accept and cancel feature", next: "n6", vocab: ["Please cancel the premium tier going forward."] },
        ]},
        n6: { text: "Agent puts you on hold — supervisor joins.", es: "Supervisor entra en la llamada.", choices: [
          { label: "Stay polite", next: "end-good", vocab: ["I appreciate you looking into this."] },
          { label: "Confirm by email", next: "end-ok", vocab: ["Please send confirmation to my email."] },
        ]},
        n5: { text: "They can't find the charge without exact info.", es: "Sin datos exactos no localizan el cargo.", choices: [
          { label: "Check app and call back", next: "n4", vocab: ["I'll verify in the app and call back."] },
          { label: "Give up", next: "end-bad", vocab: ["Forget it."] },
        ]},
        "end-good": { text: "Fee reversed. Polite persistence pays.", es: "Devuelven el cargo.", ending: true, score: 3 },
        "end-ok": { text: "No refund, but no surprise next year.", es: "Sin reembolso, sin sorpresa futura.", ending: true, score: 2 },
        "end-bad": { text: "You paid for silence. Document everything.", es: "Pagaste por no documentar.", ending: true, score: 1 },
      },
    },
    {
      id: "date-plans",
      title: "Rain on Plans",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Picnic plans — torrential rain. Your friend texts: 'Still on?'", es: "Lluvia torrencial; picnic en duda.", choices: [
          { label: "Suggest indoor", next: "n2", vocab: ["How about the museum instead?"] },
          { label: "Reschedule", next: "n3", vocab: ["Let's rain-check for Saturday."] },
        ]},
        n2: { text: "Museum closes in two hours. Café next door has a wait.", es: "Museo cierra pronto; café con cola.", choices: [
          { label: "Quick museum sprint", next: "n4", vocab: ["We can still see the main exhibit."] },
          { label: "Book café table", next: "n4", vocab: ["I'll put our name on the waitlist."] },
        ]},
        n3: { text: "Friend sounds disappointed. 'I took the day off.'", es: "Tu amigo tomó el día libre.", choices: [
          { label: "Pivot to indoor now", next: "n2", vocab: ["You're right — let's do something today."] },
          { label: "Offer video call", next: "n5", vocab: ["Want to hang on video with tea?"] },
        ]},
        n4: { text: "You end up laughing over hot chocolate, watching the storm.", es: "Chocolate caliente viendo la tormenta.", choices: [
          { label: "Make it a tradition", next: "n6", vocab: ["Rainy-day backup plan — I love it."] },
          { label: "Plan outdoor retry", next: "n6", vocab: ["We'll picnic when the sun returns."] },
        ]},
        n6: { text: "Friend sends a photo: 'Best rainy day ever.'", es: "Tu amigo manda foto.", choices: [
          { label: "Reply warmly", next: "end-good", vocab: ["Already planning the next backup plan."] },
          { label: "Suggest next week", next: "end-ok", vocab: ["Same time next Saturday?"] },
        ]},
        n5: { text: "Video call is nice but they're alone on their day off.", es: "Videollamada ok, pero están solos.", choices: [
          { label: "Drive over with soup", next: "n6", vocab: ["I'm bringing soup in twenty minutes."] },
          { label: "Keep video plan", next: "n6", vocab: ["Same time tomorrow in person?"] },
        ]},
        "end-good": { text: "Friend feels cared for. Flexibility > weather.", es: "Se sienten cuidados.", ending: true, score: 3 },
        "end-ok": { text: "Plans saved, relationship intact.", es: "Planes salvados.", ending: true, score: 2 },
      },
    },
    {
      id: "package-stolen",
      title: "Missing Package",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "Delivered — but nothing on your porch. Camera shows a neighbor's kid.", es: "Marcado entregado; cámara muestra a un vecino.", choices: [
          { label: "Contact seller", next: "n2", vocab: ["My package shows delivered but I didn't receive it."] },
          { label: "Check neighbors", next: "n3", vocab: ["Hi, did a package arrive here by mistake?"] },
        ]},
        n2: { text: "Seller asks for a police report or carrier trace.", es: "Pidieron reporte o rastreo.", choices: [
          { label: "Open carrier claim", next: "n4", vocab: ["I'd like to file a delivery investigation."] },
          { label: "Talk to neighbor first", next: "n3", vocab: ["I'll check with neighbors before escalating."] },
        ]},
        n3: { text: "Neighbor apologizes — kid brought it inside thinking it was a gift.", es: "Lo tienen dentro por error.", choices: [
          { label: "Thank and notify seller", next: "n5", vocab: ["Found it next door. No refund needed."] },
          { label: "Ask for porch photo next time", next: "n5", vocab: ["Could you text me if it happens again?"] },
        ]},
        n4: { text: "Carrier offers refund in 5 days OR reship now.", es: "Reembolso en 5 días o reenvío.", choices: [
          { label: "Reship", next: "n6", vocab: ["Please reship to the same address."] },
          { label: "Refund", next: "n6", vocab: ["Refund is fine. I'll reorder locally."] },
        ]},
        n5: { text: "Package in hand. Seller still wants confirmation.", es: "Paquete recuperado; seller pide confirmación.", choices: [
          { label: "Send photo proof", next: "n6", vocab: ["Attached photo — received in good condition."] },
          { label: "Quick email", next: "n6", vocab: ["All set, thanks for your help."] },
        ]},
        n6: { text: "Seller closes the ticket. You save the thread.", es: "Cierran el ticket.", choices: [
          { label: "Archive email", next: "end-good", vocab: ["Thanks — case resolved."] },
          { label: "Leave review", next: "end-ok", vocab: ["Great support, five stars."] },
        ]},
        "end-good": { text: "Problem solved with clear emails.", es: "Resuelto con emails claros.", ending: true, score: 3 },
        "end-ok": { text: "Item secured or refunded.", es: "Objeto o reembolso.", ending: true, score: 2 },
      },
    },
    {
      id: "presentation-nerves",
      title: "Big Presentation",
      min: 4,
      level: "B2",
      start: "n1",
      nodes: {
        n1: { text: "All-hands in ten minutes. Your slides are ready; your mouth is dry.", es: "Presentación en 10 min.", choices: [
          { label: "Slow breathing", next: "n2", vocab: ["I'll open with the one-line summary."] },
          { label: "Rush to add more slides", next: "n3", vocab: ["I need one more chart."] },
        ]},
        n2: { text: "Colleague offers to intro you — buys thirty seconds.", es: "Colega te presenta.", choices: [
          { label: "Accept intro", next: "n4", vocab: ["Thanks — I'll take it from the roadmap slide."] },
          { label: "Go solo", next: "n4", vocab: ["I'll keep it short and jump in."] },
        ]},
        n3: { text: "You overwrite the file. Font breaks on the projector.", es: "Se rompe la fuente en proyector.", choices: [
          { label: "Present without slides", next: "n5", vocab: ["I'll walk through the three points verbally."] },
          { label: "Fix on laptop", next: "n4", vocab: ["Share screen from my laptop instead."] },
        ]},
        n4: { text: "CEO asks a hard question mid-deck.", es: "Pregunta difícil del CEO.", choices: [
          { label: "Bridge and follow up", next: "n6", vocab: ["Great question — I'll follow up with data after this."] },
          { label: "Bluff an answer", next: "end-bad", vocab: ["The number is definitely forty percent."] },
        ]},
        n5: { text: "No visuals, but you sound confident.", es: "Sin diapos, suenas seguro.", choices: [
          { label: "Stick to three points", next: "n6", vocab: ["Three takeaways: speed, quality, cost."] },
          { label: "Open for questions early", next: "n6", vocab: ["I'll pause here for questions."] },
        ]},
        n6: { text: "Applause. Manager says 'Clear and honest.'", es: "Aplausos; manager contento.", choices: [
          { label: "Thank team", next: "end-good", vocab: ["Credit to the team who built this."] },
          { label: "Send recap email", next: "end-ok", vocab: ["I'll send a recap with the follow-up data."] },
        ]},
        "end-good": { text: "Credibility up. Honesty beats bluffing.", es: "Credibilidad sube.", ending: true, score: 3 },
        "end-ok": { text: "Solid delivery under pressure.", es: "Buena entrega bajo presión.", ending: true, score: 2 },
        "end-bad": { text: "Wrong stat spreads. Verify or defer.", es: "Dato incorrecto circula.", ending: true, score: 1 },
      },
    },
    {
      id: "neighbor-dog",
      title: "Barking Dog",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Neighbor's dog barks from 11 p.m. to 2 a.m. You have an exam tomorrow.", es: "Perro ladra de 11 p.m. a 2 a.m.", choices: [
          { label: "Leave a note", next: "n2", vocab: ["Hi — your dog has been barking late at night."] },
          { label: "Talk in person", next: "n3", vocab: ["Do you have a minute? The barking keeps me up."] },
        ]},
        n2: { text: "No reply for two days. Barking continues.", es: "Sin respuesta; sigue ladrando.", choices: [
          { label: "Knock politely", next: "n3", vocab: ["I left a note — can we chat?"] },
          { label: "Contact building manager", next: "n4", vocab: ["I'd like to log a noise complaint."] },
        ]},
        n3: { text: "Neighbor is embarrassed — new rescue dog, separation anxiety.", es: "Perro nuevo con ansiedad.", choices: [
          { label: "Suggest trainer", next: "n5", vocab: ["Our building recommends a trainer on Oak."] },
          { label: "Offer white-noise tip", next: "n5", vocab: ["A fan by my wall helped me last year."] },
        ]},
        n4: { text: "Manager mediates a meeting.", es: "Manager organiza reunión.", choices: [
          { label: "State facts calmly", next: "end-good", vocab: ["It's been nightly since the tenth."] },
          { label: "Threaten lease action", next: "end-bad", vocab: ["I'll break my lease if this continues."] },
        ]},
        n5: { text: "They try a thunder shirt. Quieter nights by Friday.", es: "Prueban thunder shirt; mejora.", choices: [
          { label: "Thank them", next: "end-good", vocab: ["Really appreciate you working on this."] },
          { label: "Stay formal", next: "end-ok", vocab: ["Let me know if it continues."] },
        ]},
        "end-good": { text: "Sleep back. Neighbor relations OK.", es: "Duermes otra vez.", ending: true, score: 3 },
        "end-ok": { text: "Improving. Document if needed.", es: "Mejora; documenta si hace falta.", ending: true, score: 2 },
        "end-bad": { text: "Tension in the building. Start calm.", es: "Tensión en el edificio.", ending: true, score: 1 },
      },
    },
    {
      id: "visa-question",
      title: "Border Question",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "Immigration: 'Purpose of visit?' Queue behind you is long.", es: "Immigración: propósito de visita.", choices: [
          { label: "Short clear answer", next: "n2", vocab: ["Tourism for two weeks."] },
          { label: "Over-explain", next: "n3", vocab: ["Well, my cousin suggested maybe also a job fair…"] },
        ]},
        n2: { text: "'Where are you staying?' You have a hotel confirmation.", es: "¿Dónde te quedas?", choices: [
          { label: "Show hotel booking", next: "n4", vocab: ["Here — downtown, checkout on the twentieth."] },
          { label: "Mention friend's address", next: "n4", vocab: ["First week hotel, then with a friend."] },
        ]},
        n3: { text: "Officer frowns. 'Do you have work authorization?'", es: "Ceño fruncido; piden permiso de trabajo.", choices: [
          { label: "Clarify tourism only", next: "n2", vocab: ["Sorry — tourism only. Here's my return ticket."] },
          { label: "Show job fair flyer", next: "n5", vocab: ["I'm not working — just attending as a visitor."] },
        ]},
        n4: { text: "'Funds for the stay?' Bank app shows balance.", es: "¿Fondos para la estancia?", choices: [
          { label: "Show statement", next: "end-good", vocab: ["I have savings and a return flight booked."] },
          { label: "Estimate vaguely", next: "end-bad", vocab: ["Enough, I think."] },
        ]},
        n5: { text: "Secondary screening. Stress rises.", es: "Revisión secundaria.", choices: [
          { label: "Stay calm, repeat facts", next: "end-ok", vocab: ["Tourism only. Here is my itinerary."] },
          { label: "Get defensive", next: "end-bad", vocab: ["This is ridiculous."] },
        ]},
        "end-good": { text: "Stamped in. Short answers win.", es: "Entrada ok.", ending: true, score: 3 },
        "end-ok": { text: "Delayed but admitted.", es: "Retraso pero admitido.", ending: true, score: 2 },
        "end-bad": { text: "Denied entry. Never vague at borders.", es: "Denegado.", ending: true, score: 1 },
      },
    },
    {
      id: "coworker-credit",
      title: "Shared Credit",
      min: 4,
      level: "B2",
      start: "n1",
      nodes: {
        n1: { text: "In the review, a colleague presents your analysis as theirs.", es: "Colega presenta tu análisis como suyo.", choices: [
          { label: "Speak to them after", next: "n2", vocab: ["Can we sync on who presents what next time?"] },
          { label: "Email manager", next: "n3", vocab: ["I want to clarify my contribution to the analysis."] },
        ]},
        n2: { text: "They say it was unintentional — 'team effort.'", es: "Dicen que fue sin querer.", choices: [
          { label: "Ask for public correction", next: "n4", vocab: ["Could you mention my name in the follow-up?"] },
          { label: "Let it go", next: "n5", vocab: ["OK, but I'll present my own work going forward."] },
        ]},
        n3: { text: "Manager schedules a three-way chat.", es: "Chat a tres.", choices: [
          { label: "Bring timestamps", next: "n4", vocab: ["I shared the draft on Tuesday at nine."] },
          { label: "Accuse in meeting", next: "n5", vocab: ["They stole my slide deck."] },
        ]},
        n4: { text: "Manager asks for shared doc ownership going forward.", es: "Pidieron documentar ownership.", choices: [
          { label: "Agree on process", next: "n6", vocab: ["Let's put names on slides in the template."] },
          { label: "Refuse to collaborate", next: "end-bad", vocab: ["I won't work with them again."] },
        ]},
        n5: { text: "Relationship cold. Project still due Friday.", es: "Relación fría; entrega el viernes.", choices: [
          { label: "Professional finish", next: "n6", vocab: ["I'll complete my section and cc you both."] },
          { label: "Escalate to HR", next: "end-bad", vocab: ["I'm opening an HR ticket."] },
        ]},
        n6: { text: "Follow-up meeting: names on the deck, shared folder.", es: "Nombres en slides y carpeta compartida.", choices: [
          { label: "Confirm in writing", next: "end-good", vocab: ["I'll send the process doc after this."] },
          { label: "Move on", next: "end-ok", vocab: ["Sounds good — let's ship Friday."] },
        ]},
        "end-good": { text: "Credit clear. Process improved.", es: "Crédito claro.", ending: true, score: 3 },
        "end-ok": { text: "Awkward but project done.", es: "Incómodo pero entregado.", ending: true, score: 2 },
        "end-bad": { text: "Burned bridges. Document early.", es: "Quemaste puentes.", ending: true, score: 1 },
      },
    },
    {
      id: "car-tire",
      title: "Flat Tire",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Flat on the highway shoulder. Traffic loud.", es: "Pinchazo en autopista.", choices: [
          { label: "Call roadside", next: "n2", vocab: ["Hi, I have a flat on I-90 east, mile marker 42."] },
          { label: "Try yourself", next: "n3", vocab: ["I've changed a tire before."] },
        ]},
        n2: { text: "ETA forty minutes. Weather turning cold.", es: "Grúa en 40 min; hace frío.", choices: [
          { label: "Stay in car", next: "n4", vocab: ["I'll wait inside with hazards on."] },
          { label: "Stand outside to flag", next: "n4", vocab: ["I'll stand back from the lane with a vest."] },
        ]},
        n3: { text: "Jack slips. Wheel won't budge.", es: "Gato resbala.", choices: [
          { label: "Call for help", next: "n2", vocab: ["I need roadside — jack failed."] },
          { label: "Ask passing driver", next: "n5", vocab: ["Excuse me, do you have a lug wrench?"] },
        ]},
        n4: { text: "Truck arrives. Driver asks if you have spare or need tow.", es: "¿Rueda de repuesto o grúa?", choices: [
          { label: "Check spare", next: "end-good", vocab: ["Spare looks OK — please swap it."] },
          { label: "Need tow to shop", next: "end-ok", vocab: ["Tow to the service station two exits ahead."] },
        ]},
        n5: { text: "Good Samaritan helps. Tire changed in rain.", es: "Ayuda en la lluvia.", choices: [
          { label: "Thank and offer cash", next: "end-good", vocab: ["You're a lifesaver — please take this."] },
          { label: "Rush off", next: "end-ok", vocab: ["Thanks! Gotta go."] },
        ]},
        "end-good": { text: "Safe and grateful.", es: "Seguro y agradecido.", ending: true, score: 3 },
        "end-ok": { text: "Moving again.", es: "Otra vez en marcha.", ending: true, score: 2 },
      },
    },
    {
      id: "school-parent",
      title: "Parent Meeting",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "Teacher: 'Your child struggles with participation in English.'", es: "Participación baja en inglés.", choices: [
          { label: "Ask questions", next: "n2", vocab: ["What does participation look like in class?"] },
          { label: "Agree to everything", next: "n3", vocab: ["Yes, we'll fix it."] },
        ]},
        n2: { text: "Teacher mentions group work and fear of mistakes.", es: "Miedo a equivocarse en grupo.", choices: [
          { label: "Share home context", next: "n4", vocab: ["We speak Spanish at home — any tips?"] },
          { label: "Ask for resources", next: "n4", vocab: ["Are there apps or clubs you'd recommend?"] },
        ]},
        n3: { text: "Meeting ends fast. No action plan.", es: "Sin plan de acción.", choices: [
          { label: "Email follow-up", next: "n4", vocab: ["Could you share concrete steps we can try?"] },
          { label: "Leave it", next: "end-bad", vocab: ["OK, thanks."] },
        ]},
        n4: { text: "Teacher suggests lunch club and paired reading.", es: "Club de almuerzo y lectura en pareja.", choices: [
          { label: "Commit to trial month", next: "n5", vocab: ["We'll try the lunch club for a month."] },
          { label: "Hedge", next: "n5", vocab: ["We'll see if schedule allows."] },
        ]},
        n5: { text: "Child nervous about club. You debrief at home.", es: "Niño nervioso por el club.", choices: [
          { label: "Role-play together", next: "end-good", vocab: ["Let's practice introducing yourself tonight."] },
          { label: "Tell teacher to push", next: "end-ok", vocab: ["Please encourage them gently in class."] },
        ]},
        "end-good": { text: "Partnership with school. Kid tries.", es: "Alianza con escuela.", ending: true, score: 3 },
        "end-ok": { text: "Plan exists. Follow up in four weeks.", es: "Plan con seguimiento.", ending: true, score: 2 },
        "end-bad": { text: "No change. Ask for specifics.", es: "Sin cambio.", ending: true, score: 1 },
      },
    },
  ];

  const ids = new Set(longStories.map((s) => s.id));
  ENLAB.branchStories = ENLAB.branchStories.filter((s) => !ids.has(s.id));
  ENLAB.branchStories.push(...longStories);
})();

/* Historias compactas → ramas 5+ pasos (coffee, flight, slack, hotel, interview, gym, doctor, landlord, allergy, team) */
(function () {
  const deepCompact = [
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
        n2: { text: "She apologizes and starts your tea. The line behind you is growing.", es: "Pide disculpas; hay cola.", choices: [
          { label: "Say it's fine", next: "n4", vocab: ["No rush — take your time."] },
          { label: "Offer to wait aside", next: "n4", vocab: ["I'll step aside while you make it."] },
        ]},
        n4: { text: "She offers a free cookie for the mistake.", es: "Te ofrecen una galleta.", choices: [
          { label: "Accept kindly", next: "n5", vocab: ["That's very kind, thank you."] },
          { label: "Decline politely", next: "n5", vocab: ["No thanks, the tea is enough."] },
        ]},
        n5: { text: "She asks if you're studying English — your notebook is open.", es: "Pregunta si estudias inglés.", choices: [
          { label: "Practice small talk", next: "end-good", vocab: ["Yes, I'm practicing ordering in English."] },
          { label: "Keep it short", next: "end-ok", vocab: ["Just a little. Thanks again."] },
        ]},
        n3: { text: "The latte is good, but you wanted tea for your sore throat.", es: "Latte ok, pero querías té.", choices: [
          { label: "Order tea too", next: "n6", vocab: ["Can I also get a tea, please?"] },
          { label: "Leave", next: "end-bad", vocab: ["Actually, I should go."] },
        ]},
        n6: { text: "She remembers you and makes it quickly.", es: "Te reconoce y lo hace rápido.", choices: [
          { label: "Thank her", next: "end-ok", vocab: ["Perfect — thank you so much."] },
        ]},
        "end-good": { text: "Tea, cookie, and confidence. Small wins matter.", es: "Té, galleta y confianza.", ending: true, score: 3 },
        "end-ok": { text: "You got what you needed — mostly.", es: "Casi perfecto, pero bien.", ending: true, score: 2 },
        "end-bad": { text: "Your throat still hurts. Next time, speak up.", es: "Te sigue doliendo la garganta.", ending: true, score: 1 },
      },
    },
    {
      id: "slack-typo",
      title: "Slack Typo",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "You send 'I'll deploy to prod now' in #team. You meant staging.", es: "Deploy a prod por error.", choices: [
          { label: "Correct immediately", next: "n2", vocab: ["Sorry — I meant staging, not prod."] },
          { label: "Delete and repost", next: "n2", vocab: ["Ignore the last message. Staging only."] },
        ]},
        n2: { text: "Your lead: 'Are we really going to prod?'", es: "Lead pregunta si van a prod.", choices: [
          { label: "Explain clearly", next: "n3", vocab: ["Typo on my part. Staging deploy only."] },
          { label: "Joke it off", next: "n4", vocab: ["Haha, maybe someday!"] },
        ]},
        n3: { text: "Lead asks you to post in #deployments when ready.", es: "Piden avisar en #deployments.", choices: [
          { label: "Confirm process", next: "n5", vocab: ["Will do — I'll tag QA first."] },
          { label: "Rush deploy", next: "n4", vocab: ["Deploying now anyway."] },
        ]},
        n4: { text: "On-call pings you — they saw the prod message in alerts.", es: "On-call vio la alerta.", choices: [
          { label: "Clarify in thread", next: "n5", vocab: ["False alarm — staging only. Sorry for the noise."] },
          { label: "Go silent", next: "end-bad", vocab: ["…"] },
        ]},
        n5: { text: "Staging passes. You write a one-line postmortem.", es: "Staging ok; mini postmortem.", choices: [
          { label: "Share learnings", next: "end-good", vocab: ["Lesson: double-check channel before send."] },
          { label: "Move on", next: "end-ok", vocab: ["All good now. Thanks for checking."] },
        ]},
        "end-good": { text: "Trust intact. Clear beats funny at work.", es: "Confianza intacta.", ending: true, score: 3 },
        "end-ok": { text: "Crisis avoided. Process improved.", es: "Crisis evitada.", ending: true, score: 2 },
        "end-bad": { text: "Confusion spread. Clarity is kindness.", es: "Confusión en el equipo.", ending: true, score: 1 },
      },
    },
    {
      id: "hotel-noise",
      title: "Noisy Hotel",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Midnight. Loud music from next door.", es: "Música fuerte al lado.", choices: [
          { label: "Call reception", next: "n2", vocab: ["Hi, the room next door is very loud."] },
          { label: "Knock on the door", next: "n3", vocab: ["Excuse me, could you turn it down?"] },
        ]},
        n2: { text: "Reception will call the room. They offer earplugs.", es: "Llamarán; ofrecen tapones.", choices: [
          { label: "Accept earplugs", next: "n4", vocab: ["Yes please, and thank you."] },
          { label: "Ask for room change", next: "n4", vocab: ["If it continues, can I change rooms?"] },
        ]},
        n3: { text: "Guest apologizes — thin walls.", es: "Se disculpan.", choices: [
          { label: "Accept apology", next: "n4", vocab: ["No problem. Good night."] },
          { label: "Still call reception", next: "n2", vocab: ["Thanks. I'll call if it continues."] },
        ]},
        n4: { text: "Music stops. You have an early tour tomorrow.", es: "Para la música; tour mañana.", choices: [
          { label: "Set alarm", next: "n5", vocab: ["I'll need a wake-up call at six."] },
          { label: "Ask late checkout", next: "n5", vocab: ["If I'm tired, is late checkout possible?"] },
        ]},
        n5: { text: "You sleep finally. Breakfast starts at seven.", es: "Duermes; desayuno a las 7.", choices: [
          { label: "Book breakfast", next: "end-good", vocab: ["Is breakfast included?"] },
          { label: "Skip to tour", next: "end-ok", vocab: ["I'll grab coffee on the way."] },
        ]},
        "end-good": { text: "Rested and polite. Travel English wins.", es: "Descansado y educado.", ending: true, score: 3 },
        "end-ok": { text: "Tired but you handled it.", es: "Cansado pero lo resolviste.", ending: true, score: 2 },
      },
    },
    {
      id: "interview-salary",
      title: "Salary Question",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "'What are your salary expectations?'", es: "Expectativa salarial.", choices: [
          { label: "Give a range", next: "n2", vocab: ["Based on my research, I'm looking at seventy to eighty-five."] },
          { label: "Ask their range first", next: "n2", vocab: ["Could you share the band for this role?"] },
        ]},
        n2: { text: "Band is sixty-five to seventy-five.", es: "Banda 65–75.", choices: [
          { label: "Negotiate with value", next: "n3", vocab: ["Given my experience in X, I'd hope for the top of the band."] },
          { label: "Accept immediately", next: "n4", vocab: ["That works for me."] },
          { label: "Say it's too low", next: "n5", vocab: ["That's below my minimum."] },
        ]},
        n3: { text: "They ask for your biggest recent win.", es: "Piden tu logro reciente.", choices: [
          { label: "STAR answer", next: "n6", vocab: ["I led a migration that cut costs by twenty percent."] },
          { label: "Vague answer", next: "n5", vocab: ["I've done a lot of good work."] },
        ]},
        n4: { text: "They note you didn't negotiate.", es: "No negociaste.", choices: [
          { label: "Ask about review cycle", next: "end-ok", vocab: ["When is the first performance review?"] },
        ]},
        n5: { text: "Tension in the room.", es: "Tensión.", choices: [
          { label: "Leave door open", next: "end-ok", vocab: ["If the scope grows, I'm open to revisiting."] },
          { label: "End call", next: "end-bad", vocab: ["I don't think we're aligned."] },
        ]},
        n6: { text: "They offer seventy-two plus remote stipend.", es: "Ofrecen 72 + remoto.", choices: [
          { label: "Accept professionally", next: "end-good", vocab: ["That sounds fair. I'm excited to join."] },
          { label: "Ask one more thing", next: "end-ok", vocab: ["Could we confirm the start date in writing?"] },
        ]},
        "end-good": { text: "Seventy-two. You anchored well.", es: "Ofrecen 72.", ending: true, score: 3 },
        "end-ok": { text: "Offer or path forward.", es: "Oferta o puerta abierta.", ending: true, score: 2 },
        "end-bad": { text: "Always leave a door open.", es: "Conversación incómoda.", ending: true, score: 1 },
      },
    },
    {
      id: "gym-first",
      title: "First Day at the Gym",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "New gym. You don't know where anything is.", es: "Gimnasio nuevo.", choices: [
          { label: "Ask at the desk", next: "n2", vocab: ["Hi, first time here. Where are the lockers?"] },
          { label: "Watch and copy", next: "n3", vocab: ["I'll follow what others do."] },
        ]},
        n2: { text: "Staff gives a tour. Towels are free.", es: "Tour; toallas gratis.", choices: [
          { label: "Start cardio", next: "n4", vocab: ["Thanks. I'll start with the treadmill."] },
          { label: "Try weights", next: "n4", vocab: ["Where is the free weights area?"] },
        ]},
        n3: { text: "You put your bag in the wrong place.", es: "Mochila mal puesta.", choices: [
          { label: "Apologize", next: "n2", vocab: ["Sorry, I didn't know. Thanks."] },
          { label: "Ask for rules", next: "n2", vocab: ["Could you show me the rules?"] },
        ]},
        n4: { text: "Trainer offers a free form check.", es: "Ofrecen revisar técnica.", choices: [
          { label: "Accept help", next: "n5", vocab: ["That would be great — I'm new to squats."] },
          { label: "Decline shyly", next: "n5", vocab: ["Maybe next time, thanks."] },
        ]},
        n5: { text: "You finish sweaty but proud.", es: "Terminas sudado pero bien.", choices: [
          { label: "Book next session", next: "end-good", vocab: ["See you Wednesday same time."] },
          { label: "Ask about membership", next: "end-ok", vocab: ["What plans do you have for students?"] },
        ]},
        "end-good": { text: "Asking beats guessing.", es: "Buena primera sesión.", ending: true, score: 3 },
        "end-ok": { text: "You worked out. Next time easier.", es: "Entrenaste.", ending: true, score: 2 },
      },
    },
    {
      id: "doctor-sick-note",
      title: "Sick Note",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "Sick but need a work note. Clinic is busy.", es: "Necesitas incapacidad.", choices: [
          { label: "Book telehealth", next: "n2", vocab: ["Do you offer a video visit today?"] },
          { label: "Walk in", next: "n3", vocab: ["I'll wait. How long is the wait?"] },
        ]},
        n2: { text: "Video in one hour. They need clear symptoms.", es: "Video en 1 h.", choices: [
          { label: "Describe well", next: "n4", vocab: ["I've had a fever and cough since Monday."] },
          { label: "Be vague", next: "n5", vocab: ["I just don't feel good."] },
        ]},
        n3: { text: "Wait is two hours.", es: "Espera 2 h.", choices: [
          { label: "Wait", next: "n4", vocab: ["I'll wait. I need the note today."] },
          { label: "Try minute clinic", next: "n2", vocab: ["Is there a minute clinic nearby?"] },
        ]},
        n4: { text: "Doctor asks if you can work from home.", es: "Preguntan teletrabajo.", choices: [
          { label: "Honest answer", next: "n6", vocab: ["I can answer emails but not calls."] },
          { label: "Say fully out", next: "n6", vocab: ["I need full rest today."] },
        ]},
        n5: { text: "They can't write a note without details.", es: "Sin detalles, sin nota.", choices: [
          { label: "Try again clearly", next: "n4", vocab: ["Fever since Monday, dry cough."] },
          { label: "Give up", next: "end-bad", vocab: ["Never mind."] },
        ]},
        n6: { text: "Note ready. HR wants it uploaded.", es: "Nota lista; HR pide subirla.", choices: [
          { label: "Confirm format", next: "end-good", vocab: ["Is PDF OK for HR?"] },
          { label: "Email manager", next: "end-ok", vocab: ["I'll send this to my manager today."] },
        ]},
        "end-good": { text: "Clear symptoms help doctors help you.", es: "Consigues la incapacidad.", ending: true, score: 3 },
        "end-ok": { text: "Note in hand.", es: "Nota con esfuerzo.", ending: true, score: 2 },
        "end-bad": { text: "Vague doesn't work in healthcare.", es: "Sin nota.", ending: true, score: 1 },
      },
    },
    {
      id: "landlord-repair",
      title: "Broken Heater",
      min: 3,
      level: "B1",
      start: "n1",
      nodes: {
        n1: { text: "Heater stopped in winter.", es: "Calefacción rota.", choices: [
          { label: "Email with photos", next: "n2", vocab: ["The heater isn't working. I've attached photos."] },
          { label: "Call now", next: "n2", vocab: ["Hi, this is apt 3B. The heater stopped working."] },
        ]},
        n2: { text: "Someone can come Thursday — four days.", es: "Vienen el jueves.", choices: [
          { label: "Negotiate sooner", next: "n3", vocab: ["Is there any way to get someone sooner? It's quite cold."] },
          { label: "Buy space heater", next: "n4", vocab: ["I'll get a space heater. Please confirm Thursday."] },
        ]},
        n3: { text: "They can do tomorrow if you're home before five.", es: "Mañana si estás antes de las 5.", choices: [
          { label: "Confirm time", next: "n5", vocab: ["I'll be home by four thirty."] },
          { label: "Ask for key access", next: "n5", vocab: ["Can maintenance enter with the building key?"] },
        ]},
        n4: { text: "Landlord asks for receipt for reimbursement.", es: "Piden recibo.", choices: [
          { label: "Keep receipt", next: "n5", vocab: ["I'll send the receipt when I buy it."] },
        ]},
        n5: { text: "Repair fixed. Apartment warm again.", es: "Arreglado.", choices: [
          { label: "Thank in writing", next: "end-good", vocab: ["Thanks for sending someone quickly."] },
          { label: "Report draft", next: "end-ok", vocab: ["There's still a draft by the window."] },
        ]},
        "end-good": { text: "Polite urgency works.", es: "Vienen mañana.", ending: true, score: 3 },
        "end-ok": { text: "Warm enough. Document everything.", es: "Calor temporal.", ending: true, score: 2 },
        "end-bad": { text: "Stay professional always.", es: "Relación dañada.", ending: true, score: 1 },
      },
    },
    {
      id: "restaurant-allergy",
      title: "Allergy at Dinner",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Allergic to nuts. Menu doesn't say about the sauce.", es: "Alergia a frutos secos.", choices: [
          { label: "Ask server", next: "n2", vocab: ["Does this dish contain nuts or nut oil?"] },
          { label: "Order plain chicken", next: "n3", vocab: ["I'll have the grilled chicken, plain."] },
        ]},
        n2: { text: "Kitchen says sauce has almond.", es: "Salsa con almendra.", choices: [
          { label: "Reorder safely", next: "n4", vocab: ["Thank you. I'll have the salmon without sauce."] },
          { label: "Risk it", next: "end-bad", vocab: ["Maybe just a little is OK."] },
        ]},
        n3: { text: "Server confirms no nuts in plain chicken.", es: "Pollo sin frutos secos.", choices: [
          { label: "Double-check grill", next: "n4", vocab: ["Is the grill cleaned for allergens?"] },
          { label: "Trust menu", next: "n4", vocab: ["Perfect, thank you."] },
        ]},
        n4: { text: "Meal arrives. Looks safe.", es: "Plato llega.", choices: [
          { label: "Thank chef", next: "n5", vocab: ["Please thank the chef for checking."] },
          { label: "Eat quietly", next: "n5", vocab: ["Looks great."] },
        ]},
        n5: { text: "Dessert menu — chocolate mousse.", es: "Postre: mousse.", choices: [
          { label: "Ask again", next: "end-good", vocab: ["Is the mousse nut-free?"] },
          { label: "Skip dessert", next: "end-ok", vocab: ["Just the check, please."] },
        ]},
        "end-good": { text: "Great meal, no reaction. Always ask.", es: "Cena perfecta.", ending: true, score: 3 },
        "end-ok": { text: "Safe and simple.", es: "Seguro y simple.", ending: true, score: 2 },
        "end-bad": { text: "Never risk allergies.", es: "Reacción alérgica.", ending: true, score: 1 },
      },
    },
    {
      id: "team-conflict",
      title: "Team Disagreement",
      min: 4,
      level: "B2",
      start: "n1",
      nodes: {
        n1: { text: "You disagree with a colleague in a meeting.", es: "Discrepas en público.", choices: [
          { label: "State facts calmly", next: "n2", vocab: ["I see it differently. The data from last sprint suggests…"] },
          { label: "Stay silent", next: "n3", vocab: ["I'll think about it and follow up."] },
        ]},
        n2: { text: "Colleague gets defensive. Manager watches.", es: "Colega a la defensiva.", choices: [
          { label: "Propose offline sync", next: "n4", vocab: ["Let's take this offline and compare notes."] },
          { label: "Push harder", next: "n5", vocab: ["You're wrong. The numbers are clear."] },
        ]},
        n3: { text: "Manager asks why you stayed quiet.", es: "Manager pregunta.", choices: [
          { label: "Explain diplomatically", next: "n4", vocab: ["I wanted to avoid derailing the meeting. Happy to discuss now."] },
          { label: "Say you agreed", next: "n5", vocab: ["I actually agreed with the plan."] },
        ]},
        n4: { text: "1:1 with colleague tomorrow.", es: "1:1 mañana.", choices: [
          { label: "Prepare shared doc", next: "n6", vocab: ["I'll share a doc with both views before we meet."] },
          { label: "Wing it", next: "n6", vocab: ["Let's just talk it through."] },
        ]},
        n5: { text: "Meeting ends awkwardly.", es: "Reunión incómoda.", choices: [
          { label: "Send repair email", next: "n6", vocab: ["I was blunt — let's find a path forward."] },
          { label: "Do nothing", next: "end-bad", vocab: ["…"] },
        ]},
        n6: { text: "You align on a hybrid approach.", es: "Acuerdan enfoque híbrido.", choices: [
          { label: "Summarize in writing", next: "end-good", vocab: ["I'll recap what we agreed in Slack."] },
          { label: "Verbal only", next: "end-ok", vocab: ["Sounds good — let's try it this sprint."] },
        ]},
        "end-good": { text: "Professional conflict done right.", es: "Resuelto en privado.", ending: true, score: 3 },
        "end-ok": { text: "Manager appreciates your timing.", es: "Timing diplomático.", ending: true, score: 2 },
        "end-bad": { text: "Facts without empathy backfire.", es: "Confianza dañada.", ending: true, score: 1 },
      },
    },
    {
      id: "flight-delay",
      title: "Delayed Flight",
      min: 2,
      level: "A2",
      start: "n1",
      nodes: {
        n1: { text: "Flight delayed three hours. Meeting tomorrow morning.", es: "Vuelo retrasado 3 h.", choices: [
          { label: "Ask rebooking", next: "n2", vocab: ["Can you help me rebook?"] },
          { label: "Email team", next: "n3", vocab: ["I'll notify my team."] },
        ]},
        n2: { text: "Seat on another airline in two hours — with fee.", es: "Otra aerolínea en 2 h.", choices: [
          { label: "Pay fee", next: "n4", vocab: ["I'll take it. How much is the fee?"] },
          { label: "Wait original", next: "n3", vocab: ["I'll wait for the original flight."] },
        ]},
        n3: { text: "Manager: 'Do what you can.'", es: "Jefe: haz lo que puedas.", choices: [
          { label: "Book hotel", next: "n5", vocab: ["I'll find a hotel near the airport."] },
          { label: "Sleep at gate", next: "n6", vocab: ["I'll try to rest here."] },
        ]},
        n4: { text: "New ticket confirmed. Old bag must transfer.", es: "Nuevo boleto; equipaje.", choices: [
          { label: "Confirm bags", next: "n7", vocab: ["Will my checked bag transfer automatically?"] },
          { label: "Assume OK", next: "n7", vocab: ["Great, thanks."] },
        ]},
        n5: { text: "Colleague offers couch.", es: "Colega ofrece sofá.", choices: [
          { label: "Accept", next: "end-good", vocab: ["That's incredibly kind. I'll buy dinner."] },
          { label: "Hotel anyway", next: "end-ok", vocab: ["I'll take a room and expense it."] },
        ]},
        n6: { text: "Security asks you to move.", es: "Seguridad te mueve.", choices: [
          { label: "Quiet zone", next: "end-ok", vocab: ["Is there a quiet area I can use?"] },
          { label: "Get hotel", next: "end-bad", vocab: ["Fine, I'll get a hotel."] },
        ]},
        n7: { text: "You land with time to spare.", es: "Aterrizas a tiempo.", choices: [
          { label: "Text team", next: "end-good", vocab: ["Landed — I'll be at the meeting."] },
        ]},
        "end-good": { text: "Meeting saved. Crisis handled.", es: "Llegas a tiempo.", ending: true, score: 3 },
        "end-ok": { text: "Tired but present.", es: "Cansado pero avisaste.", ending: true, score: 2 },
        "end-bad": { text: "Backup plans matter.", es: "Pierdes la reunión.", ending: true, score: 1 },
      },
    },
  ];

  const ids = new Set(deepCompact.map((s) => s.id));
  ENLAB.branchStories = ENLAB.branchStories.filter((s) => !ids.has(s.id));
  ENLAB.branchStories.push(...deepCompact);
})();
