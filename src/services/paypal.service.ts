import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Respuesta esperada cuando el backend crea una orden en PayPal.
export interface PaypalCreateOrderResponse {
  id: string;
  status: string;
  approveUrl: string | null;
}

// Respuesta simplificada cuando el backend captura una orden ya aprobada.
export interface PaypalCaptureOrderResponse {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PaypalService {
  // HttpClient permite llamar al backend Express desde Angular.
  private readonly http = inject(HttpClient);
  // Base URL construida desde environment para no repetir strings en cada metodo.
  private readonly apiUrl = `${environment.apiUrl}/paypal`;

  // Pide al backend crear una orden.
  // El backend habla con PayPal porque ahi vive el Client Secret.
  createOrder(payload: { total: number; currency: string }): Observable<PaypalCreateOrderResponse> {
    return this.http.post<PaypalCreateOrderResponse>(`${this.apiUrl}/create-order`, payload);
  }

  // Pide al backend capturar/cobrar una orden ya aprobada por el usuario.
  captureOrder(orderId: string): Observable<PaypalCaptureOrderResponse> {
    return this.http.post<PaypalCaptureOrderResponse>(`${this.apiUrl}/capture-order`, { orderId });
  }
}
