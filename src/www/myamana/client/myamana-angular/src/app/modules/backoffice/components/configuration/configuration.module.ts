import { NgModule } from '@angular/core';
import { ConfigurationComponent } from './configuration.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [],
  imports: [CommonModule, FormsModule, ConfigurationComponent],
  exports: [ConfigurationComponent]
})
export class ConfigurationModule {}
