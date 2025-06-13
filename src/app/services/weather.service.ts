import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';

export interface WeatherData {
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    uv: number;
  };
  location?: {
    name: string;
    region: string;
  };
}

export interface WeatherDataWithPostalCode extends WeatherData {
  postalCode: string;
  completePostalCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private readonly API_KEY = '044b180d854b4ff2a80155632251206';
  private readonly API_URL = 'https://api.weatherapi.com/v1/current.json';

  constructor(private http: HttpClient) {}

  getWeatherByPostalCode(postalCode: string): Observable<WeatherData> {
    return this.http.get<WeatherData>(`${this.API_URL}?key=${this.API_KEY}&q=${postalCode}`);
  }

  getWeatherForMultiplePostalCodes(postalCodes: string[]): Observable<WeatherDataWithPostalCode[]> {
    const requests = postalCodes.map(postalCode => 
      this.getWeatherByPostalCode(postalCode).pipe(
        map(data => ({
          ...data,
          postalCode,
          completePostalCode: postalCode
        }))
      )
    );
    return forkJoin(requests);
  }
} 