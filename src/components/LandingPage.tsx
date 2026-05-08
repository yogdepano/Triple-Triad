import React from "react"
import ShaderDemo_ATC from "./ui/atc-shader"

interface LandingPageProps {
  onEnter: () => void
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-black font-['Rajdhani'] z-50">
      
      {/* Background Shader */}
      <div className="absolute inset-0 z-0">
        <ShaderDemo_ATC />
      </div>

      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.9)_100%)]" />

      {/* Centered Content Layer */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
        
        {/* Title Area */}
        <div className="mb-10 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-6xl md:text-8xl font-['Cinzel'] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-[#f3d07a] via-[#d4af37] to-[#8a6e2f] drop-shadow-[0_0_25px_rgba(212,175,55,0.5)]">
            ENGRAVED NETHER
          </h1>
          <div className="h-[2px] w-48 mx-auto bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-4" />
        </div>

        {/* Tagline */}
        <p className="mb-14 text-xl md:text-2xl tracking-[0.4em] uppercase text-zinc-400 font-light animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
          Create Your Avatar. Engrave Your Legacy.
        </p>

        {/* Action Button */}
        <button 
          onClick={onEnter}
          className="group relative px-16 py-5 bg-transparent border border-[#d4af37]/40 text-[#d4af37] font-['Cinzel'] tracking-[0.3em] text-xl overflow-hidden transition-all duration-700 hover:border-[#d4af37] hover:text-white hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] animate-in fade-in zoom-in duration-1000 delay-500 pointer-events-auto"
        >
          <div className="absolute inset-0 w-full h-full bg-[#d4af37] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-in-out" />
          <span className="relative z-10">ENTER THE ARENA</span>
        </button>

        {/* Footer */}
        <div className="absolute bottom-10 opacity-30 text-[10px] tracking-[0.5em] uppercase text-zinc-500">
          Powered by Supabase & Vercel
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');
      ` }} />
    </div>
  )
}
