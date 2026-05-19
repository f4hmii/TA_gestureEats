import { apiClient } from './client';
import { OrderPayload, OrderResponse } from '../types/api';

/**
 * Mengirim data checkout/pesanan baru ke backend
 */
export const createOrder = (orderData: OrderPayload) => {
  return apiClient<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
};
