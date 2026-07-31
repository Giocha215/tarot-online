"use client";

/**
 * Carrusel 3D: muestra varias fotos en las caras de un prisma que gira despacio
 * alrededor del eje vertical, así se van viendo todas. Sin dependencias.
 * Respeta prefers-reduced-motion (se queda quieto mostrando la primera).
 */
export function RotatingPhotos3D({
  photos,
  size = 80,
  alt = "",
}: {
  photos: string[];
  size?: number;
  alt?: string;
}) {
  const faces = photos.slice(0, 6);
  const n = Math.max(faces.length, 1);
  const radius = Math.round(size * 0.5);

  return (
    <div className="rp3d-stage" style={{ width: size, height: size }}>
      <div className="rp3d-prism">
        {faces.map((src, i) => (
          <span
            key={src + i}
            className="rp3d-face"
            style={{
              transform: `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="rp3d-img" loading="lazy" />
          </span>
        ))}
      </div>

      <style jsx>{`
        .rp3d-stage {
          perspective: 700px;
        }
        .rp3d-prism {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          animation: rp3d-spin 16s linear infinite;
        }
        .rp3d-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 0 0 1px hsl(var(--c-line));
        }
        .rp3d-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        @keyframes rp3d-spin {
          to {
            transform: rotateY(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rp3d-prism {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
