import { create } from 'zustand';

export type ModalType = 'testProvider' | 'addSource' | 'providerSelect' | null;

export interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface UIState {
  activeModal: ModalType;
  modalData: any;
  toast: ToastMessage | null;
  isSidebarOpen: boolean;

  // Actions
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error', durationMs?: number) => void;
  hideToast: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModal: null,
  modalData: null,
  toast: null,
  isSidebarOpen: false,

  openModal: (type, data = null) => {
    set({ activeModal: type, modalData: data });
  },

  closeModal: () => {
    set({ activeModal: null, modalData: null });
  },

  showToast: (message, type = 'info', durationMs = 3500) => {
    const id = Date.now();
    set({ toast: { id, message, type } });

    setTimeout(() => {
      set((state) => (state.toast?.id === id ? { toast: null } : state));
    }, durationMs);
  },

  hideToast: () => {
    set({ toast: null });
  },

  toggleSidebar: () => {
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen }));
  },
}));
