import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AzureDevopsService {
  private readonly http = inject(HttpClient);

  private baseUrl = 'https://troteclaser01.visualstudio.com';
  //   TODO: delete this PAT and move to configuration
  private pat =
    '70jPQWA9C86jzBbEdg28131l2HHZXRgWs7RlCFLoCCK8wD55YkLMJQQJ99BEACAAAAAiNd8qAAASAZDO4DCv';

  private getHeaders(): HttpHeaders {
    const token = btoa(`:${this.pat}`);
    return new HttpHeaders({
      Authorization: `Basic ${token}`,
    });
  }

  // TODO: apply filtering by date range and repo
  // TODO: strong property typing
  // https://learn.microsoft.com/pl-pl/rest/api/azure/devops/git/pull-requests/get-pull-requests?view=azure-devops-rest-7.1&tabs=HTTP
  // https://learn.microsoft.com/pl-pl/rest/api/azure/devops/git/pull-requests?view=azure-devops-rest-7.1
  getCompletedPRs(
    repo: string,
    daysBack = 30
  ): Observable<{ value: { pullRequestId: number }[] }> {
    const now = new Date();
    const minTime = new Date(now);
    minTime.setDate(now.getDate() - daysBack);

    const minTimeIso = minTime.toISOString();
    const url =
      `${this.baseUrl}/ProductionCenter/_apis/git/repositories/${repo}/pullrequests` +
      `?searchCriteria.status=completed` +
      `&searchCriteria.queryTimeRangeType=closed` +
      `&searchCriteria.minTime=${encodeURIComponent(minTimeIso)}` +
      `&api-version=7.1-preview.1`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }

  // TODO: strong property typing
  getReviewers(
    repo: string,
    prId: number
  ): Observable<{ value: { displayName: string; vote: number }[] }> {
    const url = `${this.baseUrl}/ProductionCenter/_apis/git/repositories/${repo}/pullRequests/${prId}/reviewers?api-version=7.1-preview.1`;
    return this.http.get<any>(url, { headers: this.getHeaders() });
  }
}
