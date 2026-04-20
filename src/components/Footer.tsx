export function Footer() {
  return (
    <footer className="w-full py-12 mt-auto bg-surface-container-lowest">
      <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-screen-2xl mx-auto gap-8 border-t border-outline-variant/15 pt-8">
        <div className="text-lg font-black text-primary font-['Space_Grotesk']">
          LET'S DO IT
        </div>
        <div className="flex flex-wrap justify-center gap-8 font-['Inter'] text-xs uppercase tracking-widest">
          <a className="text-outline-variant hover:text-primary transition-colors" href="#">
            Privacy Protocol
          </a>
          <a className="text-outline-variant hover:text-primary transition-colors" href="#">
            Service Terms
          </a>
          <a className="text-outline-variant hover:text-primary transition-colors" href="#">
            Carrier Signal
          </a>
          <a className="text-outline-variant hover:text-primary transition-colors" href="#">
            System Status
          </a>
        </div>
        <div className="font-['Inter'] text-xs uppercase tracking-widest text-outline-variant">
          © {new Date().getFullYear()} LET'S DO IT. ENGINEERED FOR EXPLORATION.
        </div>
      </div>
    </footer>
  );
}
