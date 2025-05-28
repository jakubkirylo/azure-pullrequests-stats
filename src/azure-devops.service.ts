import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './app/environment';

@Injectable({ providedIn: 'root' })
export class AzureDevopsService {
  private readonly http = inject(HttpClient);

  private readonly daysBack = 30; // Default number of days to look back for completed PRs. Should be configurable.

  private baseUrl = environment.azureDevOps.baseUrl;
  private pat = environment.azureDevOps.pat;
  private project = environment.azureDevOps.project;

  private getHeaders(): HttpHeaders {
    const token = btoa(`:${this.pat}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
    });
  }

  public getCompletedPRs(
    repo: string,
    fromDate?: Date | null,
    toDate?: Date | null
  ): Observable<PullRequestsResponse> {
    const url = this.prepareUrlForGettingCompletedPRs(repo, fromDate, toDate);
    return this.http.get<PullRequestsResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  private prepareUrlForGettingCompletedPRs(
    repo: string,
    fromDate?: Date | null,
    toDate?: Date | null
  ) {
    const now = toDate || new Date();
    const minTime = fromDate || new Date(now);
    const maxTime = toDate || new Date(now);

    if (fromDate === null) {
      minTime.setDate(now.getDate() - this.daysBack);
    }
    const minTimeIso = minTime.toISOString();
    const maxTimeIso = maxTime.toISOString();
    const url =
      `${this.baseUrl}/${this.project}/_apis/git/repositories/${repo}/pullrequests` +
      `?searchCriteria.status=completed` +
      `&searchCriteria.queryTimeRangeType=closed` +
      `&searchCriteria.minTime=${encodeURIComponent(minTimeIso)}` +
      `&searchCriteria.maxTime=${encodeURIComponent(maxTimeIso)}` +
      `&api-version=7.1-preview.1`;
    return url;
  }

  public getReviewers(
    repo: string,
    prId: number
  ): Observable<ReviewersResponse> {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${repo}/pullRequests/${prId}/reviewers?api-version=7.1-preview.1`;
    return this.http.get<ReviewersResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  public getRepositories(): Observable<GitRepositoryResponse> {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories?api-version=7.1`;
    return this.http.get<GitRepositoryResponse>(url, {
      headers: this.getHeaders(),
    });
  }
}

export interface PullRequest {
  pullRequestId: number;
  title: string;
  createdBy: { displayName: string };
  closedDate: string;
  repository: GitRepository;
}
export interface PullRequestsResponse {
  value: PullRequest[];
  count: number;
}

export interface Reviewer {
  displayName: string;
  vote: number;
}
export interface ReviewersResponse {
  value: Reviewer[];
  count: number;
}

export interface GitRepositoryResponse {
  count: number;
  value: GitRepository[];
}

export interface GitRepository {
  id: string;
  defaultBranch?: string;
  name: string;
  isDisabled?: boolean;
  isFork?: boolean;
  isInMaintenance?: boolean;
  remoteUrl?: string;
  sshUrl?: string;
  webUrl?: string;
  project: {
    id: string;
    name: string;
    url: string;
    state: string;
    visibility: string;
  };
}
