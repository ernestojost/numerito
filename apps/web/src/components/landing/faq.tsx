const QUESTIONS = [
  {
    q: "¿Mis clientes necesitan cuenta?",
    a: "Sí. Entran con Google o con email en segundos. Así cada turno tiene dueño y pueden cancelarlo solos.",
  },
  {
    q: "¿Qué pasa si no paga la seña?",
    a: "El turno queda retenido 10 minutos. Si no paga, se libera y vuelve a estar disponible.",
  },
  {
    q: "¿Puedo cargar turnos que me piden por teléfono?",
    a: "Sí, desde el panel con “Reserva manual”, sin seña o marcándola como cobrada en el local.",
  },
  {
    q: "¿Funciona con horario partido?",
    a: "Sí. Cada día admite varias franjas, para la barbería y para cada barbero. También puedes bloquear vacaciones o feriados.",
  },
  {
    q: "¿Mis barberos ven la agenda de los demás?",
    a: "No. Cada barbero entra y ve solo la suya. Tú ves todo.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Es una página web y funciona en cualquier teléfono.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto grid max-w-[1296px] gap-8 px-5 py-16 lg:grid-cols-[4fr_8fr] lg:gap-16 lg:px-0 lg:py-20">
      <h2 className="font-display text-[40px] leading-[1.05] uppercase">Preguntas</h2>
      <div className="flex flex-col">
        {QUESTIONS.map((item, i) => (
          <details key={item.q} open={i === 0} className="group border-b border-machine">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-bold lg:text-lg [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden className="font-ticket text-2xl group-open:hidden">
                +
              </span>
              <span aria-hidden className="hidden font-ticket text-2xl group-open:inline">
                –
              </span>
            </summary>
            <p className="max-w-[640px] pb-5 text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
