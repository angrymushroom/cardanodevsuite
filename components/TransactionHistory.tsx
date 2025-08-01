'use client';

import { Alert, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';

/**
 * Props for the TransactionHistory component.
 * @interface TransactionHistoryProps
 * @property {Array<{ txHash: string | null; error: string | null; timestamp: number }>} history - An array of past transaction attempts.
 */
interface TransactionHistoryProps {
  history: Array<{ txHash: string | null; error: string | null; timestamp: number }>;
}

/**
 * TransactionHistory Component
 * Displays a history of submitted transactions, including their status (success or failure).
 */
const TransactionHistory = ({ history }: TransactionHistoryProps) => (
  <Paper elevation={3} sx={{ p: 4, borderRadius: 4, mt: 4 }}>
    <Typography variant="h6" gutterBottom>Transaction History</Typography>
    <List dense>
      {history.length > 0 ? (
        history.map((item, index) => (
          <ListItem key={index}>
            {item.txHash ? (
              <Alert severity="success" sx={{ width: '100%' }}>
                <ListItemText
                  primary={`Transaction Submitted (${new Date(item.timestamp).toLocaleString()})`}
                  secondary={<a href={`https://cardanoscan.io/transaction/${item.txHash}`} target="_blank" rel="noopener noreferrer">{item.txHash}</a>}
                />
              </Alert>
            ) : (
              <Alert severity="error" sx={{ width: '100%' }}>
                <ListItemText
                  primary={`Transaction Failed (${new Date(item.timestamp).toLocaleString()})`}
                  secondary={item.error}
                />
              </Alert>
            )}
          </ListItem>
        ))
      ) : (
        <ListItem>
          <ListItemText secondary="No transactions yet." />
        </ListItem>
      )}
    </List>
  </Paper>
);

export default TransactionHistory;
