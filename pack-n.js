/* Lote N: +20 pasajes de escucha + mini-podcasts ~60 s con transcripción */
window.ENLAB = window.ENLAB || {};

(ENLAB.listenPassages = ENLAB.listenPassages || []).push(
  {
    min: 1,
    title: "Check-in online",
    text: "Your flight leaves at six fifteen. Online check-in opens twenty-four hours before. Have your passport ready. Boarding starts at gate twelve at five thirty.",
    qs: [
      { q: "¿A qué hora sale el vuelo?", a: "six fifteen", opts: ["four fifteen", "six fifteen", "six fifty"] },
      { q: "¿Cuándo abre check-in?", a: "twenty-four hours before", opts: ["one hour before", "twenty-four hours before", "at the gate"] },
      { q: "¿Dónde embarcan?", a: "gate twelve", opts: ["gate two", "gate twelve", "terminal one only"] },
    ],
  },
  {
    min: 1,
    title: "Tienda de conveniencia",
    text: "Welcome. If you buy two coffees, the second one is half price. We close at eleven tonight. Card or cash is fine.",
    qs: [
      { q: "¿Promoción?", a: "second one is half price", opts: ["free coffee", "second one is half price", "no discount"] },
      { q: "¿Cierran?", a: "at eleven", opts: ["at nine", "at eleven", "never"] },
      { q: "¿Formas de pago?", a: "Card or cash", opts: ["cash only", "Card or cash", "crypto only"] },
    ],
  },
  {
    min: 1,
    title: "Gimnasio",
    text: "Hi. First time here? Show your ID at the desk. Towels are free. Please wipe the machines after use. The pool closes at nine.",
    qs: [
      { q: "¿Qué muestras?", a: "your ID", opts: ["a ticket", "your ID", "a doctor note only"] },
      { q: "¿Toallas?", a: "free", opts: ["five dollars", "free", "not available"] },
      { q: "¿Piscina?", a: "closes at nine", opts: ["open all night", "closes at nine", "members only forever"] },
    ],
  },
  {
    min: 2,
    title: "Entrega paquete",
    text: "Good afternoon. I have a package for apartment three B. Someone needs to sign. If you're not home, we can leave it with a neighbor or come back tomorrow morning.",
    qs: [
      { q: "¿Para dónde?", a: "apartment three B", opts: ["apartment one A", "apartment three B", "the office"] },
      { q: "¿Qué necesitan?", a: "Someone needs to sign", opts: ["cash only", "Someone needs to sign", "a password"] },
      { q: "Alternativa?", a: "come back tomorrow morning", opts: ["throw it away", "come back tomorrow morning", "open the door yourself"] },
    ],
  },
  {
    min: 2,
    title: "Clase de yoga",
    text: "Class starts in five minutes. Grab a mat by the wall. Turn your phone off. If you're new, go easy and listen to your body. Water breaks are welcome.",
    qs: [
      { q: "¿Cuándo empieza?", a: "in five minutes", opts: ["in five minutes", "in an hour", "yesterday"] },
      { q: "¿Teléfono?", a: "Turn your phone off", opts: ["record the class", "Turn your phone off", "call the teacher"] },
      { q: "¿Consejo a nuevos?", a: "go easy", opts: ["push hard always", "go easy", "leave immediately"] },
    ],
  },
  {
    min: 2,
    title: "Museo audio guía",
    text: "Welcome to the modern art wing. Audio guides are included with your ticket. Exhibit three closes for cleaning at four. Photography without flash is allowed.",
    qs: [
      { q: "¿Audio guía?", a: "included with your ticket", opts: ["not available", "included with your ticket", "only for kids"] },
      { q: "¿Exhibit three?", a: "closes for cleaning at four", opts: ["open all night", "closes for cleaning at four", "moved outside"] },
      { q: "¿Fotos?", a: "without flash is allowed", opts: ["not allowed", "without flash is allowed", "video only"] },
    ],
  },
  {
    min: 3,
    title: "Stand-up equipo",
    text: "Quick stand-up. Yesterday I finished the API docs. Today I'll pair on the login bug. I'm blocked on staging access — can someone grant it? No other risks.",
    qs: [
      { q: "¿Qué terminó ayer?", a: "the API docs", opts: ["the API docs", "vacation", "nothing"] },
      { q: "¿Hoy?", a: "pair on the login bug", opts: ["quit", "pair on the login bug", "deploy prod alone"] },
      { q: "¿Bloqueo?", a: "staging access", opts: ["coffee", "staging access", "weather"] },
    ],
  },
  {
    min: 3,
    title: "Entrevista telefónica",
    text: "Thanks for taking my call. This role is remote-first with two days in office optional. Salary band is seventy to eighty-five. Next step is a technical interview with the team lead.",
    qs: [
      { q: "¿Modalidad?", a: "remote-first", opts: ["office only", "remote-first", "travel always"] },
      { q: "¿Salario?", a: "seventy to eighty-five", opts: ["ten to twenty", "seventy to eighty-five", "not discussed"] },
      { q: "¿Siguiente paso?", a: "technical interview", opts: ["start tomorrow", "technical interview", "sign now"] },
    ],
  },
  {
    min: 3,
    title: "Clima y retraso",
    text: "Attention passengers. Due to weather in Chicago, flight four oh two is delayed two hours. We'll update gate information at six. Meal vouchers are at the service desk.",
    qs: [
      { q: "¿Por qué retraso?", a: "weather in Chicago", opts: ["strike", "weather in Chicago", "party on board"] },
      { q: "¿Cuánto?", a: "two hours", opts: ["two minutes", "two hours", "two days"] },
      { q: "¿Vouchers?", a: "at the service desk", opts: ["on the plane", "at the service desk", "online only"] },
    ],
  },
  {
    min: 3,
    title: "Podcast negocios",
    text: "Leaders fail when they confuse busy with productive. Protect two hours for deep work. Say no to meetings without an agenda. Your team will thank you.",
    qs: [
      { q: "¿Error de líderes?", a: "busy with productive", opts: ["too much sleep", "busy with productive", "too many vacations"] },
      { q: "¿Proteger?", a: "two hours for deep work", opts: ["lunch only", "two hours for deep work", "social media"] },
      { q: "¿Reuniones?", a: "without an agenda", opts: ["all day", "without an agenda", "never"] },
    ],
  },
  {
    min: 4,
    title: "Contrato freelance",
    text: "The statement of work covers design and front-end through March. Revisions beyond two rounds are billed hourly. IP transfers on final payment. Net thirty terms apply.",
    qs: [
      { q: "¿Alcance?", a: "design and front-end through March", opts: ["legal only", "design and front-end through March", "hardware"] },
      { q: "¿Revisiones extra?", a: "billed hourly", opts: ["free forever", "billed hourly", "not allowed"] },
      { q: "¿IP?", a: "on final payment", opts: ["never", "on final payment", "day one"] },
    ],
  },
  {
    min: 4,
    title: "Conferencia médica",
    text: "The study followed twelve hundred patients for eighteen months. The treatment group showed a twenty percent reduction in symptoms. Side effects were mild and reversible.",
    qs: [
      { q: "¿Pacientes?", a: "twelve hundred", opts: ["twelve", "twelve hundred", "twelve million"] },
      { q: "¿Resultado?", a: "twenty percent reduction", opts: ["no change", "twenty percent reduction", "worse symptoms"] },
      { q: "¿Efectos?", a: "mild and reversible", opts: ["fatal always", "mild and reversible", "unknown"] },
    ],
  },
  {
    min: 4,
    title: "Debate panel",
    text: "I disagree with the premise. Correlation isn't causation here. We'd need a controlled trial before changing policy. That said, the trend is worth monitoring closely.",
    qs: [
      { q: "¿Objeción?", a: "Correlation isn't causation", opts: ["I agree fully", "Correlation isn't causation", "no data exists"] },
      { q: "¿Antes de política?", a: "controlled trial", opts: ["a tweet", "controlled trial", "nothing"] },
      { q: "¿Concesión?", a: "worth monitoring", opts: ["ignore it", "worth monitoring", "panic now"] },
    ],
  },
  {
    min: 4,
    title: "Noticias locales",
    text: "City council approved the bike lane expansion last night. Construction begins in April and may affect parking on Main for six weeks. A public meeting is scheduled for March tenth.",
    qs: [
      { q: "¿Qué aprobaron?", a: "bike lane expansion", opts: ["a mall", "bike lane expansion", "airport closure"] },
      { q: "¿Cuándo obra?", a: "April", opts: ["April", "next decade", "never"] },
      { q: "¿Reunión pública?", a: "March tenth", opts: ["March tenth", "yesterday only", "secret"] },
    ],
  },
  {
    min: 2,
    title: "Room service",
    text: "Room service. You ordered soup and a salad. That'll be twenty-two dollars plus tip. I'll leave it on the table. Call extension four if you need anything else.",
    qs: [
      { q: "¿Pedido?", a: "soup and a salad", opts: ["pizza only", "soup and a salad", "breakfast"] },
      { q: "¿Precio?", a: "twenty-two dollars", opts: ["free", "twenty-two dollars", "two hundred"] },
      { q: "¿Más ayuda?", a: "extension four", opts: ["extension four", "shout loudly", "email only"] },
    ],
  },
  {
    min: 2,
    title: "Tour ciudad",
    text: "We meet at the fountain at nine sharp. The walking tour lasts ninety minutes. Wear comfortable shoes. Rain or shine, we go — umbrellas sold at the kiosk.",
    qs: [
      { q: "¿Punto de encuentro?", a: "the fountain", opts: ["the airport", "the fountain", "your hotel room"] },
      { q: "¿Duración?", a: "ninety minutes", opts: ["nine minutes", "ninety minutes", "all day"] },
      { q: "¿Lluvia?", a: "Rain or shine, we go", opts: ["cancel always", "Rain or shine, we go", "indoors only"] },
    ],
  },
  {
    min: 3,
    title: "Soporte SaaS",
    text: "We've identified the outage as a bad deploy. Rollback completed at two fourteen UTC. All services are green. A postmortem will be published within forty-eight hours.",
    qs: [
      { q: "¿Causa?", a: "a bad deploy", opts: ["hackers only", "a bad deploy", "user error always"] },
      { q: "¿Estado?", a: "All services are green", opts: ["still down", "All services are green", "unknown"] },
      { q: "¿Postmortem?", a: "within forty-eight hours", opts: ["never", "within forty-eight hours", "in five years"] },
    ],
  },
  {
    min: 3,
    title: "Universidad orientación",
    text: "Welcome freshmen. Register for at least twelve credits by Friday. Your advisor's email is on the portal. Plagiarism policy is strict — cite every source.",
    qs: [
      { q: "¿Créditos mínimos?", a: "twelve", opts: ["two", "twelve", "fifty"] },
      { q: "¿Plazo?", a: "by Friday", opts: ["never", "by Friday", "next year"] },
      { q: "¿Plagiarism?", a: "cite every source", opts: ["ignore it", "cite every source", "copy freely"] },
    ],
  },
  {
    min: 4,
    title: "TED clip habits",
    text: "Identity beats willpower. Don't say you're trying to quit sugar. Say you're someone who doesn't need it. Small wins compound. Environment design beats motivation.",
    qs: [
      { q: "¿Qué gana a willpower?", a: "Identity", opts: ["Luck", "Identity", "Money only"] },
      { q: "¿Ejemplo?", a: "someone who doesn't need it", opts: ["eat more sugar", "someone who doesn't need it", "give up"] },
      { q: "¿Mejor que motivación?", a: "Environment design", opts: ["Environment design", "complaining", "nothing"] },
    ],
  },
  {
    min: 4,
    title: "Negociación salario",
    text: "Based on market data and your experience, we're offering ninety-two base plus ten percent bonus. We can discuss equity at the director level. Benefits start day one.",
    qs: [
      { q: "¿Base?", a: "ninety-two", opts: ["nine", "ninety-two", "nine hundred"] },
      { q: "¿Bonus?", a: "ten percent", opts: ["ten percent", "none", "one hundred percent always"] },
      { q: "¿Benefits?", a: "start day one", opts: ["after one year", "start day one", "never"] },
    ],
  }
);

ENLAB.podcasts = [
  {
    id: "morning-routine",
    title: "Morning routine",
    min: 1,
    duration: "~55 s",
    segments: [
      { en: "Good morning. This is English Lab mini.", es: "Buenos días. Mini de English Lab." },
      { en: "Wake up at the same time.", es: "Levántate a la misma hora." },
      { en: "Drink water before coffee.", es: "Agua antes del café." },
      { en: "Say three things you're grateful for.", es: "Di tres cosas por las que estás agradecido." },
      { en: "Five minutes of English — every day.", es: "Cinco minutos de inglés — cada día." },
    ],
    qs: [
      { q: "¿Antes del café?", a: "Drink water", opts: ["Skip breakfast", "Drink water", "Run ten miles"] },
      { q: "¿Cuánto inglés?", a: "Five minutes", opts: ["Five minutes", "Five hours", "Never"] },
    ],
  },
  {
    id: "airport-hacks",
    title: "Airport hacks",
    min: 2,
    duration: "~58 s",
    segments: [
      { en: "Flying soon? Pack liquids in a clear bag.", es: "¿Vuelas pronto? Líquidos en bolsa transparente." },
      { en: "Wear shoes you can slip off fast.", es: "Zapatos fáciles de quitarte." },
      { en: "Download your boarding pass offline.", es: "Descarga el pase sin internet." },
      { en: "Arrive two hours early for international.", es: "Llega dos horas antes en internacional." },
      { en: "Gate changes happen — check the screens.", es: "Cambian puertas — mira pantallas." },
    ],
    qs: [
      { q: "¿Internacional?", a: "two hours early", opts: ["ten minutes", "two hours early", "never early"] },
      { q: "¿Pase?", a: "Download offline", opts: ["Print only", "Download offline", "Forget it"] },
    ],
  },
  {
    id: "small-talk",
    title: "Small talk weather",
    min: 2,
    duration: "~52 s",
    segments: [
      { en: "Nice weather today, isn't it?", es: "Hace buen tiempo, ¿no?" },
      { en: "Yeah, finally warming up.", es: "Sí, por fin calienta." },
      { en: "Perfect for a walk after work.", es: "Perfecto para caminar después del trabajo." },
      { en: "Do you have any plans this weekend?", es: "¿Planes para el fin de semana?" },
      { en: "I'm thinking farmers market and coffee.", es: "Mercado y café." },
    ],
    qs: [
      { q: "¿Tema?", a: "weather", opts: ["politics", "weather", "taxes"] },
      { q: "¿Fin de semana?", a: "farmers market", opts: ["sleep only", "farmers market", "work always"] },
    ],
  },
  {
    id: "job-interview",
    title: "Interview opener",
    min: 3,
    duration: "~60 s",
    segments: [
      { en: "Tell me about yourself.", es: "Cuéntame de ti." },
      { en: "I'm a developer with five years in fintech.", es: "Desarrollador, cinco años en fintech." },
      { en: "I led a team of four on payments.", es: "Lideré un equipo de cuatro en pagos." },
      { en: "I'm looking for impact and mentorship.", es: "Busco impacto y mentoría." },
      { en: "That's why this role excites me.", es: "Por eso me emociona este puesto." },
    ],
    qs: [
      { q: "¿Experiencia?", a: "five years in fintech", opts: ["no experience", "five years in fintech", "retired"] },
      { q: "¿Equipo?", a: "four", opts: ["four hundred", "four", "zero"] },
    ],
  },
  {
    id: "restaurant-order",
    title: "Ordering food",
    min: 2,
    duration: "~54 s",
    segments: [
      { en: "Table for two, please.", es: "Mesa para dos." },
      { en: "Still or sparkling water?", es: "¿Agua sin gas o con gas?" },
      { en: "I'll have the grilled salmon.", es: "Salmón a la parrilla." },
      { en: "Any allergies we should know?", es: "¿Alergias?" },
      { en: "No nuts, please. That's it for now.", es: "Sin nueces. Por ahora eso." },
    ],
    qs: [
      { q: "¿Plato?", a: "grilled salmon", opts: ["pizza", "grilled salmon", "nothing"] },
      { q: "¿Alergia?", a: "nuts", opts: ["nuts", "water", "chairs"] },
    ],
  },
  {
    id: "slack-etiquette",
    title: "Slack etiquette",
    min: 3,
    duration: "~56 s",
    segments: [
      { en: "Don't @channel for small questions.", es: "No @channel por dudas pequeñas." },
      { en: "Use threads to keep channels clean.", es: "Usa hilos." },
      { en: "Emoji reactions beat 'Thanks!'.", es: "Emoji mejor que 'Thanks!'." },
      { en: "Status: in a meeting — means async OK.", es: "Estado: en reunión = async OK." },
      { en: "When urgent, say why in the first line.", es: "Si es urgente, di por qué arriba." },
    ],
    qs: [
      { q: "¿Canales limpios?", a: "Use threads", opts: ["Spam @channel", "Use threads", "Delete Slack"] },
      { q: "¿Urgente?", a: "say why in the first line", opts: ["caps lock only", "say why in the first line", "send GIFs"] },
    ],
  },
  {
    id: "travel-phrases",
    title: "Travel essentials",
    min: 2,
    duration: "~50 s",
    segments: [
      { en: "Where is the nearest ATM?", es: "¿Cajero más cercano?" },
      { en: "Could you call a taxi, please?", es: "¿Llama un taxi?" },
      { en: "I think I'm lost.", es: "Creo que estoy perdido." },
      { en: "Is this the train to downtown?", es: "¿Este tren va al centro?" },
      { en: "Thank you — you've been very helpful.", es: "Gracias — muy amable." },
    ],
    qs: [
      { q: "¿Perdido?", a: "I'm lost", opts: ["I'm hungry only", "I'm lost", "I'm rich"] },
      { q: "¿Taxi?", a: "call a taxi", opts: ["buy a car", "call a taxi", "run"] },
    ],
  },
  {
    id: "study-tips",
    title: "Study tips",
    min: 2,
    duration: "~57 s",
    segments: [
      { en: "Fifteen minutes beats three hours once a week.", es: "15 min diarios ganan a 3 h una vez." },
      { en: "Review yesterday before new material.", es: "Repasa ayer antes de lo nuevo." },
      { en: "Speak out loud — your mouth needs practice.", es: "Habla en voz alta." },
      { en: "Mix listening, speaking, and tiny quizzes.", es: "Mezcla oír, hablar y mini quiz." },
      { en: "Track streaks, not perfection.", es: "Racha, no perfección." },
    ],
    qs: [
      { q: "¿Mejor hábito?", a: "Fifteen minutes", opts: ["Never study", "Fifteen minutes", "Only apps"] },
      { q: "¿Boca?", a: "Speak out loud", opts: ["Read silently only", "Speak out loud", "Whisper never"] },
    ],
  },
  {
    id: "health-clinic",
    title: "At the clinic",
    min: 3,
    duration: "~59 s",
    segments: [
      { en: "What brings you in today?", es: "¿Qué te trae hoy?" },
      { en: "I've had a sore throat for three days.", es: "Dolor de garganta tres días." },
      { en: "Any fever or cough?", es: "¿Fiebre o tos?" },
      { en: "Low fever at night only.", es: "Fiebre baja solo de noche." },
      { en: "We'll do a quick test and go from there.", es: "Prueba rápida y seguimos." },
    ],
    qs: [
      { q: "¿Síntoma?", a: "sore throat", opts: ["broken leg", "sore throat", "new car"] },
      { q: "¿Fiebre?", a: "at night only", opts: ["never", "at night only", "always 40C"] },
    ],
  },
  {
    id: "negotiation-lite",
    title: "Soft negotiation",
    min: 4,
    duration: "~60 s",
    segments: [
      { en: "We love the proposal.", es: "Nos encanta la propuesta." },
      { en: "Timeline is aggressive for our team.", es: "El timeline es agresivo." },
      { en: "Could we phase delivery over six weeks?", es: "¿Fases en seis semanas?" },
      { en: "That works if we lock scope today.", es: "OK si cerramos alcance hoy." },
      { en: "Agreed — I'll send the revised SOW.", es: "De acuerdo — envío SOW revisado." },
    ],
    qs: [
      { q: "¿Problema?", a: "Timeline is aggressive", opts: ["Price too low", "Timeline is aggressive", "Too easy"] },
      { q: "¿Solución?", a: "phase delivery", opts: ["cancel project", "phase delivery", "double price only"] },
    ],
  },
  {
    id: "kids-english",
    title: "Kids English",
    min: 1,
    duration: "~48 s",
    segments: [
      { en: "Let's play color hunt.", es: "Juego de colores." },
      { en: "Find something red in the room.", es: "Algo rojo." },
      { en: "Great job! Now something blue.", es: "¡Bien! Ahora azul." },
      { en: "Can you say the word out loud?", es: "Di la palabra." },
      { en: "High five — you did it!", es: "¡Choca esos cinco!" },
    ],
    qs: [
      { q: "¿Juego?", a: "color hunt", opts: ["tax forms", "color hunt", "sleep"] },
      { q: "¿Celebración?", a: "High five", opts: ["High five", "Silence", "Run away"] },
    ],
  },
  {
    id: "weekend-reflect",
    title: "Weekend reflect",
    min: 3,
    duration: "~55 s",
    segments: [
      { en: "Friday check-in.", es: "Check-in del viernes." },
      { en: "What went well this week?", es: "¿Qué salió bien?" },
      { en: "What one thing will you improve?", es: "¿Qué mejorarás?" },
      { en: "Who will you thank before Monday?", es: "¿A quién agradecerás?" },
      { en: "Rest counts as progress too.", es: "Descansar también es progreso." },
    ],
    qs: [
      { q: "¿Cuándo?", a: "Friday", opts: ["Never", "Friday", "Only holidays"] },
      { q: "¿Descanso?", a: "counts as progress", opts: ["is lazy", "counts as progress", "is forbidden"] },
    ],
  },
  {
    id: "pharmacy-run",
    title: "Pharmacy run",
    min: 2,
    duration: "~62 s",
    segments: [
      { en: "I need to pick up a prescription.", es: "Voy por una receta." },
      { en: "It's under the name Garcia.", es: "A nombre García." },
      { en: "Do you have insurance?", es: "¿Tienes seguro?" },
      { en: "Yes. Here's my card.", es: "Sí. Aquí está mi tarjeta." },
      { en: "It'll be ready in fifteen minutes.", es: "Listo en quince minutos." },
      { en: "Great. I'll wait over there.", es: "Bien. Espero allá." },
      { en: "Take it twice a day with food.", es: "Dos veces al día con comida." },
    ],
    qs: [
      { q: "¿Nombre?", a: "Garcia", opts: ["Lopez", "Garcia", "Smith"] },
      { q: "¿Cuándo listo?", a: "fifteen minutes", opts: ["five hours", "fifteen minutes", "tomorrow"] },
    ],
  },
  {
    id: "standup-english",
    title: "Stand-up English",
    min: 3,
    duration: "~65 s",
    segments: [
      { en: "Yesterday I finished the login bug.", es: "Ayer terminé el bug de login." },
      { en: "Today I'll pair on the API docs.", es: "Hoy hago pair en docs de API." },
      { en: "I'm blocked on staging access.", es: "Estoy bloqueado en staging." },
      { en: "Can someone grant it this morning?", es: "¿Alguien me da acceso esta mañana?" },
      { en: "I'll update the channel when it's green.", es: "Actualizo el canal cuando esté verde." },
      { en: "No other risks. That's it from me.", es: "Sin más riesgos. Eso es todo." },
    ],
    qs: [
      { q: "¿Bloqueo?", a: "staging access", opts: ["coffee", "staging access", "vacation"] },
      { q: "¿Hoy?", a: "pair on the API docs", opts: ["quit", "pair on the API docs", "deploy prod alone"] },
    ],
  },
];
