/* Lote Q: modo viaje — mapas del día (aeropuerto, hotel, ciudad, emergencia) */
window.ENLAB = window.ENLAB || {};

ENLAB.travelThemes = ["airport", "hotel", "city", "emergency", "restaurant"];

ENLAB.travelMaps = {
  airport: {
    title: "Aeropuerto",
    emoji: "✈️",
    intro: "Del mostrador al embarque: frases que usarás hoy.",
    steps: [
      { id: "checkin", label: "Check-in", en: "I'd like to check in for flight four two one.", es: "Quiero facturar el vuelo 421.", tip: "Have passport ready." },
      { id: "bag", label: "Equipaje", en: "Is this bag carry-on or checked?", es: "¿Equipaje de mano o documentado?", tip: "Weight limits vary." },
      { id: "security", label: "Seguridad", en: "Do I need to take my laptop out?", es: "¿Sacar la laptop?", tip: "Shoes off, liquids in bag." },
      { id: "gate", label: "Puerta", en: "Which gate is the flight to Miami?", es: "¿Puerta del vuelo a Miami?", tip: "Screens update often." },
      { id: "board", label: "Embarque", en: "We're now boarding group two.", es: "Embarque grupo dos.", tip: "Listen for your group." },
      { id: "delay", label: "Retraso", en: "How long is the delay?", es: "¿Cuánto dura el retraso?", tip: "Ask about vouchers." },
    ],
  },
  hotel: {
    title: "Hotel",
    emoji: "🏨",
    intro: "Llegada, habitación y problemas típicos.",
    steps: [
      { id: "res", label: "Reserva", en: "I have a reservation under García.", es: "Reserva a nombre García.", tip: "Confirmation number helps." },
      { id: "room", label: "Habitación", en: "Could we get a quiet room, please?", es: "¿Habitación tranquila?", tip: "High floor = less noise." },
      { id: "wifi", label: "Wi‑Fi", en: "What's the Wi‑Fi password?", es: "¿Contraseña del Wi‑Fi?", tip: "Often on key card sleeve." },
      { id: "breakfast", label: "Desayuno", en: "What time is breakfast served?", es: "¿Horario del desayuno?", tip: "Ask if included." },
      { id: "issue", label: "Problema", en: "The air conditioning isn't working.", es: "El aire no funciona.", tip: "Polite but clear." },
      { id: "checkout", label: "Salida", en: "Could I have a late checkout?", es: "¿Late checkout?", tip: "Ask the night before." },
    ],
  },
  city: {
    title: "Ciudad",
    emoji: "🗺️",
    intro: "Moverte, comer y preguntar sin perder tiempo.",
    steps: [
      { id: "directions", label: "Direcciones", en: "How do I get to the museum from here?", es: "¿Cómo llego al museo?", tip: "Repeat key street names." },
      { id: "transit", label: "Transporte", en: "Which line goes to downtown?", es: "¿Qué línea va al centro?", tip: "Buy day pass if busy." },
      { id: "food", label: "Comida", en: "Is there a good café nearby?", es: "¿Café cerca?", tip: "locals not tourists" },
      { id: "pay", label: "Pago", en: "Do you take contactless?", es: "¿Contactless?", tip: "Tap to pay common." },
      { id: "photo", label: "Foto", en: "Would you mind taking our picture?", es: "¿Nos tomas una foto?", tip: "Offer to return favor." },
      { id: "tip", label: "Propina", en: "Is tip included?", es: "¿Propina incluida?", tip: "Varies by country." },
    ],
  },
  emergency: {
    title: "Emergencia",
    emoji: "🆘",
    intro: "Calma, claridad y números útiles.",
    steps: [
      { id: "help", label: "Ayuda", en: "I need help — it's an emergency.", es: "Necesito ayuda — emergencia.", tip: "Stay calm, speak slowly." },
      { id: "police", label: "Policía", en: "I'd like to report a theft.", es: "Quiero reportar un robo.", tip: "Keep copies of ID." },
      { id: "medical", label: "Médico", en: "I need a doctor. I'm allergic to penicillin.", es: "Necesito médico. Alergia a penicilina.", tip: "List allergies clearly." },
      { id: "lost", label: "Perdido", en: "I think I'm lost. Can you show me on the map?", es: "Estoy perdido. ¿En el mapa?", tip: "Landmarks help." },
      { id: "pharmacy", label: "Farmacia", en: "Where is the nearest pharmacy?", es: "¿Farmacia más cercana?", tip: "Open late varies." },
      { id: "embassy", label: "Embajada", en: "I need to contact my embassy.", es: "Contactar mi embajada.", tip: "Save number offline." },
    ],
  },
  restaurant: {
    title: "Restaurante en viaje",
    emoji: "🍽️",
    intro: "Pedir, alergias y cuenta en otro país.",
    steps: [
      { id: "table", label: "Mesa", en: "A table for two, please.", es: "Mesa para dos.", tip: "Reserve on weekends." },
      { id: "menu", label: "Menú", en: "Can I see the menu?", es: "¿Me das el menú?", tip: "Ask about specials." },
      { id: "order", label: "Pedir", en: "I'd like the grilled salmon.", es: "Salmón a la parrilla.", tip: "Point if needed." },
      { id: "allergy", label: "Alergia", en: "I'm allergic to nuts.", es: "Alergia a nueces.", tip: "Say it clearly." },
      { id: "bill", label: "Cuenta", en: "The check, please.", es: "La cuenta.", tip: "Tip rules vary." },
      { id: "doggy", label: "Para llevar", en: "Could I get this to go?", es: "¿Me lo empacas?", tip: "Common in the US." },
    ],
  },
};

ENLAB.travelExtras = [
  { min: 1, en: "Excuse me, where is the restroom?", es: "¿Baños?" },
  { min: 1, en: "Could you speak a little slower, please?", es: "¿Más despacio?" },
  { min: 2, en: "How much does this cost?", es: "¿Cuánto cuesta?" },
  { min: 2, en: "I'll pay by card.", es: "Pago con tarjeta." },
  { min: 3, en: "Could you write that down for me?", es: "¿Lo escribes?" },
  { min: 3, en: "Is it within walking distance?", es: "¿Se puede ir caminando?" },
  { min: 4, en: "I'd like to file a complaint, please.", es: "Quiero poner una queja." },
  { min: 2, en: "Do you accept contactless payment?", es: "¿Aceptan contactless?" },
  { min: 2, en: "I'm here on business.", es: "Estoy aquí por trabajo." },
  { min: 3, en: "Can you recommend a safe area?", es: "¿Recomiendas una zona segura?" },
  { min: 1, en: "Thank you for your help.", es: "Gracias por su ayuda." },
  { min: 3, en: "I need a receipt for my company.", es: "Necesito factura para mi empresa." },
];
