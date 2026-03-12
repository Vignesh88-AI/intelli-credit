import { useEffect, useRef } from "react";

export default function FluidCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    window.addEventListener("resize", () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    });

    const COLORS = ["#f0a500", "#fbbf24", "#60a5fa", "#a78bfa", "#34d399", "#f0a500", "#f0a500"];
    let colorIdx = 0;
    let points = [];
    let mouse = { x: W / 2, y: H / 2 };
    let prev = { x: W / 2, y: H / 2 };

    const onMove = (e) => {
      prev = { ...mouse };
      mouse = { x: e.clientX, y: e.clientY };
      const dx = mouse.x - prev.x;
      const dy = mouse.y - prev.y;
      const speed = Math.sqrt(dx * dx + dy * dy);
      if (speed > 2) {
        colorIdx = (colorIdx + 1) % COLORS.length;
      }
      const count = Math.floor(speed / 3) + 1;
      for (let i = 0; i < count; i++) {
        const t = i / count;
        points.push({
          x: prev.x + dx * t + (Math.random() - 0.5) * 8,
          y: prev.y + dy * t + (Math.random() - 0.5) * 8,
          vx: dx * 0.15 + (Math.random() - 0.5) * 1.5,
          vy: dy * 0.15 + (Math.random() - 0.5) * 1.5,
          life: 1.0,
          maxLife: 0.6 + Math.random() * 0.6,
          size: 4 + Math.random() * 10,
          color: COLORS[colorIdx],
          blur: Math.random() > 0.5,
        });
      }
    };

    window.addEventListener("mousemove", onMove);

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw connections between nearby points
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, points.length); j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60) {
            const alpha = (1 - dist / 60) * points[i].life * 0.3;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = points[i].color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      points = points.filter(p => p.life > 0);
      points.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life -= 0.018 / p.maxLife;
        p.size *= 0.992;

        const alpha = p.life;
        const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, "0");

        if (p.blur) {
          ctx.filter = "blur(3px)";
        }

        // Glow
        ctx.beginPath();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        grad.addColorStop(0, p.color + hexAlpha);
        grad.addColorStop(1, p.color + "00");
        ctx.fillStyle = grad;
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.filter = "none";

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = p.color + hexAlpha;
        ctx.fill();
      });

      // Cursor ring
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#f0a500aa";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#f0a500";
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    />
  );
}
