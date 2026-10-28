import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  logging: {
    // Reset URLs contain a secret token. Server Function logs include form
    // fields, so a password would be written to the dev server log.
    incomingRequests: {
      ignore: [/\/reset-password/],
    },
    serverFunctions: false,
    browserToTerminal: false,
  },
};

export default nextConfig;
