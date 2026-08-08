import toast from 'react-hot-toast';

/**
 * Thin wrappers over react-hot-toast so components stay agnostic
 * of the underlying library. Consistent styling via App.css.
 */

export const showSuccess = (msg) =>
  toast.success(msg, { duration: 3500, style: { fontFamily: 'Outfit, sans-serif' } });

export const showError = (msg) =>
  toast.error(msg || 'Something went wrong', { duration: 4500, style: { fontFamily: 'Outfit, sans-serif' } });

export const showInfo = (msg) =>
  toast(msg, { duration: 3000, style: { fontFamily: 'Outfit, sans-serif' } });

// named re-export so AppContext can import it directly
export { showInfo as showInfoToast };

export const showLoading = (msg = 'Processing...') =>
  toast.loading(msg, { style: { fontFamily: 'Outfit, sans-serif' } });

export const dismissToast = (id) => toast.dismiss(id);
