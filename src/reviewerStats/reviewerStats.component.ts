import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AzureDevopsService } from '../azure-devops.service';
import { catchError, EMPTY, forkJoin, map, mergeMap, of } from 'rxjs';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { Color } from '@swimlane/ngx-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reviewer-stats',
  imports: [NgxChartsModule, MatProgressSpinnerModule],
  templateUrl: './reviewerStats.component.html',
  styleUrl: './reviewerStats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewerStatsComponent implements OnInit {
  private readonly azureService = inject(AzureDevopsService);

  // TODO: this should be multiple-select filtering field + include ALL
  repos = [
    'ProductionCenter.Frontend',
    'ProductionCenter.WebAPI',
    'ProductionCenter.TrayApp',
  ];
  stats: Record<string, number> = {};
  loading = signal(false);

  get chartData() {
    return Object.entries(this.stats).map(([name, value]) => ({
      name,
      value,
    }));
  }

  colorScheme: Color = {
    name: 'customScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA'],
  };

  // TODO: refactor, strong typing
  ngOnInit(): void {
    this.loading.set(true);

    forkJoin(
      this.repos.map((repo) =>
        this.azureService.getCompletedPRs(repo).pipe(
          map((res) => ({ repo, prs: res.value || [] })),
          catchError((err) => {
            console.warn(`Failed to get PRs for repo ${repo}`, err);
            return of({ repo, prs: [] });
          })
        )
      )
    )
      .pipe(
        mergeMap((repoResults) => {
          const allPRs = repoResults.flatMap((r) =>
            r.prs.map((pr) => ({ repo: r.repo, prId: pr.pullRequestId }))
          );

          if (!allPRs.length) return of([]);

          return forkJoin(
            allPRs.map(({ repo, prId }) =>
              this.azureService.getReviewers(repo, prId).pipe(
                catchError((err) => {
                  console.warn(
                    `Failed to get reviewers for PR ${prId} in ${repo}`,
                    err
                  );
                  return of({ value: [] });
                }),
                map((r) => r.value || [])
              )
            )
          );
        }),
        map((allReviewers: any[][]) => {
          const counts: Record<string, number> = {};

          allReviewers.flat().forEach((reviewer) => {
            if (
              reviewer.vote === 10 &&
              typeof reviewer.displayName === 'string' &&
              !reviewer.displayName.includes('\\')
            ) {
              counts[reviewer.displayName] =
                (counts[reviewer.displayName] || 0) + 1;
            }
          });

          const sorted = Object.fromEntries(
            Object.entries(counts).sort(([, a], [, b]) => b - a)
          );

          return sorted;
        }),
        catchError((err) => {
          console.warn('Failed to load reviewer stats', err);
          this.loading.set(false);
          return EMPTY;
        })
      )
      .subscribe((result) => {
        this.stats = result;
        this.loading.set(false);
        console.warn('results:', this.stats);
      });
  }
}
