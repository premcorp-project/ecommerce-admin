import { create } from 'zustand';

const STORAGE_KEY = 'admin-notification-sound';

interface NotificationSoundStore {
    enabled: boolean;
    toggle: () => void;
}

function getInitialState(): boolean {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
}

export const useNotificationSoundStore = create<NotificationSoundStore>((set, get) => ({
    enabled: getInitialState(),
    toggle: () => {
        const next = !get().enabled;
        set({ enabled: next });
        localStorage.setItem(STORAGE_KEY, String(next));
    },
}));
