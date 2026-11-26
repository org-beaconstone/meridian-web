// Provider-shaped fixture. The port boundary strips payloads before the adapter sees them.
// This is not a payment provider and it does not name one.

import type { IdentityCheckPort, IdentityDisposition } from './types';

export interface SimulatedProviderEnvelope {
  mode: 'synthetic_fixture';
  disposition: IdentityDisposition;
  providerPayload: {
    raw: string;
    secret: string;
  };
}

export function simulatedEnvelope(disposition: IdentityDisposition): SimulatedProviderEnvelope {
  return {
    mode: 'synthetic_fixture',
    disposition,
    providerPayload: {
      raw: 'PROVIDER_BLOB_77',
      secret: 'prov_secret_should_not_cross',
    },
  };
}

/** Adapter-facing result. The provider payload stays in the simulation. */
export function toPortResult(envelope: SimulatedProviderEnvelope): {
  disposition: IdentityDisposition;
} {
  return { disposition: envelope.disposition };
}

export function createSimulatedIdentityPort(disposition: IdentityDisposition): IdentityCheckPort {
  return {
    verify() {
      return toPortResult(simulatedEnvelope(disposition));
    },
  };
}
