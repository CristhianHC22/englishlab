/* Extra: colocación CEFR, pares duros, role-plays ramificados */
window.ENLAB = window.ENLAB || {};

ENLAB.placementItems = [
  { min: 1, q: "How ___ you?", a: "are", opts: ["is", "are", "be"], prompt: "A1 · be", say: "How are you?", why: "I am / you are / she is." },
  { min: 1, q: "I ___ a coffee.", a: "want", opts: ["want", "wanting", "wanted"], prompt: "A1 · presente", say: "I want a coffee.", why: "Presente simple para deseos ahora." },
  { min: 1, q: "___ is your name?", a: "What", opts: ["Who", "What", "Where"], prompt: "A1 · pregunta", say: "What is your name?", why: "What = qué; Who = quién." },
  { min: 1, q: "There ___ two chairs.", a: "are", opts: ["is", "are", "have"], prompt: "A1 · there is/are", say: "There are two chairs.", why: "Plural → there are." },
  { min: 1, q: "She ___ to work.", a: "goes", opts: ["go", "goes", "going"], prompt: "A1 · 3ª persona", say: "She goes to work.", why: "He/she/it + -s." },
  { min: 2, q: "I ___ to the shop yesterday.", a: "went", opts: ["go", "goed", "went"], prompt: "A2 · pasado", say: "I went to the shop yesterday.", why: "go → went." },
  { min: 2, q: "___ you like tea?", a: "Do", opts: ["Are", "Do", "Have"], prompt: "A2 · Do you…?", say: "Do you like tea?", why: "Like es verbo; se pregunta con Do." },
  { min: 2, q: "I'm ___ the bus.", a: "on", opts: ["in", "on", "at"], prompt: "A2 · in/on/at", say: "I'm on the bus.", why: "on the bus / train." },
  { min: 2, q: "Can you ___ me a hand?", a: "give", opts: ["make", "give", "do"], prompt: "A2 · collocation", say: "Can you give me a hand?", why: "give me a hand, no make." },
  { min: 2, q: "I've ___ that film.", a: "seen", opts: ["saw", "seen", "see"], prompt: "A2 · present perfect", say: "I've seen that film.", why: "have + participio (seen)." },
  { min: 3, q: "If it rains, I ___ stay in.", a: "will", opts: ["will", "would", "won't to"], prompt: "B1 · 1st conditional", say: "If it rains, I will stay in.", why: "if + present, will." },
  { min: 3, q: "Could you ___ the deadline?", a: "push", opts: ["push", "put", "make"], prompt: "B1 · phrasal", say: "Could you push the deadline?", why: "push = mover la fecha." },
  { min: 3, q: "I wish I ___ more time.", a: "had", opts: ["have", "had", "would have"], prompt: "B1 · wish", say: "I wish I had more time.", why: "wish + pasado." },
  { min: 3, q: "She's in charge ___ the launch.", a: "of", opts: ["of", "for", "to"], prompt: "B1 · preposición", say: "She's in charge of the launch.", why: "in charge of." },
  { min: 3, q: "I'll get ___ to you today.", a: "back", opts: ["back", "up", "off"], prompt: "B1 · get back", say: "I'll get back to you today.", why: "get back to = responder." },
  { min: 4, q: "Had I known, I ___ have called.", a: "would", opts: ["will", "would", "can"], prompt: "B2 · inversión", say: "Had I known, I would have called.", why: "Had I known = If I had known." },
  { min: 4, q: "The issue was ___ by QA.", a: "flagged", opts: ["flagged", "flag", "flagging"], prompt: "B2 · pasiva", say: "The issue was flagged by QA.", why: "was + participio." },
  { min: 4, q: "I'd rather you ___ now.", a: "didn't", opts: ["don't", "didn't", "not"], prompt: "B2 · I'd rather you", say: "I'd rather you didn't smoke now.", why: "I'd rather + pasado." },
  { min: 4, q: "Neither option ___ ideal.", a: "is", opts: ["are", "is", "be"], prompt: "B2 · neither", say: "Neither option is ideal.", why: "neither + singular." },
  { min: 4, q: "We're ___ to ship on Friday.", a: "due", opts: ["due", "owed", "debt"], prompt: "B2 · due to", say: "We're due to ship on Friday.", why: "be due to + verb = previsto." },
];

(ENLAB.minimalPairs = ENLAB.minimalPairs || []).push(
  { a: "thin", b: "tin", ipaA: "/θɪn/", ipaB: "/tɪn/", sayA: "thin", sayB: "tin", hint: "/θ/ vs /t/ — lengua entre dientes", min: 2 },
  { a: "this", b: "dis", ipaA: "/ðɪs/", ipaB: "/dɪs/", sayA: "this", sayB: "dis", hint: "/ð/ sonora vs /d/", min: 2 },
  { a: "van", b: "ban", ipaA: "/væn/", ipaB: "/bæn/", sayA: "van", sayB: "ban", hint: "/v/ labiodental vs /b/", min: 2 },
  { a: "very", b: "berry", ipaA: "/ˈveri/", ipaB: "/ˈberi/", sayA: "very", sayB: "berry", hint: "v vs b al inicio", min: 2 },
  { a: "ship", b: "chip", ipaA: "/ʃɪp/", ipaB: "/tʃɪp/", sayA: "ship", sayB: "chip", hint: "/ʃ/ vs /tʃ/", min: 2 },
  { a: "wash", b: "watch", ipaA: "/wɑʃ/", ipaB: "/wɑtʃ/", sayA: "wash", sayB: "watch", hint: "final /ʃ/ vs /tʃ/", min: 2 },
  { a: "cot", b: "caught", ipaA: "/kɑt/", ipaB: "/kɔːt/", sayA: "cot", sayB: "caught", hint: "US cot–caught: /ɑ/ vs /ɔ/", min: 3 },
  { a: "staff", b: "starf", ipaA: "/stæf/", ipaB: "/stɑːf/", sayA: "staff", sayB: "staff", hint: "US /æ/ vs UK /ɑː/ en staff", min: 3 }
);

(ENLAB.roleplays = ENLAB.roleplays || []).push(
  {
    id: "branch-late",
    min: 2,
    title: "Llegas tarde (ramas)",
    es: "Elige cómo responder. Tres giros.",
    turns: [
      { a: "You're late. What happened?", b: "Sorry — the train was delayed.", bOpts: ["Sorry — the train was delayed.", "Traffic was terrible. I should have left earlier.", "I lost track of time. It won't happen again."] },
      { a: "Can you still join the meeting?", b: "Yes. Give me two minutes to sit down.", bOpts: ["Yes. Give me two minutes to sit down.", "I'll join on video from the lobby.", "Start without me; I'll catch up."] },
      { a: "Please message next time.", b: "Will do. Thanks for waiting.", bOpts: ["Will do. Thanks for waiting.", "Understood. I'll text if I'm running late.", "Fair point. I'll set an earlier alarm."] },
    ],
  },
  {
    id: "branch-feedback",
    min: 3,
    title: "Feedback difícil (ramas)",
    es: "Tu manager comenta un error. Tú eliges el tono.",
    turns: [
      { a: "This report missed the deadline. Walk me through it.", b: "I underestimated the data cleanup. Here's my plan.", bOpts: ["I underestimated the data cleanup. Here's my plan.", "I should have flagged the blocker on Monday.", "You're right. I dropped the ball and I own it."] },
      { a: "What changes next week?", b: "I'll send a mid-week checkpoint so we can adjust.", bOpts: ["I'll send a mid-week checkpoint so we can adjust.", "I'll pair with Ana on the numbers before I write.", "I'll cut scope if the data is late again."] },
      { a: "Anything you need from me?", b: "A clearer priority if two launches collide.", bOpts: ["A clearer priority if two launches collide.", "Fifteen minutes on Wednesday to review a draft.", "Nothing right now — I'll update you Friday."] },
    ],
  },
  {
    id: "branch-hotel",
    min: 2,
    title: "Hotel: problema (ramas)",
    es: "Recepción. Tú pides una solución.",
    turns: [
      { a: "How can I help you?", b: "The air conditioning in 412 isn't working.", bOpts: ["The air conditioning in 412 isn't working.", "Could I change rooms? The street is too loud.", "I think you charged me twice for parking."] },
      { a: "I'm sorry about that. What would you prefer?", b: "A quieter room if you have one tonight.", bOpts: ["A quieter room if you have one tonight.", "A fan and a discount on tonight is fine.", "Just send maintenance as soon as you can."] },
      { a: "I can do that. Anything else?", b: "Could breakfast start at seven instead of eight?", bOpts: ["Could breakfast start at seven instead of eight?", "No, that's all. Thank you.", "A late checkout would help a lot."] },
    ],
  }
);
