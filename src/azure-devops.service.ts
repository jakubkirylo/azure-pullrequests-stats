import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AzureDevopsService {
  private readonly http = inject(HttpClient);

  public getCompletedPRs(
    repo: string,
    fromDate?: Date | null,
    toDate?: Date | null
  ): Observable<PullRequestsResponse> {
    let url = `/api/GetCompletedPRs?repo=${encodeURIComponent(repo)}`;
    if (fromDate) url += `&fromDate=${encodeURIComponent(fromDate.toISOString())}`;
    if (toDate) url += `&toDate=${encodeURIComponent(toDate.toISOString())}`;
    return this.http.get<PullRequestsResponse>(url);
  }

  public getReviewers(
    repo: string,
    prId: number
  ): Observable<ReviewersResponse> {
    const url = `/api/GetReviewers?repo=${encodeURIComponent(repo)}&prId=${prId}`;
    return this.http.get<ReviewersResponse>(url);
  }

  public getRepositories(): Observable<GitRepositoryResponse> {
    const url = `/api/GetRepositories`;
    return this.http.get<GitRepositoryResponse>(url);
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
