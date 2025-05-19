import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ReviewerStatsComponent } from '../reviewerStats/reviewerStats.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ReviewerStatsComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'azure-pr-reviewer-stats';
}
