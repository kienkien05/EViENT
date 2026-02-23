import api from './api'

export const authService = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),

  verifyRegister: (data: { email: string; otp: string; password: string; full_name: string }) =>
    api.post('/auth/verify-register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  verifyLogin: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-login', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; otp: string; new_password: string }) =>
    api.post('/auth/reset-password', data),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: FormData | Record<string, any>) =>
    api.put('/auth/profile', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
}

export const userService = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    api.get('/users', { params }),

  getUserById: (id: string) =>
    api.get(`/users/${id}`),

  createUser: (data: Record<string, any>) =>
    api.post('/users', data),

  updateUser: (id: string, data: Record<string, any>) =>
    api.put(`/users/${id}`, data),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),

  toggleStatus: (id: string) =>
    api.patch(`/users/${id}/toggle-status`),
}

export const eventService = {
  getEvents: (params?: { page?: number; limit?: number; search?: string; location?: string; date?: string; status?: string; time_status?: string }) =>
    api.get('/events', { params }),

  getFeaturedEvents: () =>
    api.get('/events/featured'),

  getEventById: (id: string) =>
    api.get(`/events/${id}`),

  createEvent: (data: Record<string, any>) =>
    api.post('/events', data),

  updateEvent: (id: string, data: Record<string, any>) =>
    api.put(`/events/${id}`, data),

  deleteEvent: (id: string) =>
    api.delete(`/events/${id}`),
}

export const orderService = {
  createOrder: (data: Record<string, any>) =>
    api.post('/orders', data),

  getMyTickets: (params?: { page?: number; limit?: number; status?: string; search?: string; location?: string; date?: string }) =>
    api.get('/orders/my-tickets', { params }),

  getRemainingTickets: (eventId: string) =>
    api.get(`/orders/remaining/${eventId}`),

  getSoldSeats: (eventId: string) =>
    api.get(`/orders/events/${eventId}/sold-seats`),

  deleteOrder: (id: string) =>
    api.delete(`/orders/${id}`),
}

export const ticketService = {
  getTickets: (params?: { page?: number; limit?: number; status?: string; event_id?: string; search?: string }) =>
    api.get('/tickets', { params }),

  validateQR: (ticketCode: string) =>
    api.post('/tickets/validate-qr', { ticket_code: ticketCode }),

  getTicketInfo: (code: string) =>
    api.get(`/tickets/info/${code}`),

  resendEmail: (ticketId: string) =>
    api.post('/tickets/resend-email', { ticket_id: ticketId }),

  updateTicket: (id: string, data: Record<string, any>) =>
    api.put(`/tickets/${id}`, data),
}

export const roomService = {
  getRooms: () =>
    api.get('/rooms'),

  createRoom: (data: { name: string; rows: number; seats_per_row: number }) =>
    api.post('/rooms', data),

  updateRoom: (id: string, data: Record<string, any>) =>
    api.put(`/rooms/${id}`, data),

  updateRoomSeatsBatch: (id: string, updates: { id: string, isActive: boolean }[]) =>
    api.put(`/rooms/${id}/seats`, { updates }),
  updateRoomSeatLocksBatch: (id: string, updates: { id: string, eventId: string, ticketTypeId: string | null, action: 'add' | 'remove' }[]) =>
    api.put(`/rooms/${id}/seat-locks`, { updates }),
  deleteRoom: (id: string) =>
    api.delete(`/rooms/${id}`),
}

export const bannerService = {
  getBanners: (active?: boolean) =>
    api.get('/banners', { params: active !== undefined ? { active } : {} }),

  createBanner: (data: Record<string, any>) =>
    api.post('/banners', data),

  updateBanner: (id: string, data: Record<string, any>) =>
    api.put(`/banners/${id}`, data),

  deleteBanner: (id: string) =>
    api.delete(`/banners/${id}`),
}

export const uploadService = {
  upload: (file: File, folder?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folder) formData.append('folder', folder)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const notificationService = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get('/notifications/user-notifications', { params }),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),

  markAsRead: (id: string) =>
    api.patch(`/notifications/user-notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch('/notifications/read-all'),
}
