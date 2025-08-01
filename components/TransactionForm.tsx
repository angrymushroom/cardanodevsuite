'use client';

import { useState } from 'react';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
import { Send } from '@mui/icons-material';

/*
 * Props for the TransactionForm component.
 * @interface TransactionFormProps
 * @property {(recipient: string, amount: string) => Promise<void>} onSubmit - Callback function to handle form submission.
 * @property {boolean} loading - Indicates if a transaction is currently being processed.
 */
interface TransactionFormProps {
  onSubmit: (recipient: string, amount: string) => Promise<void>;
  loading: boolean;
}

/**
 * TransactionForm Component
 * Provides a form for users to input recipient address and amount for a transaction.
 * It handles local state for input fields and calls the onSubmit prop on form submission.
 */
const TransactionForm = ({ onSubmit, loading }: TransactionFormProps) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  /**
   * Handles the form submission event.
   * Prevents default form submission and calls the onSubmit prop with current recipient and amount.
   * @param event The form submission event.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(recipient, amount);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>Send ADA</Typography>
      <TextField
        label="Recipient Address"
        fullWidth
        margin="normal"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        required
        disabled={loading}
      />
      <TextField
        label="Amount (ADA)"
        type="number"
        fullWidth
        margin="normal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        disabled={loading}
      />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        fullWidth
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
      >
        {loading ? 'Sending...' : 'Send Transaction'}
      </Button>
    </Box>
  );
};

export default TransactionForm;