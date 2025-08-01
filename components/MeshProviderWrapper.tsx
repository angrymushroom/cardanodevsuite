'use client';

import { MeshProvider } from '@meshsdk/react';
import React from 'react';

/**
 * MeshProviderWrapper Component
 * This component wraps the MeshProvider from @meshsdk/react.
 * It is marked with "use client" to ensure it runs on the client-side,
 * which is necessary for MeshSDK functionality.
 */
const MeshProviderWrapper = ({ children }: { children: React.ReactNode }) => {
  return <MeshProvider>{children}</MeshProvider>;
};

export default MeshProviderWrapper;