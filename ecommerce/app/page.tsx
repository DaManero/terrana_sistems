export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
      <div className="text-center space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="public/terrana.png"
          alt="Terrana"
          width={220}
          className="mx-auto"
        />
        <p className="text-lg text-stone-500">Sitio en desarrollo</p>
      </div>
    </main>
  );
}
