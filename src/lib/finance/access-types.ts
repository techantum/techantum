export type FinanceAction = 'read' | 'write' | 'export' | 'settings' | 'cancel';
export type FinanceCapability = Record<FinanceAction, boolean>;
