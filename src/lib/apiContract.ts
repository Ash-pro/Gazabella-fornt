export const isMvp0Api = () => import.meta.env.VITE_DATA_SOURCE !== 'mock' && import.meta.env.VITE_API_CONTRACT === 'mvp0'
