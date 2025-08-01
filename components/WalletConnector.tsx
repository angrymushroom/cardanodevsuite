'use client';

import { useWalletList } from '@meshsdk/react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { AccountBalanceWallet, PowerSettingsNew } from '@mui/icons-material';
import { useState } from 'react';

/**
 * Props for the WalletConnector component.
 * @interface WalletConnectorProps
 * @property {(name: string) => void} onConnect - Callback function to connect to a wallet.
 * @property {() => void} onDisconnect - Callback function to disconnect from the wallet.
 * @property {boolean} connected - Indicates if a wallet is currently connected.
 */
interface WalletConnectorProps {
  onConnect: (name: string) => void;
  onDisconnect: () => void;
  connected: boolean;
}

/**
 * WalletConnector Component
 * Provides UI for connecting to and disconnecting from Cardano wallets.
 * It displays a list of available wallets and handles the connection dialog.
 */
const WalletConnector = ({ onConnect, onDisconnect, connected }: WalletConnectorProps) => {
  const wallets = useWalletList(); // Fetches a list of available wallets from MeshSDK
  const [open, setOpen] = useState(false); // State to control the visibility of the wallet selection dialog

  /**
   * Handles the connection process for a selected wallet.
   * Calls the onConnect prop with the wallet name and closes the dialog.
   * @param walletName The name of the wallet to connect to.
   */
  const handleConnect = (walletName: string) => {
    onConnect(walletName);
    setOpen(false);
  };

  return (
    <>
      {connected ? (
        // If connected, show a Disconnect button
        <Button variant="outlined" color="secondary" onClick={onDisconnect} startIcon={<PowerSettingsNew />}>Disconnect</Button>
      ) : (
        // If not connected, show a Connect Wallet button that opens the dialog
        <Button variant="contained" color="secondary" onClick={() => setOpen(true)} startIcon={<AccountBalanceWallet />}>Connect Wallet</Button>
      )}
      {/* Wallet Selection Dialog */}
      <Dialog onClose={() => setOpen(false)} open={open}> {/* Dialog for selecting a wallet */}
        <DialogTitle>Select a Wallet</DialogTitle>
        <DialogContent>
          <List>
            {wallets.map((wallet) => (
              <ListItemButton key={wallet.name} onClick={() => handleConnect(wallet.name)}> {/* List item for each available wallet */}
                <ListItemIcon>
                  <img src={wallet.icon} alt={wallet.name} width={24} height={24} /> {/* Wallet icon */}
                </ListItemIcon>
                <ListItemText primary={wallet.name} /> {/* Wallet name */}
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WalletConnector;