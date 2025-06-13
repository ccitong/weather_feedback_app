import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { GeocodingService, LocationData } from '../../services/geocoding.service';
import { FeedbackService, FeedbackData } from '../../services/feedback.service';
import { WeatherService, WeatherData, WeatherDataWithPostalCode } from '../../services/weather.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feedback-form',
  templateUrl: './feedback-form.component.html',
  styleUrls: ['./feedback-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatExpansionModule
  ]
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
  multipleWeatherData: WeatherDataWithPostalCode[] = [];
  isLoadingWeather: boolean = false;
  selectedCard: WeatherDataWithPostalCode | null = null;

  // Define the postal codes and their areas with complete postal codes
  postalCodeAreas = [
    { fsa: 'L0G', area: 'East Gwillimbury / Georgina / Whitchurch–Stouffville', completePostalCode: 'L0G 1A0' },
    { fsa: 'L0E', area: 'Georgina (includes Pefferlaw, Sutton)', completePostalCode: 'L0E 1A0' },
    { fsa: 'L0J', area: 'Kleinburg (Vaughan area)', completePostalCode: 'L0J 1A0' },
    { fsa: 'L3P', area: 'Markham (central)', completePostalCode: 'L3P 1A0' },
    { fsa: 'L3R', area: 'Markham (east)', completePostalCode: 'L3R 1A0' },
    { fsa: 'L3S', area: 'Markham (southeast)', completePostalCode: 'L3S 1A0' },
    { fsa: 'L3T', area: 'Thornhill (Markham/Vaughan border)', completePostalCode: 'L3T 1A0' },
    { fsa: 'L3X', area: 'Newmarket (northwest)', completePostalCode: 'L3X 1A0' },
    { fsa: 'L3Y', area: 'Newmarket (central)', completePostalCode: 'L3Y 1A0' },
    { fsa: 'L3Z', area: 'Bradford West Gwillimbury (partially York)', completePostalCode: 'L3Z 1A0' },
    { fsa: 'L4A', area: 'Whitchurch–Stouffville', completePostalCode: 'L4A 1A0' },
    { fsa: 'L4B', area: 'Richmond Hill (southwest business area)', completePostalCode: 'L4B 1A0' },
    { fsa: 'L4C', area: 'Richmond Hill (central)', completePostalCode: 'L4C 1A0' },
    { fsa: 'L4E', area: 'Richmond Hill (Oak Ridges)', completePostalCode: 'L4E 1A0' },
    { fsa: 'L4G', area: 'Aurora', completePostalCode: 'L4G 1A0' },
    { fsa: 'L4H', area: 'Vaughan (Woodbridge)', completePostalCode: 'L4H 1A0' },
    { fsa: 'L4J', area: 'Thornhill (Vaughan/Markham)', completePostalCode: 'L4J 1A0' },
    { fsa: 'L4K', area: 'Vaughan (Concord, business area)', completePostalCode: 'L4K 1A0' },
    { fsa: 'L4L', area: 'Vaughan (West Woodbridge)', completePostalCode: 'L4L 1A0' },
    { fsa: 'L6A', area: 'Vaughan (Maple)', completePostalCode: 'L6A 1A0' },
    { fsa: 'L6B', area: 'Markham (Cornell / Box Grove)', completePostalCode: 'L6B 1A0' },
    { fsa: 'L6C', area: 'Markham (Cathedraltown / Cachet)', completePostalCode: 'L6C 1A0' },
    { fsa: 'L6E', area: 'Markham (Greensborough / Wismer)', completePostalCode: 'L6E 1A0' }
  ];

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

    // Load weather data for all postal codes
    this.loadAllWeatherData();
  }

  loadAllWeatherData(): void {
    this.isLoadingWeather = true;
    const postalCodes = this.postalCodeAreas.map(area => area.completePostalCode);
    
    this.weatherService.getWeatherForMultiplePostalCodes(postalCodes)
      .subscribe({
        next: (data) => {
          this.multipleWeatherData = data;
          this.isLoadingWeather = false;
        },
        error: (error) => {
          console.error('Error loading weather data:', error);
          this.isLoadingWeather = false;
        }
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

  onEnterIconClick(): void {
    const postalCode = this.feedbackForm.get('postalCode')?.value;
    if (postalCode && /^[A-Za-z][0-9][A-Za-z]\s?[0-9][A-Za-z][0-9]$/.test(postalCode)) {
      this.handlePostalCodeChange(postalCode);
    }
  }

  selectWeatherCard(weather: WeatherDataWithPostalCode): void {
    this.selectedCard = weather;
    this.selectedFeedback = null;
    const areaInfo = this.postalCodeAreas.find(area => area.completePostalCode === weather.postalCode);
    
    if (areaInfo) {
      this.feedbackForm.patchValue({
        postalCode: areaInfo.completePostalCode,
        municipality: areaInfo.area,
        weatherFeedback: ''
      });
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
      this.selectedCard = null; // Clear selected card
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
            this.isGettingLocation = false;
            this.isLoadingMunicipality = false;
          }
        });
    } catch (error) {
      console.error('Error getting location:', error);
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
    if (this.feedbackForm.valid && (this.selectedCard || this.currentWeather)) {
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
        postalCode: formData.postalCode,
        municipality: formData.municipality,
        feedback: formData.feedback || undefined,
        dateOfInteraction: formData.dateOfInteraction
      };

      console.log('Submitting feedback data:', feedbackData);

      this.feedbackService.submitFeedback(feedbackData).subscribe({
        next: (response: any) => {
          console.log('Feedback submitted successfully:', response);
          this.isSubmitting = false;
          this.submitSuccess = true;
          this.feedbackForm.reset();
          this.selectedFeedback = null;
          this.selectedCard = null;
          this.currentWeather = null;
          // Pre-fill the date again after reset
          this.feedbackForm.patchValue({
            dateOfInteraction: this.currentDateTime
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error submitting feedback:', error);
          this.isSubmitting = false;
          this.submitError = error.error?.detail || 'An error occurred while submitting your feedback. Please try again.';
        }
      });
    }
  }

  getAreaForPostalCode(postalCode: string): string {
    const area = this.postalCodeAreas.find(area => area.completePostalCode === postalCode);
    return area ? area.area : 'Unknown Area';
  }

  isCardSelected(weather: WeatherDataWithPostalCode): boolean {
    return this.selectedCard?.postalCode === weather.postalCode;
  }
}
