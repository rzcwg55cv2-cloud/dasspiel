/** Weiche, bunte Lichtflecken hinter dem oberen Bildschirmbereich. Rein dekorativ. */
export function ColorGlow() {
  return (
    <div aria-hidden="true" className="color-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] overflow-hidden">
      <div className="absolute -top-28 -left-24 size-80 rounded-full bg-red-300/40 blur-3xl" />
      <div className="absolute -top-20 -right-20 size-72 rounded-full bg-yellow-300/50 blur-3xl" />
      <div className="absolute top-28 left-1/3 size-64 rounded-full bg-green-300/35 blur-3xl" />
      <div className="absolute top-40 -right-10 size-48 rounded-full bg-lime-300/30 blur-3xl" />
    </div>
  );
}
