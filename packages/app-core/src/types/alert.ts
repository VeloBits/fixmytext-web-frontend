// Alert severity levels. Defined here so the federated host<->remote contract
// (contract.ts) and the shell's AlertContext share one definition.
export type AlertLevel = 'success' | 'danger' | 'warning' | 'info';

/** An inline action button on a toast (e.g. Undo for chip removal). */
export interface AlertAction {
  label: string;
  onClick: () => void;
}

export interface ShowAlertOptions {
  /** ms; 0 = sticky. Defaults by level (danger 5000, warning 4000, else 2500). */
  duration?: number;
  action?: AlertAction;
}

/** The showAlert signature threaded from the shell into the remotes. */
export type ShowAlertFn = (
  message: string,
  type?: AlertLevel | string,
  options?: ShowAlertOptions
) => void;
