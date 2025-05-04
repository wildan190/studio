/**
 * Defines the list of page paths that can be managed via user permissions.
 * The '/users' path is excluded as its access is controlled by the 'superadmin' role.
 */
export const MANAGEABLE_PATHS = [
    { path: '/', label: 'Dashboard' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/budgets', label: 'Budgets' },
    { path: '/reports', label: 'Reports' },
    { path: '/calendar', label: 'Calendar' }, // Add Calendar path
];

/**
 * Paths accessible to all authenticated users by default.
 */
export const DEFAULT_ALLOWED_PATHS = ['/'];

/**
 * Default number of items to display per page for paginated lists.
 */
export const ITEMS_PER_PAGE = 10;
