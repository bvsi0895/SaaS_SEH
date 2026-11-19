import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { administracionApi } from '../../api/administracion';

interface OrganizationLogoProps {
  contextId: string | null;
}

interface LoadedLogo {
  contextId: string | null;
  src: string | null;
}

/**
 * Carga el logo a través del endpoint autenticado del contexto activo.
 * La asociación con contextId evita que una respuesta tardía pinte el logo
 * de otra consultora después de cambiar el selector.
 */
export default function OrganizationLogo({ contextId }: OrganizationLogoProps) {
  const [loadedLogo, setLoadedLogo] = useState<LoadedLogo>({ contextId: null, src: null });

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    setLoadedLogo({ contextId, src: null });

    if (!contextId) {
      return () => undefined;
    }

    administracionApi.getLogo()
      .then((blob) => {
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setLoadedLogo({ contextId, src: objectUrl });
      })
      .catch(() => {
        if (!disposed) setLoadedLogo({ contextId, src: null });
      });

    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contextId]);

  const src = loadedLogo.contextId === contextId ? loadedLogo.src : null;

  if (!src) {
    return (
      <Typography variant="h6" color="primary" fontWeight="bold" data-testid="seh-logo-fallback">
        SEH
      </Typography>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt="Logo de la consultora"
      data-testid="organization-logo"
      sx={{
        display: 'block',
        width: '100%',
        maxWidth: 180,
        height: 40,
        objectFit: 'contain',
      }}
    />
  );
}

