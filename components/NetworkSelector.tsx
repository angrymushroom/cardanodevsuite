'use client';

import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Typography, Box } from '@mui/material';
import { useEffect } from 'react';

/**
 * Props for the NetworkSelector component.
 * @interface NetworkSelectorProps
 * @property {boolean} connected - Indicates if a wallet is currently connected.
 * @property {number | undefined} connectedWalletNetworkId - The network ID of the connected wallet (0 for Testnet, 1 for Mainnet), or undefined if no wallet is connected.
 * @property {number} dappNetworkId - The dApp's currently selected network ID.
 * @property {(networkId: number) => void} setDappNetworkId - Setter function for the dApp's network ID.
 */
interface NetworkSelectorProps {
  connected: boolean;
  connectedWalletNetworkId: number | undefined;
  dappNetworkId: number;
  setDappNetworkId: (networkId: number) => void;
}

/**
 * NetworkSelector Component
 * Allows the user to select the Cardano network for the dApp's context.
 * When a wallet is connected, it displays the wallet's network and disables selection.
 */
const NetworkSelector = ({ connected, connectedWalletNetworkId, dappNetworkId, setDappNetworkId }: NetworkSelectorProps) => {

  // Effect to synchronize dApp's network with connected wallet's network
  useEffect(() => {
    if (connected && connectedWalletNetworkId !== undefined) {
      setDappNetworkId(connectedWalletNetworkId); // Set dApp network to wallet's network
    }
  }, [connected, connectedWalletNetworkId, setDappNetworkId]);

  /**
   * Handles the change event for the network selection dropdown.
   * Only allows changing the dApp's network if no wallet is connected.
   * @param event The change event from the Select component.
   */
  const handleNetworkChange = (event: SelectChangeEvent<number>) => {
    if (!connected) {
      setDappNetworkId(Number(event.target.value));
    }
  };

  // Determine the value to display in the Select component
  // Ensure a number is always provided to avoid uncontrolled to controlled component warning
  let selectValue: number = dappNetworkId; // Default to dApp's current network
  if (connected && connectedWalletNetworkId !== undefined) {
    selectValue = connectedWalletNetworkId; // If connected and wallet network is known, use it
  }

  return (
    <FormControl fullWidth margin="normal" disabled={connected}> {/* Disable when wallet is connected */}
      <InputLabel id="network-select-label">Network</InputLabel>
      <Select
        labelId="network-select-label"
        value={selectValue} // Use the determined value
        label="Network"
        onChange={handleNetworkChange}
      >
        <MenuItem value={0}>Testnet</MenuItem>
        <MenuItem value={1}>Mainnet</MenuItem>
      </Select>
      {connected && connectedWalletNetworkId !== undefined && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Connected wallet is on {connectedWalletNetworkId === 0 ? 'Testnet' : 'Mainnet'}.
          </Typography>
        </Box>
      )}
    </FormControl>
  );
};

export default NetworkSelector;
