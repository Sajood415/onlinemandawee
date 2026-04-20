import { useToast, ToastType } from "@/components/ui/toast/ToastContext";

// Hook for using toast in components
export const useToastUtils = () => {
  const { showToast, hideToast, clearAllToasts } = useToast();

  const success = (title: string, message?: string, options?: { duration?: number }) => {
    return showToast({ type: "success", title, message, ...options });
  };

  const error = (title: string, message?: string, options?: { duration?: number }) => {
    return showToast({ type: "error", title, message, ...options });
  };

  const warning = (title: string, message?: string, options?: { duration?: number }) => {
    return showToast({ type: "warning", title, message, ...options });
  };

  const info = (title: string, message?: string, options?: { duration?: number }) => {
    return showToast({ type: "info", title, message, ...options });
  };

  const persistent = (type: ToastType, title: string, message?: string) => {
    return showToast({ type, title, message, persistent: true });
  };

  return {
    success,
    error,
    warning,
    info,
    persistent,
    hideToast,
    clearAllToasts,
    showToast,
  };
};

// Utility functions for direct usage (outside React components)
let globalToastContext: ReturnType<typeof useToastUtils> | null = null;

export const setGlobalToastContext = (context: ReturnType<typeof useToastUtils>) => {
  globalToastContext = context;
};

// Direct utility functions that can be used anywhere
export const toast = {
  success: (title: string, message?: string, options?: { duration?: number }) => {
    if (globalToastContext) {
      return globalToastContext.success(title, message, options);
    } else {
      console.warn("Toast context not initialized. Make sure ToastProvider is wrapping your app.");
      // Fallback to alert for development
      alert(`Success: ${title}${message ? ` - ${message}` : ""}`);
    }
  },

  error: (title: string, message?: string, options?: { duration?: number }) => {
    if (globalToastContext) {
      return globalToastContext.error(title, message, options);
    } else {
      console.warn("Toast context not initialized. Make sure ToastProvider is wrapping your app.");
      // Fallback to alert for development
      alert(`Error: ${title}${message ? ` - ${message}` : ""}`);
    }
  },

  warning: (title: string, message?: string, options?: { duration?: number }) => {
    if (globalToastContext) {
      return globalToastContext.warning(title, message, options);
    } else {
      console.warn("Toast context not initialized. Make sure ToastProvider is wrapping your app.");
      // Fallback to alert for development
      alert(`Warning: ${title}${message ? ` - ${message}` : ""}`);
    }
  },

  info: (title: string, message?: string, options?: { duration?: number }) => {
    if (globalToastContext) {
      return globalToastContext.info(title, message, options);
    } else {
      console.warn("Toast context not initialized. Make sure ToastProvider is wrapping your app.");
      // Fallback to alert for development
      alert(`Info: ${title}${message ? ` - ${message}` : ""}`);
    }
  },

  persistent: (type: ToastType, title: string, message?: string) => {
    if (globalToastContext) {
      return globalToastContext.persistent(type, title, message);
    } else {
      console.warn("Toast context not initialized. Make sure ToastProvider is wrapping your app.");
      // Fallback to alert for development
      alert(`${type}: ${title}${message ? ` - ${message}` : ""}`);
    }
  },

  hideToast: (id: string) => {
    if (globalToastContext) {
      return globalToastContext.hideToast(id);
    }
  },

  clearAll: () => {
    if (globalToastContext) {
      return globalToastContext.clearAllToasts();
    }
  },
};

// Export types for TypeScript users
export type { ToastType } from "@/components/ui/toast/ToastContext";
