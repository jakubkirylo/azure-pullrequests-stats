import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { AzureDevopsService, GitRepository } from '../azure-devops.service';
import { catchError, EMPTY, forkJoin, map, mergeMap, of } from 'rxjs';
import { NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { Color } from '@swimlane/ngx-charts';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-reviewer-stats',
  imports: [
    NgxChartsModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './reviewerStats.component.html',
  styleUrl: './reviewerStats.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewerStatsComponent implements OnInit {
  private readonly azureService = inject(AzureDevopsService);

  repos: GitRepository[] = [];
  selectedRepos: string[] = [];
  fromDate: Date | null = null;
  toDate: Date | null = null;

  stats: Record<string, number> = {};
  reviewerPRs: Record<string, import('../azure-devops.service').PullRequest[]> =
    {};
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
      console.warn('response from getRepositories', repos);
      const customOrder = [
        'ProductionCenter.WebAPI',
        'ProductionCenter.Frontend',
        'ProductionCenter.TrayApp',
        'ProductionCenter.WorkflowTests.Data',
      ];
      // Sort: customOrder first, then the rest alphabetically
      this.repos = repos.value.sort((a, b) => {
        const aIdx = customOrder.indexOf(a.name);
        const bIdx = customOrder.indexOf(b.name);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      this.selectAllRepos();
      this.loadStats();
    });
  }

  loadStats() {
    this.loading.set(true);
    const reposToQuery = this.repos.filter((r) =>
      this.selectedRepos.includes(r.id)
    );
    forkJoin(
      reposToQuery.map((repo) =>
        this.azureService
          .getCompletedPRs(
            repo.name,
            30,
            this.fromDate ? new Date(this.fromDate) : undefined,
            this.toDate ? new Date(this.toDate) : undefined
          )
          .pipe(
            map((res) => ({ repo, prs: res.value || [] })),
            catchError((err) => {
              console.warn(`Failed to get PRs for repo ${repo.name}`, err);
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
          if (!allPRs.length) {
            return of([]);
          }
          return forkJoin(
            allPRs.map(({ repo, pr }) =>
              this.azureService.getReviewers(repo.name, pr.pullRequestId).pipe(
                catchError((err) => {
                  console.warn(
                    `Failed to get reviewers for PR ${pr.pullRequestId} in ${repo.name}`,
                    err
                  );
                  return of({ value: [] });
                }),
                map((r) => ({ reviewers: r.value || [], pr, repo: repo.name }))
              )
            )
          );
        }),
        map(
          (
            allReviewers: {
              reviewers: import('../azure-devops.service').Reviewer[];
              pr: import('../azure-devops.service').PullRequest;
              repo: string;
            }[]
          ) => {
            const counts: Record<string, number> = {};
            const reviewerPRs: Record<
              string,
              import('../azure-devops.service').PullRequest[]
            > = {};
            allReviewers.forEach(({ reviewers, pr }) => {
              reviewers.forEach((reviewer) => {
                if (
                  reviewer.vote === 10 &&
                  typeof reviewer.displayName === 'string' &&
                  !reviewer.displayName.includes('\\')
                ) {
                  counts[reviewer.displayName] =
                    (counts[reviewer.displayName] || 0) + 1;
                  if (!reviewerPRs[reviewer.displayName])
                    reviewerPRs[reviewer.displayName] = [];
                  reviewerPRs[reviewer.displayName].push(pr);
                }
              });
            });
            const sorted = Object.fromEntries(
              Object.entries(counts).sort(([, a], [, b]) => b - a)
            );
            return { sorted, reviewerPRs };
          }
        ),
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

  selectAllRepos() {
    this.selectedRepos = this.repos.map((r) => r.id);
  }

  trackByRepoId(index: number, repo: GitRepository) {
    return repo.id;
  }
}
