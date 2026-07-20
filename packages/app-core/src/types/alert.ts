// Alert severity levels. Defined here so the federated host<->remote contract
// (contract.ts) and the shell's AlertContext share one definition.
export type AlertLevel = 'success' | 'danger' | 'warning' | 'info';
