"use client";

/**
 * Carrusel 3D: muestra varias fotos en las caras de un prisma que gira despacio
 * alrededor del eje vertical, así se van viendo todas. La animación vive en
 * globals.css (`.photo3d-*` + @keyframes photo3d-spin); aquí solo se colocan
 * las caras en 3D. Respeta prefers-reduced-motion.
 */
export function RotatingPhotos3D({
  photos,
  size = 120,
  alt = "",
}: {
  photos: string[];
  size?: number;
  alt?: string;
}) {
  const faces = photos.slice(0, 6);
  const n = Math.max(faces.length, 1);
  // Radio = apotema del prisma de n caras: así las fotos quedan casi pegadas
  // (sin hueco visible entre ellas) mientras gira, en vez de separadas.
  const radius = n < 2 ? 0 : Math.round(size / 2 / Math.tan(Math.PI / n));

  return (
    <div className="photo3d-stage" style={{ width: size, height: size }}>
      <div className="photo3d-prism">
        {faces.map((src, i) => (
          <span
            key={src + i}
            className="photo3d-face"
            style={{
              transform: `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" />
          </span>
        ))}
      </div>
    </div>
  );
}
