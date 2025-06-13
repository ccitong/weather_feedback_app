import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FeedbackData {
  actionRequired: boolean;
  postalCode: string;
  municipality: string;
  feedback?: string;
  dateOfInteraction: string;
  weather: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly API_URL = 'http://localhost:3000/feedback';

  constructor(private http: HttpClient) {}

  submitFeedback(feedback: FeedbackData): Observable<any> {
    return this.http.post(this.API_URL, feedback);
  }
} 