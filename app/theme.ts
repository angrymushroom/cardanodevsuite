'use client';
import { createTheme } from '@mui/material/styles';

/**
 * Defines the Material-UI theme for the application.
 * This theme is configured for a dark mode aesthetic with custom primary and secondary colors.
 */
const theme = createTheme({
  palette: {
    mode: 'dark', // Sets the overall theme to dark mode
    primary: {
      main: '#9c27b0', // Custom primary color (a shade of purple)
    },
    secondary: {
      main: '#00bcd4', // Custom secondary color (a shade of cyan)
    },
    background: {
      default: '#121212', // Default background color for the application
      paper: '#1e1e1e', // Background color for Paper and Card components
    },
  },
});

export default theme;