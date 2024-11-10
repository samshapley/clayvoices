import React, { useState, useEffect, useRef } from 'react';

const CuneiformBackground = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Extended cuneiform symbols pool
    const cuneiformSymbols = [
      '𒀀', '𒀁', '𒀂', '𒀃', '𒀄', '𒀅', '𒀆', '𒀇', '𒀈', '𒀉',
      '𒀊', '𒀋', '𒀌', '𒀍', '𒀎', '𒀔', '𒀕', '𒀖', '𒀗', '𒀘', '𒀙', '𒀚', '𒀛', '𒀜', '𒀝'
    ];
    
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      setDimensions({ width, height });
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();

    let activeSymbols = [];
    let lastSpawnTime = 0;
    const SPAWN_INTERVAL = 50; // Reduced to 800ms between spawns
    const MAX_SYMBOLS = 80; // Increased to 6 simultaneous symbols

    const createSymbol = () => {
      const padding = 30; // Reduced padding
      const x = padding + Math.random() * (canvas.width - (padding * 2));
      const y = padding + Math.random() * (canvas.height - (padding * 2));
      
      return {
        x,
        y,
        opacity: 0,
        symbol: cuneiformSymbols[Math.floor(Math.random() * cuneiformSymbols.length)],
        createdAt: Date.now(),
        size: 24 + Math.random() * 8 // Smaller size range: 24-32px
      };
    };

    // Start with initial symbols
    for (let i = 0; i < 3; i++) {
      activeSymbols.push(createSymbol());
    }
    lastSpawnTime = Date.now();
    
    const animate = () => {
      ctx.fillStyle = '#D4B996';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const currentTime = Date.now();
      
      // Spawn new symbols more frequently
      if (activeSymbols.length < MAX_SYMBOLS && currentTime - lastSpawnTime > SPAWN_INTERVAL) {
        activeSymbols.push(createSymbol());
        lastSpawnTime = currentTime;
      }

      activeSymbols = activeSymbols.filter(symbol => {
        const age = currentTime - symbol.createdAt;
        
        // Faster fade transitions
        if (age < 1000) { // 1s fade in
          symbol.opacity = (age / 1000) * 0.5;
        } else if (age > 3000) { // 1s fade out after 3s
          symbol.opacity = Math.max(0, 0.5 - ((age - 3000) / 1000 * 0.5));
        }
        
        if (symbol.opacity > 0) {
          ctx.save();
          ctx.font = `${symbol.size}px serif`;
          ctx.fillStyle = `rgba(44, 24, 16, ${symbol.opacity})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(symbol.symbol, symbol.x, symbol.y);
          ctx.restore();
          return true;
        }
        
        return age < 4000; // Total lifetime reduced to 4 seconds
      });

      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10"
      style={{ 
        backgroundColor: '#D4B996',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh'
      }}
    />
  );
};

const CuneiformEffects = () => {
  return (
    <CuneiformBackground />
  );
};

export default CuneiformEffects;