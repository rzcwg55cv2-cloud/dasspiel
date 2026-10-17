/** Weiche, bunte Lichtflecken hinter dem oberen Bildschirmbereich. Rein dekorativ. */
export function ColorGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden">
      <div className="absolute -top-28 -left-24 size-80 rounded-full bg-orange-300/45 blur-3xl" />
      <div className="absolute -top-20 -right-20 size-72 rounded-full bg-pink-300/45 blur-3xl" />
      <div className="absolute top-28 left-1/3 size-64 rounded-full bg-violet-300/35 blur-3xl" />
      <div className="absolute top-40 -right-10 size-48 rounded-full bg-sky-300/30 blur-3xl" />
    </div>
  );
}
