import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-indicator.component.html',
  styleUrls: ['./step-indicator.component.scss']
})
export class StepIndicatorComponent implements OnInit {
  @Input() currentStep: number = 1;
  @Input() totalSteps: number = 3;
  @Input() donationColor: string = '#d7192d';

  steps = [
    { number: 1, label: 'Votre don' },
    { number: 2, label: 'Infos' },
    { number: 3, label: 'Paiement' }
  ];

  ngOnInit() {
    this.updateColors();
  }

  private updateColors() {
    document.documentElement.style.setProperty('--donation-color', this.donationColor);
    // Calculate lighter version (20% opacity of the donation color)
    document.documentElement.style.setProperty('--donation-color-light', `${this.donationColor}33`);
  }

  getStepNumberClass(stepNumber: number): string {
    if (stepNumber < this.currentStep) {
      return 'bg-donation text-white';
    } else if (stepNumber === this.currentStep) {
      return 'bg-donation-light border-2 border-donation text-donation';
    }
    return 'bg-white border-2 border-gray-300 text-gray-500';
  }

  getStepLineClass(stepNumber: number): string {
    return stepNumber < this.currentStep ? 'bg-donation' : 'bg-gray-300';
  }

  getStepLabelClass(stepNumber: number): string {
    if (stepNumber <= this.currentStep) {
      return 'text-donation font-medium';
    }
    return 'text-gray-500';
  }
}