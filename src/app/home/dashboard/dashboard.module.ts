import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OrganizationService } from '../../organization/organization.service';
import { ClientsService } from '../../clients/clients.service';

@NgModule({
  // ...
  imports: [
    // ... other imports
    CommonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    HttpClientModule,
    MatProgressSpinnerModule
  ],
  providers: [
    OrganizationService,
    ClientsService
  ],
  // ...
})
export class DashboardModule { } 