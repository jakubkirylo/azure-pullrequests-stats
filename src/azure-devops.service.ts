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
    return this.http.get<PullRequestsResponse>(url, { headers: this.getHeaders() });
  }

  getReviewers(
    repo: string,
    prId: number
  ): Observable<ReviewersResponse> {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories/${repo}/pullRequests/${prId}/reviewers?api-version=7.1-preview.1`;
    return this.http.get<ReviewersResponse>(url, { headers: this.getHeaders() });
  }

  getRepositories(): Observable<string[]> {
    const url = `${this.baseUrl}/${this.project}/_apis/git/repositories?api-version=7.1`;
    return this.http.get<{ value: { name: string }[] }>(url, { headers: this.getHeaders() })
      .pipe(map(res => res.value.map(r => r.name)));
  }
}

// Strongly typed response for pull requests
export interface PullRequest {
  pullRequestId: number;
  title: string;
  createdBy: { displayName: string };
  closedDate: string;
  // Add more fields as needed
}
export interface PullRequestsResponse {
  value: PullRequest[];
  count: number;
}

// Strongly typed response for reviewers
export interface Reviewer {
  displayName: string;
  vote: number;
  // Add more fields as needed
}
export interface ReviewersResponse {
  value: Reviewer[];
  count: number;
}
