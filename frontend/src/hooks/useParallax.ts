
import { useEffect, useRef } from 'react';

const HEADER_MAX_OFFSET_X = 14;
const HEADER_MAX_OFFSET_Y = 8;
const PUPIL_MAX_OFFSET = 4;
const LERP_FACTOR = 0.08;

export function useParallax() {
  const headerRef = useRef<HTMLElement>(null);
  const pupilRef = useRef<HTMLSpanElement>(null);

  const targetPos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const relativeX = event.clientX / window.innerWidth - 0.5;
      const relativeY = event.clientY / window.innerHeight - 0.5;

      targetPos.current = {
        x: relativeX * HEADER_MAX_OFFSET_X,
        y: relativeY * HEADER_MAX_OFFSET_Y,
      };

      if (pupilRef.current) {
        pupilRef.current.style.transform =
          `translate(${relativeX * PUPIL_MAX_OFFSET}px, ${relativeY * PUPIL_MAX_OFFSET}px)`;
      }
    }

    function animateHeader() {
      const current = currentPos.current;
      const target = targetPos.current;

      current.x += (target.x - current.x) * LERP_FACTOR;
      current.y += (target.y - current.y) * LERP_FACTOR;

      if (headerRef.current) {
        headerRef.current.style.transform =
          `translate(${current.x}px, ${current.y}px)`;
      }

      animationFrameId.current =
        requestAnimationFrame(animateHeader);
    }

    window.addEventListener('mousemove', handleMouseMove);

    animationFrameId.current =
      requestAnimationFrame(animateHeader);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return {
    headerRef,
    pupilRef,
  };
}
