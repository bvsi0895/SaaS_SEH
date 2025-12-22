import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SnackbarMessage {
  message: string;
  severity: AlertColor;
}

interface SnackbarContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarMessage>({
    message: '',
    severity: 'info',
  });

  const showMessage = useCallback((message: string, severity: AlertColor) => {
    setSnackbar({ message, severity });
    setOpen(true);
  }, []);

  const showSuccess = useCallback(
    (message: string) => showMessage(message, 'success'),
    [showMessage]
  );
  const showError = useCallback(
    (message: string) => showMessage(message, 'error'),
    [showMessage]
  );
  const showWarning = useCallback(
    (message: string) => showMessage(message, 'warning'),
    [showMessage]
  );
  const showInfo = useCallback(
    (message: string) => showMessage(message, 'info'),
    [showMessage]
  );

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  const context = useContext(SnackbarContext);
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
}
