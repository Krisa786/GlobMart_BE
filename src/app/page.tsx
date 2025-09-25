'use client';

import { Droplets, Shield, Toilet, Leaf, Gem, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePageView } from '@/hooks/useAnalytics';

export default function Home() {
  // Track page view (disabled by default)
  usePageView('home', 'Global International - Elevate Hospitality Through Care & Consistency');
  return (
    <div style={{ backgroundColor: 'var(--color-background-primary)' }}>

      {/* Hero Section */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDYwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyMDAiIGhlaWdodD0iNjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxyZWN0IHg9IjIwMCIgeT0iMTAwIiB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI0Y5RkFGOSIvPgo8cmVjdCB4PSIyNTAiIHk9IjE1MCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNEMUQ1REIiLz4KPHJlY3QgeD0iNDAwIiB5PSIxNTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRDFENURCIi8+CjxyZWN0IHg9IjU1MCIgeT0iMTUwIiB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI0QxRDVEQiIvPgo8cmVjdCB4PSIyNTAiIHk9IjMwMCIgd2lkdGg9IjQwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNFNUU3RUIiLz4KPC9zdmc+')`
          }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/20"></div>
        
        {/* Content */}
        <div className="relative h-full flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-[var(--color-text-tertiary)] leading-tight mb-8">
                Elevate Hospitality Through Care & Consistency
              </h1>
              <Button variant="primary" size="lg">
                Browse Products
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Icons Section */}
      <section className="py-16" style={{ backgroundColor: 'var(--color-background-primary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-8 md:space-y-0 md:space-x-16">
            {/* Amenities */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <Droplets className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text-tertiary)]">Amenities</h3>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden md:block w-px h-16 bg-stone-300"></div>

            {/* Linen */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <div className="w-8 h-8 border-2 border-[var(--color-text-tertiary)] rounded-sm relative">
                  <div className="absolute top-1 left-1 right-1 h-1 bg-[var(--color-text-tertiary)] rounded-sm"></div>
                  <div className="absolute top-3 left-1 right-1 h-1 bg-[var(--color-text-tertiary)] rounded-sm"></div>
                  <div className="absolute top-5 left-1 right-1 h-1 bg-[var(--color-text-tertiary)] rounded-sm"></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text-tertiary)]">Linen</h3>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden md:block w-px h-16 bg-stone-300"></div>

            {/* Safety */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <Shield className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text-tertiary)]">Safety</h3>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden md:block w-px h-16 bg-stone-300"></div>

            {/* Washroom */}
            <div className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                <Toilet className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--color-text-tertiary)]">Washroom</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Section */}
      <section className="py-20" style={{ backgroundColor: 'var(--color-background-surface)' }}>
        <div className=" max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-[var(--color-text-tertiary)] mb-4">
              Our Commitment to Sustainability
            </h2>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-start space-y-8 md:space-y-0 md:space-x-16">
            {/* Eco-Friendly */}
            <div className="flex flex-col items-center text-center group flex-1">
              <div className="w-16 h-16 flex items-center justify-center mb-6">
                <Leaf className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text-tertiary)] mb-3">Eco-Friendly</h3>
              <p className="text-stone-600 leading-relaxed text-sm">
                Avoid harmful chemicals and embrace sustainable practices that protect our environment for future generations.
              </p>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden md:block w-px h-32 bg-stone-300"></div>

            {/* Premium Quality */}
            <div className="flex flex-col items-center text-center group flex-1">
              <div className="w-16 h-16 flex items-center justify-center mb-6">
                <Gem className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text-tertiary)] mb-3">Premium Quality</h3>
              <p className="text-stone-600 leading-relaxed text-sm">
                Sustainability principles at our core ensure every product meets the highest standards of excellence and durability.
              </p>
            </div>

            {/* Divider - Hidden on mobile */}
            <div className="hidden md:block w-px h-32 bg-stone-300"></div>

            {/* Safety Assured */}
            <div className="flex flex-col items-center text-center group flex-1">
              <div className="w-16 h-16 flex items-center justify-center mb-6">
                <ShieldCheck className="h-8 w-8 text-[var(--color-text-tertiary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text-tertiary)] mb-3">Safety Assured</h3>
              <p className="text-stone-600 leading-relaxed text-sm">
                Rigorous testing and certification guarantee eco-friendly products that are safe for guests and staff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Logos Section */}
      <section className="py-16" style={{ backgroundColor: 'var(--color-background-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
            {/* BERN */}
            <div className="text-2xl font-bold text-stone-400">BERN</div>
            
            {/* AUK */}
            <div className="text-2xl font-bold text-stone-400">AUK</div>
            
            {/* Floral Pattern */}
            <div className="w-16 h-16 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-stone-400 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-stone-400 rounded-full"></div>
              </div>
            </div>
            
            {/* COBY */}
            <div className="text-2xl font-bold text-stone-400">COBY</div>
            
            {/* OBC */}
            <div className="text-2xl font-bold text-stone-400">OBC</div>
          </div>
        </div>
      </section>
    </div>
  );
}
