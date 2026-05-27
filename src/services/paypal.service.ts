import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PaypalCreateOrderResponse {
  id: string;
  status: string;
  approveUrl: string | null;
}

export interface PaypalCaptureOrderResponse {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PaypalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/paypal`;

  createOrder(payload: { total: number; currency: string }): Observable<PaypalCreateOrderResponse> {
    return this.http.post<PaypalCreateOrderResponse>(`${this.apiUrl}/create-order`, payload);
  }

  captureOrder(orderId: string): Observable<PaypalCaptureOrderResponse> {
    return this.http.post<PaypalCaptureOrderResponse>(`${this.apiUrl}/capture-order`, { orderId });
  }
}
