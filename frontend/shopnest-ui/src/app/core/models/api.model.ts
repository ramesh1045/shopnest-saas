/**
 * Standard API response format from ShopNest backend.
 * All backend responses follow { success, message, data } shape.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  details?: any;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  details?: any;
}