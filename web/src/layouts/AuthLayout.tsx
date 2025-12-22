import { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={8}
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            color="primary"
            fontWeight="bold"
            gutterBottom
          >
            SEH
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Sistema de Seguridad e Higiene
          </Typography>
          <Box sx={{ mt: 3, width: '100%' }}>{children}</Box>
        </Paper>
      </Container>
    </Box>
  );
}
