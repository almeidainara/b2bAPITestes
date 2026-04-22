import { Alert, Snackbar, Stack } from '@mui/material'
import { useApp } from '../../context/AppContext'

export function NotificationBar() {
  const { notifications, dismissNotification } = useApp()

  return (
    <Stack
      spacing={1}
      sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, minWidth: 320 }}
    >
      {notifications.map(n => (
        <Snackbar
          key={n.id}
          open
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ position: 'relative', bottom: 'auto', right: 'auto' }}
        >
          <Alert
            severity={n.severity}
            variant="filled"
            onClose={() => dismissNotification(n.id)}
            sx={{ width: '100%', boxShadow: 4 }}
          >
            {n.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}
