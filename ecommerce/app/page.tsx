export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f3]">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#e8dfc8] opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#d4c9a8] opacity-30 blur-3xl" />
      </div>

      <div className="relative text-center space-y-10 px-6">
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/terrana.png"
          alt="Terrana Gourmet"
          width={260}
          className="mx-auto drop-shadow-sm"
        />

        {/* Separador */}
        <div className="flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-[#b5a07a]" />
          <span className="text-[#b5a07a] text-xs tracking-[0.3em] uppercase">
            Próximamente
          </span>
          <div className="h-px w-16 bg-[#b5a07a]" />
        </div>

        {/* Mensaje */}
        <div className="space-y-3 max-w-sm mx-auto">
          <p className="text-[#3d3422] text-xl font-light tracking-wide">
            Estamos preparando algo especial
          </p>
          <p className="text-[#7a6e58] text-sm leading-relaxed">
            Nuestra tienda online estará disponible muy pronto.<br />
            Mientras tanto, podés contactarnos por nuestras redes.
          </p>
        </div>

        {/* Redes sociales */}
        <div className="flex items-center justify-center gap-6">
          <a
            href="https://instagram.com/terranagourmet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[#7a6e58] hover:text-[#594d0e] transition-colors text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none"/>
            </svg>
            @terranagourmet
          </a>
        </div>

        {/* Footer */}
        <p className="text-[#b5a07a] text-xs tracking-widest uppercase">
          Terrana Gourmet © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
