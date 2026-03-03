import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
    isOpen: boolean;
    title: string;
    message: string;
    type: NotificationType;
    showNotification: (params: { title: string; message: string; type?: NotificationType }) => void;
    hideNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showNotification: ({ title, message, type = 'info' }) => {
        set({ isOpen: true, title, message, type });
        // Auto-hide after 5 seconds
        setTimeout(() => {
            set((state) => {
                if (state.message === message && state.isOpen) {
                    return { isOpen: false, title: '', message: '', type: 'info' };
                }
                return state;
            });
        }, 5000);
    },
    hideNotification: () => set({ isOpen: false }),
}));
