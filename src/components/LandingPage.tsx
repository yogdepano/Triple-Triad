import React from "react"
import ShaderDemo_ATC from "./ui/atc-shader"

interface LandingPageProps {
  onEnter: () => void
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black text-white font-['Rajdhani']">
      {/* Background Shader */}
      <div className="absolute inset-0 z-0">
        <ShaderDemo_ATC />
      </div>

      {/* Overlay Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />

      {/* Content Layer */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full px-6 text-center">
        {/* Logo Area */}
        <div className="mb-8 animate-in fade-in zoom-in duration-1000">
          <h1 className="text-6xl md:text-8xl font-['Cinzel'] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-[#f3d07a] via-[#d4af37] to-[#8a6e2f] drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]">
            ENGRAVED NETHER
          </h1>
          <div className="h-1 w-32 mx-auto bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-2" />
        </div>

        {/* Tagline */}
        <p className="mb-12 text-xl md:text-2xl tracking-[0.3em] uppercase text-zinc-400 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          Create Your Avatar. Engrave Your Legacy.
        </p>

        {/* Enter Button */}
        <button 
          onClick={onEnter}
          className="group relative px-12 py-4 bg-transparent border border-[#d4af37]/30 text-[#d4af37] font-['Cinzel'] tracking-widest text-lg overflow-hidden transition-all duration-500 hover:border-[#d4af37] hover:text-white hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] animate-in fade-in zoom-in duration-1000 delay-500"
        >
          {/* Button Background Sweep */}
          <div className="absolute inset-0 w-full h-full bg-[#d4af37] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
          
          <span className="relative z-10">ENTER THE ARENA</span>
        </button>

        {/* Subtle Bottom Text */}
        <div className="absolute bottom-10 left-0 right-0 opacity-30 text-xs tracking-widest uppercase">
          Powered by Supabase & Vercel
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');
      ` }} />
    </div>
  )
}
