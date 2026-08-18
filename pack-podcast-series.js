/* Podcast series 3×3 — work, travel, interview + cumulative quiz */
window.ENLAB = window.ENLAB || {};

(function () {
  const SERIES = [
    {
      id: "series-work",
      title: "Work week",
      titleEs: "Semana de trabajo",
      min: 3,
      episodes: ["work-feedback", "work-deadline", "work-onboarding"],
      seriesQs: [
        { q: "Across the series: what do you do before stand-up if blocked?", a: "say so before stand-up", opts: ["hide it", "say so before stand-up", "quit"] },
        { q: "Launch moved — what can wait?", a: "Analytics", opts: ["Payments", "Analytics", "Login"] },
        { q: "New hire tip from onboarding?", a: "ask questions early", opts: ["stay silent", "ask questions early", "skip docs"] },
      ],
    },
    {
      id: "series-travel",
      title: "Travel trio",
      titleEs: "Viaje en 3 partes",
      min: 2,
      episodes: ["travel-check-in", "travel-customs", "travel-lost-bag"],
      seriesQs: [
        { q: "At check-in you might ask for…", a: "a window seat", opts: ["free hotel", "a window seat", "a refund"] },
        { q: "Customs: declare or…", a: "answer honestly", opts: ["run", "answer honestly", "ignore"] },
        { q: "Lost bag — first step?", a: "file a report", opts: ["buy new clothes", "file a report", "leave airport"] },
      ],
    },
    {
      id: "series-interview",
      title: "Interview arc",
      titleEs: "Arco entrevista",
      min: 3,
      episodes: ["job-interview", "work-client-call", "work-promotion"],
      seriesQs: [
        { q: "Interview: strength answer uses…", a: "a concrete example", opts: ["a joke", "a concrete example", "silence"] },
        { q: "Client call: if unclear, you…", a: "repeat back requirements", opts: ["guess", "repeat back requirements", "hang up"] },
        { q: "Promotion talk: anchor with…", a: "recent impact", opts: ["complaints", "recent impact", "gossip"] },
      ],
    },
  ];

  ENLAB.podcastSeries = SERIES;
  const byId = Object.fromEntries((ENLAB.podcasts || []).map((p) => [p.id, p]));
  SERIES.forEach((s) => {
    s.episodes.forEach((id, i) => {
      const p = byId[id];
      if (p) {
        p.series = s.id;
        p.seriesEp = i + 1;
        p.seriesTitle = s.title;
      }
    });
  });
})();
