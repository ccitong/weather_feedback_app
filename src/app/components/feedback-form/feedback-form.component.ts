import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GeocodingService, LocationData } from '../../services/geocoding.service';
import { FeedbackService, FeedbackData } from '../../services/feedback.service';
import { WeatherService, WeatherData } from '../../services/weather.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss']
})
export class FeedbackFormComponent implements OnInit {
  feedbackForm!: FormGroup;
  remainingChars: number = 7;
  currentDateTime: string;
  minDateTime: string;
  isGettingLocation: boolean = false;
  isSubmitting: boolean = false;
  submitError: string | null = null;
  submitSuccess: boolean = false;
  currentWeather: WeatherData['current'] | null = null;
  isLoadingMunicipality: boolean = false;
  selectedFeedback: 'positive' | 'negative' | null = null;

  constructor(
    private fb: FormBuilder,
    private geocodingService: GeocodingService,
    private feedbackService: FeedbackService,
    private weatherService: WeatherService
  ) {
    // Set current datetime for max value and default value in EST
    const now = new Date();
    this.currentDateTime = this.getESTDateTime(now);
    
    // Set minimum date to January 1st of current year in EST
    const estNow = new Date(this.currentDateTime);
    const minDate = new Date(estNow.getFullYear(), 0, 1);
    this.minDateTime = this.getESTDateTime(minDate);

    this.feedbackForm = this.fb.group({
      weatherFeedback: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern('^[A-Za-z][0-9][A-Za-z]\\s?[0-9][A-Za-z][0-9]$')]],
      municipality: ['', [Validators.required]],
      feedback: [''],
      dateOfInteraction: [this.currentDateTime, [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Watch postal code changes to update remaining characters
    const postalCodeControl = this.feedbackForm.get('postalCode');
    
    postalCodeControl?.valueChanges.subscribe(value => {
      this.remainingChars = 7 - (value ? value.length : 0);
    });
  }

  onPostalCodeKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const postalCode = this.feedbackForm.get('postalCode')?.value;
      if (postalCode && /^[A-Za-z][0-9][A-Za-z]\s?[0-9][A-Za-z][0-9]$/.test(postalCode)) {
        this.handlePostalCodeChange(postalCode);
      }
    }
  }

  setWeatherFeedback(feedback: 'positive' | 'negative'): void {
    this.selectedFeedback = feedback;
    this.feedbackForm.patchValue({
      weatherFeedback: feedback
    });
  }

  private handlePostalCodeChange(postalCode: string) {
    this.isLoadingMunicipality = true;
    this.currentWeather = null; // Clear previous weather data
    this.selectedFeedback = null; // Reset feedback when postal code changes
    this.feedbackForm.patchValue({ weatherFeedback: '' }); // Reset weather feedback in form
    
    // Format the postal code
    const formattedPostalCode = postalCode
      .replace(/\s+/g, '')  // Remove spaces
      .toUpperCase()
      .replace(/(\w{3})(\w{3})/, '$1 $2');  // Add space in the middle

    // Update the form with formatted postal code
    this.feedbackForm.patchValue({ postalCode: formattedPostalCode }, { emitEvent: false });

    // Get municipality and weather data
    this.geocodingService.getLocationDataFromPostalCode(formattedPostalCode).subscribe({
      next: (locationData: LocationData) => {
        if (locationData.municipality) {
          this.feedbackForm.patchValue({ municipality: locationData.municipality });
          this.getWeatherData(formattedPostalCode);
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error getting municipality:', error.message);
        this.isLoadingMunicipality = false;
      },
      complete: () => {
        this.isLoadingMunicipality = false;
      }
    });
  }

  async getLocationPostalCode() {
    try {
      this.isGettingLocation = true;
      this.isLoadingMunicipality = true;
      this.currentWeather = null; // Clear previous weather data
      this.selectedFeedback = null; // Reset feedback when getting new location
      this.feedbackForm.patchValue({ weatherFeedback: '' }); // Reset weather feedback in form
      
      console.log('Getting current position...');
      const position = await this.geocodingService.getCurrentPosition();
      console.log('Position received:', position.coords.latitude, position.coords.longitude);
      
      this.geocodingService
        .getLocationData(
          position.coords.latitude,
          position.coords.longitude
        )
        .subscribe({
          next: (locationData: LocationData) => {
            console.log('Received location data:', locationData);
            if (locationData.postalCode) {
              // Clean up the postal code and ensure it's in the correct format
              let formattedPostalCode = locationData.postalCode
                .replace(/[^A-Za-z0-9]/g, '') // Remove any non-alphanumeric characters
                .toUpperCase();
              
              // Format as A1A 1A1
              formattedPostalCode = formattedPostalCode.replace(/(\w{3})(\w{3})/, '$1 $2');
              console.log('Formatted postal code:', formattedPostalCode);
              
              this.feedbackForm.patchValue({
                postalCode: formattedPostalCode,
                municipality: locationData.municipality
              });

              // Fetch weather data
              this.getWeatherData(formattedPostalCode);
            }
          },
          error: (error: HttpErrorResponse) => {
            console.error('Error getting location data:', error.message);
            this.isGettingLocation = false;
            this.isLoadingMunicipality = false;
          },
          complete: () => {
            console.log('Geocoding request completed');
            this.isGettingLocation = false;
            this.isLoadingMunicipality = false;
          }
        });
    } catch (error) {
      console.error('Error getting location:', error instanceof Error ? error.message : 'Unknown error');
      this.isGettingLocation = false;
      this.isLoadingMunicipality = false;
    }
  }

  private getESTDateTime(date: Date): string {
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+)/, '$3-$1-$2T$4:$5');
  }

  getWeatherData(postalCode: string) {
    this.weatherService.getWeatherByPostalCode(postalCode)
      .subscribe({
        next: (data: WeatherData) => {
          console.log('Weather data received:', data);
          this.currentWeather = data.current;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error fetching weather data:', error.message);
        }
      });
  }

  onSubmit() {
    if (this.feedbackForm.valid) {
      this.isSubmitting = true;
      this.submitError = null;
      this.submitSuccess = false;

      const formData = this.feedbackForm.value;
      
      // Convert datetime-local to SQL Server compatible format in EST
      if (formData.dateOfInteraction) {
        const date = new Date(formData.dateOfInteraction);
        formData.dateOfInteraction = new Date(this.getESTDateTime(date)).toISOString();
      }

      const feedbackData: FeedbackData = {
        actionRequired: formData.weatherFeedback === 'negative',
        postalCode: formData.postalCode.toUpperCase(),
        municipality: formData.municipality,
        feedback: formData.feedback || undefined,
        dateOfInteraction: formData.dateOfInteraction
      };

      this.feedbackService.submitFeedback(feedbackData).subscribe({
        next: (response: any) => {
          console.log('Feedback submitted successfully:', response);
          this.isSubmitting = false;
          this.submitSuccess = true;
          this.feedbackForm.reset();
          this.selectedFeedback = null;
          // Pre-fill the date again after reset
          this.feedbackForm.patchValue({
            dateOfInteraction: this.currentDateTime
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error submitting feedback:', error.message);
          this.isSubmitting = false;
          this.submitError = 'An error occurred while submitting your feedback. Please try again.';
        }
      });
    }
  }
}
