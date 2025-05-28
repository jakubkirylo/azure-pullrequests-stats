import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from './app/environment';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AzureDevopsService {
  private readonly http = inject(HttpClient);

  private baseUrl = environment.azureDevOps.baseUrl;
  private pat = environment.azureDevOps.pat;
  private project = environment.azureDevOps.project;

  private getHeaders(): HttpHeaders {
    const token = btoa(`:${this.pat}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
    });
  }

  getCompletedPRs(
    repo: string,
    daysBack = 30,
    fromDate?: Date,
    toDate?: Date
  ): Observable<PullRequestsResponse> {
    const now = toDate || new Date();
    const minTime = fromDate || new Date(now);
    minTime.setDate(now.getDate() - daysBack);
    const minTimeIso = minTime.toISOString();
    const url =
      `${this.baseUrl}/${this.project}/_apis/git/repositories/${repo}/pullrequests` +
      `?searchCriteria.status=completed` +
      `&searchCriteria.queryTimeRangeType=closed` +
      `&searchCriteria.minTime=${encodeURIComponent(minTimeIso)}` +
      `&api-version=7.1-preview.1`;
    return this.http.get<PullRequestsResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  getReviewers(repo: string, prId: number): Observable<ReviewersResponse> {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${repo}/pullRequests/${prId}/reviewers?api-version=7.1-preview.1`;
    return this.http.get<ReviewersResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  getRepositories(): Observable<GitRepositoryResponse> {
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
