import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface LocationData {
  postalCode: string;
  municipality: string;
  latitude?: number;
  longitude?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly GEOCODING_API_URL = 'https://api.opencagedata.com/geocode/v1/json';
  private readonly API_KEY = 'be0db86d3703498e946b036ed3f09be6'; // You'll need to get an API key from OpenCage

  constructor(private http: HttpClient) {}

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser');
      } else {
        const options = {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Browser geolocation success:', position);
            resolve(position);
          },
          (error) => {
            console.error('Browser geolocation error:', error);
            reject(error);
          },
          options
        );
      }
    });
  }

  private completePartialPostalCode(partialCode: string): string {
    // Ensure the partial code is in the correct format (first 3 characters)
    const cleanPartial = partialCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (cleanPartial.length < 3) {
      throw new Error('Invalid partial postal code');
    }

    // Take the first 3 characters and add placeholder values for the rest
    const firstPart = cleanPartial.slice(0, 3);
    return `${firstPart} 1A1`; // Using placeholder values for the second part
  }

  private formatPostalCode(postalCode: string): string {
    // Remove any non-alphanumeric characters and convert to uppercase
    const cleaned = postalCode.replace(/[^A-Z0-9]/g, '').toUpperCase();
    
    // If it's a complete postal code (6 characters)
    if (cleaned.length === 6) {
      // Format as A1A 1A1
      return cleaned.replace(/(\w{3})(\w{3})/, '$1 $2');
    }
    
    // If it's a partial postal code (3 characters)
    if (cleaned.length === 3) {
      return this.completePartialPostalCode(cleaned);
    }

    throw new Error('Invalid postal code format');
  }

  getLocationData(latitude: number, longitude: number): Observable<LocationData> {
    console.log('Requesting location data for coordinates:', latitude, longitude);
    
    const params = {
      q: `${latitude}+${longitude}`,
      key: this.API_KEY,
      language: 'en',
      countrycode: 'ca'
    };

    return this.http.get(this.GEOCODING_API_URL, { params }).pipe(
      map((response: any) => {
        console.log('OpenCage API response:', response);
        if (response.results && response.results.length > 0) {
          const components = response.results[0].components;
          console.log('Location components:', components);
          
          // Get postal code (full or partial)
          let postalCode = components.postcode || components.partial_postcode || '';
          
          // Get municipality
          const municipality = components.municipality || components.city || components.town || 
                             components.suburb || components.neighbourhood || '';
          
          if (!postalCode) {
            console.warn('No postcode or partial_postcode found in response components');
            throw new Error('No postal code found in response');
          }
          if (!municipality) {
            console.warn('No municipality found in response components');
            throw new Error('No municipality found in response');
          }

          try {
            // Format and complete the postal code if necessary
            postalCode = this.formatPostalCode(postalCode);
            
            return {
              postalCode,
              municipality,
              latitude,
              longitude
            };
          } catch (error) {
            console.error('Error formatting postal code:', error);
            throw new Error('Invalid postal code format received from API');
          }
        }
        console.warn('No results found in API response');
        throw new Error('No results found');
      }),
      catchError((error: HttpErrorResponse | Error) => {
        console.error('OpenCage API error:', error);
        return throwError(() => error);
      })
    );
  }

  getLocationDataFromPostalCode(postalCode: string): Observable<LocationData> {
    try {
      const formattedPostalCode = this.formatPostalCode(postalCode);
      
      const params = {
        q: formattedPostalCode,
        key: this.API_KEY,
        language: 'en',
        countrycode: 'ca'
      };

      return this.http.get(this.GEOCODING_API_URL, { params }).pipe(
        map((response: any) => {
          console.log('OpenCage API response for postal code:', response);
          if (response.results && response.results.length > 0) {
            const components = response.results[0].components;
            console.log('Location components:', components);
            
            // Get municipality with fallbacks
            const municipality = components.municipality || components.city || components.town || 
                               components.suburb || components.neighbourhood || components.state_district || '';
            
            if (!municipality) {
              console.warn('No municipality found in response components');
              throw new Error('No municipality found in response');
            }

            const geometry = response.results[0].geometry;
            
            return {
              postalCode: formattedPostalCode,
              municipality,
              latitude: geometry.lat,
              longitude: geometry.lng
            };
          }
          console.warn('No results found in API response');
          throw new Error('No results found');
        }),
        catchError((error: HttpErrorResponse | Error) => {
          console.error('OpenCage API error:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => new Error('Invalid postal code format'));
    }
  }
} 