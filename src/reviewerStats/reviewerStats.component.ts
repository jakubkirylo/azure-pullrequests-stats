import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  AzureDevopsService,
  GitRepository,
  PullRequest,
  Reviewer,
} from '../azure-devops.service';
import {
  catchError,
  EMPTY,
  forkJoin,
  map,
  mergeMap,
  Observable,
  of,
} from 'rxjs';
import { NgxChartsModule } from '@swimlane/ngx-charts';
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
import {
  colorScheme,
  sortReposCustomOrder,
  filterStatsByDevTest,
} from './reviewerStats.helper';

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
  private readonly _changeDetector = inject(ChangeDetectorRef);

  private readonly acceptedPrCode = 10; // Accepted PR vote code in Azure DevOps
  private readonly devTestPhrase = 'dev into test'; // PR name for merging dev into test

  protected repos: GitRepository[] = [];
  protected selectedRepos: string[] = [];
  protected fromDate: Date | null = null;
  protected toDate: Date | null = null;

  protected stats: Record<string, number> = {};
  protected reviewerPRs: Record<string, PullRequest[]> = {};
  protected selectedReviewer: string | null = null;
  protected loading = signal(false);
  protected colorScheme: Color = colorScheme;
  protected includeDevTest: boolean = true;

  get chartData() {
    let stats = this.stats;
    if (!this.includeDevTest) {
      stats = filterStatsByDevTest(this.reviewerPRs, this.devTestPhrase);
    }
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value,
    }));
  }

  ngOnInit(): void {
    this.azureService.getRepositories().subscribe((repos) => {
      this.repos = sortReposCustomOrder(repos.value) || [];
      this.selectAllRepos();
      this.loadStats();
    });
  }

  protected loadStats(): void {
    this.loading.set(true);
    const reposToQuery = this.repos.filter((r) =>
      this.selectedRepos.includes(r.id)
    );
    forkJoin(
      reposToQuery.map((repo) =>
        this.azureService
          .getCompletedPRs(repo.name, this.fromDate, this.toDate)
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
        mergeMap((repoResults) =>
          this.getAllPRsWithReviewers(repoResults, this.azureService)
        ),
        map((allReviewers) =>
          this.calculateAcceptedPrsPerReviewer(allReviewers)
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

  private getAllPRsWithReviewers(
    repoResults: { repo: { name: string }; prs: PullRequest[] }[],
    azureService: AzureDevopsService
  ): Observable<{ reviewers: Reviewer[]; pr: PullRequest; repo: string }[]> {
    const allPRs = repoResults.flatMap((r) =>
      r.prs.map((pr) => ({ repo: r.repo, pr }))
    );
    if (!allPRs.length) {
      return of([]);
    }
    return forkJoin(
      allPRs.map(({ repo, pr }) =>
        azureService.getReviewers(repo.name, pr.pullRequestId).pipe(
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
  }

  private calculateAcceptedPrsPerReviewer(
    prsWithReviewers: { reviewers: Reviewer[]; pr: PullRequest; repo: string }[]
  ): {
    sorted: {
      [k: string]: number;
    };
    reviewerPRs: Record<string, PullRequest[]>;
  } {
    const counts: Record<string, number> = {};
    const reviewerPRs: Record<string, PullRequest[]> = {};
    prsWithReviewers.forEach(({ reviewers, pr }) => {
      reviewers.forEach((reviewer) => {
        if (
          reviewer.vote === this.acceptedPrCode &&
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

  public onReviewerClick(reviewer: string): void {
    this.selectedReviewer = reviewer;
  }

  public clearReviewer(): void {
    this.selectedReviewer = null;
    this._changeDetector.detectChanges();
    this._changeDetector.markForCheck();
  }

  public selectAllRepos(): void {
    this.selectedRepos = this.repos.map((r) => r.id);
  }

  public getPrUrl(pr: PullRequest): string {
    const repoName = pr.repository?.name;
    return `https://dev.azure.com/troteclaser01/ProductionCenter/_git/${repoName}/pullrequest/${pr.pullRequestId}`;
  }
}
