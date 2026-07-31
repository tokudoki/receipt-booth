export default function NotFound() {
  return (
    <div className="h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="text-center border-4 border-foreground p-12 bg-card transform rotate-[-2deg]">
        <h1 className="text-6xl font-black uppercase mb-4">404</h1>
        <p className="text-xl font-thermal uppercase font-bold">
          Page not found
        </p>
        <a href="/" className="mt-8 inline-block px-6 py-3 bg-foreground text-background font-bold uppercase tracking-widest hover:bg-foreground/90">
          Return Home
        </a>
      </div>
    </div>
  );
}
