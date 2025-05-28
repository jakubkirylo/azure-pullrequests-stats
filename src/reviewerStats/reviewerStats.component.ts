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
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reviewer-stats',
  imports: [NgxChartsModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './reviewerStats.component.html',
  styleUrl: './reviewerStats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewerStatsComponent implements OnInit {
  private readonly azureService = inject(AzureDevopsService);

  repos: string[] = [];
  selectedRepos: string[] = [];
  fromDate: Date | null = null;
  toDate: Date | null = null;

  stats: Record<string, number> = {};
  reviewerPRs: Record<string, import('../azure-devops.service').PullRequest[]> = {};
  selectedReviewer: string | null = null;
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

  ngOnInit(): void {
    this.azureService.getRepositories().subscribe((repos) => {
      this.repos = repos;
      this.selectedRepos = [...repos];
      this.loadStats();
    });
  }

  loadStats() {
    this.loading.set(true);
    const reposToQuery = this.selectedRepos.length ? this.selectedRepos : this.repos;
    forkJoin(
      reposToQuery.map((repo) =>
        this.azureService.getCompletedPRs(
          repo,
          30,
          this.fromDate ? new Date(this.fromDate) : undefined,
          this.toDate ? new Date(this.toDate) : undefined
        ).pipe(
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
            r.prs.map((pr) => ({ repo: r.repo, pr }))
          );
          if (!allPRs.length) return of([]);
          return forkJoin(
            allPRs.map(({ repo, pr }) =>
              this.azureService.getReviewers(repo, pr.pullRequestId).pipe(
                catchError((err) => {
                  console.warn(
                    `Failed to get reviewers for PR ${pr.pullRequestId} in ${repo}`,
                    err
                  );
                  return of({ value: [] });
                }),
                map((r) => ({ reviewers: r.value || [], pr, repo }))
              )
            )
          );
        }),
        map((allReviewers: { reviewers: import('../azure-devops.service').Reviewer[]; pr: import('../azure-devops.service').PullRequest; repo: string }[]) => {
          const counts: Record<string, number> = {};
          const reviewerPRs: Record<string, import('../azure-devops.service').PullRequest[]> = {};
          allReviewers.forEach(({ reviewers, pr }) => {
            reviewers.forEach((reviewer) => {
              if (
                reviewer.vote === 10 &&
                typeof reviewer.displayName === 'string' &&
                !reviewer.displayName.includes('\\')
              ) {
                counts[reviewer.displayName] = (counts[reviewer.displayName] || 0) + 1;
                if (!reviewerPRs[reviewer.displayName]) reviewerPRs[reviewer.displayName] = [];
                reviewerPRs[reviewer.displayName].push(pr);
              }
            });
          });
          const sorted = Object.fromEntries(
            Object.entries(counts).sort(([, a], [, b]) => b - a)
          );
          return { sorted, reviewerPRs };
        }),
        catchError((err) => {
          console.warn('Failed to load reviewer stats', err);
          this.loading.set(false);
          return EMPTY;
        })
      )
      .subscribe((result) => {
        this.stats = result.sorted;
        this.reviewerPRs = result.reviewerPRs;
        this.loading.set(false);
      });
  }

  onReviewerClick(reviewer: string) {
    this.selectedReviewer = reviewer;
  }

  clearReviewer() {
    this.selectedReviewer = null;
  }
}
