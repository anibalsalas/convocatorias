import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@shared/models/api-response.model';
import { Page, PageRequest } from '@shared/models/pagination.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, string | number>): Observable<ApiResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== null && v !== undefined) httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<ApiResponse<T>>(`${this.base}${path}`, { params: httpParams });
  }

  getPage<T>(path: string, pageReq: PageRequest, extraParams?: Record<string, string>): Observable<ApiResponse<Page<T>>> {
    let params = new HttpParams()
      .set('page', String(pageReq.page))
      .set('size', String(pageReq.size));
    if (pageReq.sort) {
      const sorts = Array.isArray(pageReq.sort) ? pageReq.sort : [pageReq.sort];
      sorts.forEach(s => params = params.append('sort', s));
    }
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params = params.set(k, v);
      });
    }
    return this.http.get<ApiResponse<Page<T>>>(`${this.base}${path}`, { params });
  }

  post<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(`${this.base}${path}`, body);
  }

  patch<T>(path: string, body?: unknown): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(`${this.base}${path}`);
  }

  getBlob(path: string): Observable<Blob> {
    return this.http.get(`${this.base}${path}`, { responseType: 'blob' });
  }

  postBlob(path: string, body: unknown): Observable<Blob> {
    return this.http.post(`${this.base}${path}`, body, { responseType: 'blob' });
  }

  postFormData<T>(path: string, formData: FormData): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(`${this.base}${path}`, formData);
  }
}
